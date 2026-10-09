-- ===========================================================================
-- SunuPermis — schéma initial
-- ---------------------------------------------------------------------------
-- Logiciel de gestion pour auto-écoles : élèves, planning des leçons,
-- forfaits payés en plusieurs fois, examens.
--
-- Multi-écoles : chaque ligne porte `school_id`, et la sécurité au niveau des
-- lignes (RLS) ne laisse un utilisateur connecté voir que les écoles dont il
-- est membre. Le navigateur parle directement à la base avec la clé publique :
-- c'est donc RLS, et lui seul, qui protège les données. Aucune table n'est
-- laissée sans politique.
-- ===========================================================================

-- Dans le schéma `extensions`, comme le recommande Supabase.
create extension if not exists btree_gist with schema extensions;

-- ---------------------------------------------------------------------------
-- Écoles et membres
-- ---------------------------------------------------------------------------

create table public.schools (
  id           uuid primary key default gen_random_uuid(),
  name         text not null check (length(trim(name)) between 2 and 120),
  city         text,
  phone        text,
  address      text,
  plan         text not null default 'essentiel' check (plan in ('essentiel', 'pro', 'multi')),
  trial_ends_at timestamptz not null default (now() + interval '30 days'),
  created_at   timestamptz not null default now()
);

create table public.instructors (
  id          uuid primary key default gen_random_uuid(),
  school_id   uuid not null references public.schools(id) on delete cascade,
  full_name   text not null,
  phone       text,
  active      boolean not null default true,
  created_at  timestamptz not null default now()
);
create index on public.instructors (school_id);

-- Un utilisateur (auth.users) appartient à une école avec un rôle.
-- Un moniteur peut être relié à sa fiche `instructors` pour voir son planning.
create table public.memberships (
  user_id       uuid not null references auth.users(id) on delete cascade,
  school_id     uuid not null references public.schools(id) on delete cascade,
  role          text not null check (role in ('owner', 'secretary', 'instructor')),
  instructor_id uuid references public.instructors(id) on delete set null,
  created_at    timestamptz not null default now(),
  primary key (user_id, school_id)
);
create index on public.memberships (school_id);

create table public.vehicles (
  id          uuid primary key default gen_random_uuid(),
  school_id   uuid not null references public.schools(id) on delete cascade,
  label       text not null,
  plate       text,
  category    text not null default 'B' check (category in ('A', 'B', 'C', 'D', 'E')),
  active      boolean not null default true,
  created_at  timestamptz not null default now()
);
create index on public.vehicles (school_id);

-- ---------------------------------------------------------------------------
-- Élèves, échéances, paiements
-- ---------------------------------------------------------------------------

create table public.students (
  id            uuid primary key default gen_random_uuid(),
  school_id     uuid not null references public.schools(id) on delete cascade,
  full_name     text not null check (length(trim(full_name)) between 2 and 120),
  -- Format international sans « + » (221771234567), celui d'un lien wa.me.
  phone         text not null check (phone ~ '^[0-9]{8,15}$'),
  license       text not null default 'B' check (license in ('A', 'B', 'C', 'D', 'E')),
  -- Montants en FCFA entiers : le franc CFA n'a pas de centimes.
  package_price integer not null default 0 check (package_price >= 0),
  hours_planned integer not null default 20 check (hours_planned >= 0),
  status        text not null default 'active' check (status in ('active', 'code_ok', 'licensed', 'dropped')),
  notes         text,
  created_at    timestamptz not null default now()
);
create index on public.students (school_id, created_at desc);

create table public.installments (
  id          uuid primary key default gen_random_uuid(),
  school_id   uuid not null references public.schools(id) on delete cascade,
  student_id  uuid not null references public.students(id) on delete cascade,
  due_date    date not null,
  amount      integer not null check (amount > 0),
  created_at  timestamptz not null default now()
);
create index on public.installments (school_id, due_date);
create index on public.installments (student_id);

create table public.payments (
  id          uuid primary key default gen_random_uuid(),
  school_id   uuid not null references public.schools(id) on delete cascade,
  student_id  uuid not null references public.students(id) on delete cascade,
  amount      integer not null check (amount > 0),
  method      text not null check (method in ('cash', 'wave', 'orange_money', 'other')),
  reference   text,
  paid_at     timestamptz not null default now(),
  created_by  uuid references auth.users(id) on delete set null
);
create index on public.payments (school_id, paid_at desc);
create index on public.payments (student_id);

-- ---------------------------------------------------------------------------
-- Leçons : la base refuse les doubles réservations
-- ---------------------------------------------------------------------------

create table public.lessons (
  id            uuid primary key default gen_random_uuid(),
  school_id     uuid not null references public.schools(id) on delete cascade,
  student_id    uuid not null references public.students(id) on delete cascade,
  instructor_id uuid references public.instructors(id) on delete set null,
  vehicle_id    uuid references public.vehicles(id) on delete set null,
  kind          text not null default 'driving' check (kind in ('driving', 'code')),
  starts_at     timestamptz not null,
  ends_at       timestamptz not null,
  status        text not null default 'planned' check (status in ('planned', 'done', 'missed', 'cancelled')),
  created_at    timestamptz not null default now(),
  check (ends_at > starts_at),
  -- Un moniteur ou une voiture ne peut pas être à deux endroits à la fois.
  -- Contrainte d'exclusion plutôt que vérification dans l'interface : deux
  -- secrétaires qui réservent le même créneau à la même seconde sont
  -- départagés par la base, pas par la chance.
  constraint lessons_no_instructor_overlap exclude using gist (
    instructor_id with =, tstzrange(starts_at, ends_at) with &&
  ) where (status <> 'cancelled' and instructor_id is not null),
  constraint lessons_no_vehicle_overlap exclude using gist (
    vehicle_id with =, tstzrange(starts_at, ends_at) with &&
  ) where (status <> 'cancelled' and vehicle_id is not null)
);
create index on public.lessons (school_id, starts_at);
create index on public.lessons (student_id);

create table public.exams (
  id          uuid primary key default gen_random_uuid(),
  school_id   uuid not null references public.schools(id) on delete cascade,
  student_id  uuid not null references public.students(id) on delete cascade,
  kind        text not null check (kind in ('code', 'driving')),
  exam_date   date not null,
  result      text not null default 'pending' check (result in ('pending', 'passed', 'failed')),
  created_at  timestamptz not null default now()
);
create index on public.exams (school_id, exam_date);

-- ---------------------------------------------------------------------------
-- Cohérence : un objet ne peut pointer que vers des objets de SA école
-- ---------------------------------------------------------------------------
-- Sans ce contrôle, un membre de l'école A pourrait créer une leçon qui
-- référence l'élève d'une école B s'il en connaissait l'identifiant.

create or replace function public.check_same_school()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Une branche par table : PL/pgSQL résout `new.<colonne>` à l'exécution, et
  -- lire `new.instructor_id` sur une ligne de paiement lèverait une erreur,
  -- même derrière un `and` qui serait faux.
  if tg_table_name = 'memberships' then
    if new.instructor_id is not null and not exists (
      select 1 from instructors i where i.id = new.instructor_id and i.school_id = new.school_id) then
      raise exception 'moniteur hors de cette école';
    end if;
    return new;
  end if;

  if not exists (select 1 from students s where s.id = new.student_id and s.school_id = new.school_id) then
    raise exception 'élève hors de cette école';
  end if;

  if tg_table_name = 'lessons' then
    if new.instructor_id is not null and not exists (
      select 1 from instructors i where i.id = new.instructor_id and i.school_id = new.school_id) then
      raise exception 'moniteur hors de cette école';
    end if;
    if new.vehicle_id is not null and not exists (
      select 1 from vehicles v where v.id = new.vehicle_id and v.school_id = new.school_id) then
      raise exception 'véhicule hors de cette école';
    end if;
  end if;
  return new;
end;
$$;

create trigger installments_same_school before insert or update on public.installments
  for each row execute function public.check_same_school();
create trigger payments_same_school before insert or update on public.payments
  for each row execute function public.check_same_school();
create trigger lessons_same_school before insert or update on public.lessons
  for each row execute function public.check_same_school();
create trigger exams_same_school before insert or update on public.exams
  for each row execute function public.check_same_school();
create trigger memberships_same_school before insert or update on public.memberships
  for each row execute function public.check_same_school();

-- ---------------------------------------------------------------------------
-- Droits
-- ---------------------------------------------------------------------------

-- `security definer` : la fonction lit `memberships` sans repasser par RLS,
-- ce qui évite une récursion infinie quand la politique de `memberships`
-- l'appelle elle-même.
create or replace function public.is_member(target uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from memberships m where m.school_id = target and m.user_id = auth.uid()
  );
$$;

create or replace function public.is_staff(target uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from memberships m
    where m.school_id = target and m.user_id = auth.uid() and m.role in ('owner', 'secretary')
  );
$$;

create or replace function public.is_owner(target uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from memberships m
    where m.school_id = target and m.user_id = auth.uid() and m.role = 'owner'
  );
$$;

alter table public.schools enable row level security;
alter table public.memberships enable row level security;
alter table public.instructors enable row level security;
alter table public.vehicles enable row level security;
alter table public.students enable row level security;
alter table public.installments enable row level security;
alter table public.payments enable row level security;
alter table public.lessons enable row level security;
alter table public.exams enable row level security;

-- Écoles : lues par leurs membres, modifiées par le propriétaire. La création
-- passe par `create_school` (plus bas), jamais par un insert direct.
create policy schools_select on public.schools for select to authenticated using (public.is_member(id));
create policy schools_update on public.schools for update to authenticated
  using (public.is_owner(id)) with check (public.is_owner(id));

-- Membres : chacun voit l'équipe de son école ; seul le propriétaire la gère.
create policy memberships_select on public.memberships for select to authenticated using (public.is_member(school_id));
create policy memberships_owner on public.memberships for all to authenticated
  using (public.is_owner(school_id)) with check (public.is_owner(school_id));

-- Données métier : lecture pour tous les membres, écriture pour le bureau
-- (propriétaire et secrétaire). Les moniteurs ont un droit à part sur les
-- leçons, plus bas.
do $$
declare t text;
begin
  foreach t in array array['instructors', 'vehicles', 'students', 'installments', 'payments', 'exams'] loop
    execute format('create policy %1$s_select on public.%1$s for select to authenticated using (public.is_member(school_id))', t);
    execute format('create policy %1$s_insert on public.%1$s for insert to authenticated with check (public.is_staff(school_id))', t);
    execute format('create policy %1$s_update on public.%1$s for update to authenticated using (public.is_staff(school_id)) with check (public.is_staff(school_id))', t);
    execute format('create policy %1$s_delete on public.%1$s for delete to authenticated using (public.is_staff(school_id))', t);
  end loop;
end;
$$;

create policy lessons_select on public.lessons for select to authenticated using (public.is_member(school_id));
create policy lessons_insert on public.lessons for insert to authenticated with check (public.is_staff(school_id));
create policy lessons_update on public.lessons for update to authenticated
  using (public.is_staff(school_id)) with check (public.is_staff(school_id));
create policy lessons_delete on public.lessons for delete to authenticated using (public.is_staff(school_id));

-- Un moniteur ne peut que marquer SES leçons faites ou manquées, via cette
-- fonction : une politique UPDATE lui laisserait aussi changer l'heure,
-- l'élève ou la voiture.
create or replace function public.mark_lesson(lesson uuid, new_status text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  l lessons;
begin
  if new_status not in ('done', 'missed') then
    raise exception 'statut invalide';
  end if;
  select * into l from lessons where id = lesson;
  if not found then
    raise exception 'leçon introuvable';
  end if;
  if not (
    public.is_staff(l.school_id)
    or exists (
      select 1 from memberships m
      where m.user_id = auth.uid() and m.school_id = l.school_id
        and m.role = 'instructor' and m.instructor_id = l.instructor_id
    )
  ) then
    raise exception 'accès refusé';
  end if;
  update lessons set status = new_status where id = lesson;
end;
$$;

-- ---------------------------------------------------------------------------
-- Création d'une école par un nouvel inscrit
-- ---------------------------------------------------------------------------

create or replace function public.create_school(school_name text, school_city text, school_phone text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  new_id uuid;
begin
  if auth.uid() is null then
    raise exception 'connexion requise';
  end if;
  -- Une école par compte à la création : évite qu'un formulaire rejoué en
  -- boucle crée des dizaines d'écoles vides.
  if exists (select 1 from memberships where user_id = auth.uid()) then
    select school_id into new_id from memberships where user_id = auth.uid() limit 1;
    return new_id;
  end if;
  insert into schools (name, city, phone)
  values (trim(school_name), nullif(trim(school_city), ''), nullif(trim(school_phone), ''))
  returning id into new_id;
  insert into memberships (user_id, school_id, role) values (auth.uid(), new_id, 'owner');
  return new_id;
end;
$$;

revoke execute on function public.create_school(text, text, text) from public, anon;
grant execute on function public.create_school(text, text, text) to authenticated;
revoke execute on function public.mark_lesson(uuid, text) from public, anon;
grant execute on function public.mark_lesson(uuid, text) to authenticated;
revoke execute on function public.is_member(uuid) from public, anon;
revoke execute on function public.is_staff(uuid) from public, anon;
revoke execute on function public.is_owner(uuid) from public, anon;
grant execute on function public.is_member(uuid) to authenticated;
grant execute on function public.is_staff(uuid) to authenticated;
grant execute on function public.is_owner(uuid) to authenticated;
revoke execute on function public.check_same_school() from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Vue de synthèse : solde de chaque élève
-- ---------------------------------------------------------------------------
-- `security_invoker` : la vue applique les droits de celui qui la lit, donc
-- les mêmes politiques RLS que les tables.
create view public.student_balances with (security_invoker = true) as
select
  s.id as student_id,
  s.school_id,
  s.package_price,
  coalesce((select sum(p.amount) from payments p where p.student_id = s.id), 0)::integer as paid,
  (s.package_price - coalesce((select sum(p.amount) from payments p where p.student_id = s.id), 0))::integer as balance,
  coalesce((select sum(i.amount) from installments i where i.student_id = s.id and i.due_date <= current_date), 0)::integer as due_to_date,
  (select count(*) from lessons l where l.student_id = s.id and l.status = 'done' and l.kind = 'driving')::integer as driving_lessons_done
from students s;
