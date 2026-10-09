-- ===========================================================================
-- SunuPermis — équipe, abonnement, WhatsApp automatique
-- ---------------------------------------------------------------------------
-- 1. Invitations : le propriétaire invite une secrétaire ou un moniteur par
--    un lien. Pas de clé secrète côté application : l'invité crée son compte
--    normalement, puis une fonction de la base vérifie le jeton et l'ajoute
--    à l'école.
-- 2. Abonnement : paiement en ligne (Wave), date de fin d'abonnement.
-- 3. Journal des messages WhatsApp envoyés automatiquement, qui empêche
--    d'envoyer deux fois le même rappel.
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- Membres : nom et e-mail visibles par l'équipe
-- ---------------------------------------------------------------------------
-- `auth.users` n'est pas lisible depuis l'application ; on recopie ici ce que
-- l'équipe a besoin d'afficher.
alter table public.memberships add column if not exists full_name text;
alter table public.memberships add column if not exists email text;

update public.memberships m
set full_name = coalesce(u.raw_user_meta_data ->> 'full_name', split_part(u.email, '@', 1)),
    email = u.email
from auth.users u
where u.id = m.user_id and m.email is null;

create or replace function public.create_school(school_name text, school_city text, school_phone text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  new_id uuid;
  u auth.users;
begin
  if auth.uid() is null then
    raise exception 'connexion requise';
  end if;
  if exists (select 1 from memberships where user_id = auth.uid()) then
    select school_id into new_id from memberships where user_id = auth.uid() limit 1;
    return new_id;
  end if;
  select * into u from auth.users where id = auth.uid();
  insert into schools (name, city, phone)
  values (trim(school_name), nullif(trim(school_city), ''), nullif(trim(school_phone), ''))
  returning id into new_id;
  insert into memberships (user_id, school_id, role, full_name, email)
  values (auth.uid(), new_id, 'owner',
          coalesce(u.raw_user_meta_data ->> 'full_name', split_part(u.email, '@', 1)), u.email);
  return new_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- Invitations
-- ---------------------------------------------------------------------------

create table if not exists public.invitations (
  id            uuid primary key default gen_random_uuid(),
  school_id     uuid not null references public.schools(id) on delete cascade,
  -- 36 caractères hexadécimaux tirés au hasard : impossible à deviner.
  token         text not null unique default encode(extensions.gen_random_bytes(18), 'hex'),
  role          text not null check (role in ('secretary', 'instructor')),
  instructor_id uuid references public.instructors(id) on delete set null,
  label         text not null check (length(trim(label)) between 2 and 120),
  created_by    uuid references auth.users(id) on delete set null,
  created_at    timestamptz not null default now(),
  expires_at    timestamptz not null default (now() + interval '7 days'),
  accepted_by   uuid references auth.users(id) on delete set null,
  accepted_at   timestamptz,
  revoked       boolean not null default false
);
create index if not exists invitations_school_idx on public.invitations (school_id, created_at desc);

alter table public.invitations enable row level security;
create policy invitations_owner on public.invitations for all to authenticated
  using (public.is_owner(school_id)) with check (public.is_owner(school_id));

-- Lecture publique d'une invitation PAR SON JETON uniquement : la page
-- « Rejoindre » doit afficher le nom de l'école avant que l'invité ait un
-- compte. Rien d'autre que ces trois champs ne sort.
create or replace function public.invitation_info(invite_token text)
returns table (school_name text, role text, label text, valid boolean)
language sql
stable
security definer
set search_path = public
as $$
  select s.name, i.role, i.label,
         (not i.revoked and i.accepted_at is null and i.expires_at > now())
  from invitations i
  join schools s on s.id = i.school_id
  where i.token = invite_token;
$$;

create or replace function public.accept_invitation(invite_token text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  inv invitations;
  u auth.users;
begin
  if auth.uid() is null then
    raise exception 'connexion requise';
  end if;
  -- Verrou : deux comptes qui ouvrent le même lien en même temps ne peuvent
  -- pas l'utiliser tous les deux.
  select * into inv from invitations where token = invite_token for update;
  if not found or inv.revoked or inv.accepted_at is not null or inv.expires_at <= now() then
    raise exception 'invitation invalide ou expirée';
  end if;
  if exists (select 1 from memberships where user_id = auth.uid() and school_id = inv.school_id) then
    raise exception 'déjà membre de cette école';
  end if;
  select * into u from auth.users where id = auth.uid();
  insert into memberships (user_id, school_id, role, instructor_id, full_name, email)
  values (auth.uid(), inv.school_id, inv.role, inv.instructor_id,
          coalesce(u.raw_user_meta_data ->> 'full_name', inv.label), u.email);
  update invitations set accepted_by = auth.uid(), accepted_at = now() where id = inv.id;
  return inv.school_id;
end;
$$;

revoke execute on function public.invitation_info(text) from public;
grant execute on function public.invitation_info(text) to anon, authenticated;
revoke execute on function public.accept_invitation(text) from public, anon;
grant execute on function public.accept_invitation(text) to authenticated;

-- Le propriétaire ne peut pas se retirer lui-même : une école sans
-- propriétaire ne serait plus administrable par personne.
create or replace function public.protect_owner()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  -- Seules les actions faites depuis l'application sont contrôlées : la
  -- suppression d'une école ou d'un compte (cascade, tableau de bord
  -- Supabase) doit pouvoir emporter ses membres.
  if current_user in ('authenticated', 'anon')
     and old.role = 'owner' and (tg_op = 'DELETE' or new.role <> 'owner') then
    if not exists (
      select 1 from memberships
      where school_id = old.school_id and role = 'owner' and user_id <> old.user_id
    ) then
      raise exception 'une école doit garder un propriétaire';
    end if;
  end if;
  return coalesce(new, old);
end;
$$;

create trigger memberships_protect_owner before update or delete on public.memberships
  for each row execute function public.protect_owner();

-- ---------------------------------------------------------------------------
-- L'argent reste au bureau
-- ---------------------------------------------------------------------------
-- Un moniteur voit les élèves et le planning, pas les paiements.
alter policy payments_select on public.payments using (public.is_staff(school_id));
alter policy installments_select on public.installments using (public.is_staff(school_id));

-- ---------------------------------------------------------------------------
-- Abonnement
-- ---------------------------------------------------------------------------

alter table public.schools add column if not exists paid_until timestamptz;
alter table public.schools add column if not exists whatsapp_auto boolean not null default false;

create table if not exists public.subscription_payments (
  id            uuid primary key default gen_random_uuid(),
  school_id     uuid not null references public.schools(id) on delete cascade,
  plan          text not null check (plan in ('essentiel', 'pro', 'multi')),
  months        integer not null check (months in (1, 12)),
  amount        integer not null check (amount > 0),
  provider      text not null default 'wave',
  provider_ref  text unique,
  status        text not null default 'pending' check (status in ('pending', 'paid', 'failed')),
  created_by    uuid references auth.users(id) on delete set null,
  created_at    timestamptz not null default now(),
  paid_at       timestamptz
);
create index if not exists subscription_payments_school_idx on public.subscription_payments (school_id, created_at desc);

alter table public.subscription_payments enable row level security;
-- Le propriétaire voit son historique et peut ouvrir un paiement « en
-- attente ». Seul le serveur (clé de service, après vérification de la
-- signature Wave) peut le passer à « payé ».
create policy subscription_payments_select on public.subscription_payments for select to authenticated
  using (public.is_owner(school_id));
create policy subscription_payments_insert on public.subscription_payments for insert to authenticated
  with check (public.is_owner(school_id) and status = 'pending' and paid_at is null);

-- `paid_until` et `plan` ne bougent que par un paiement confirmé : la
-- politique de mise à jour des écoles ne doit pas laisser le propriétaire
-- s'offrir un an d'abonnement en modifiant sa ligne.
create or replace function public.protect_subscription()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if current_user in ('authenticated', 'anon') and (
    new.paid_until is distinct from old.paid_until
    or new.plan is distinct from old.plan
    or new.trial_ends_at is distinct from old.trial_ends_at
  ) then
    raise exception 'abonnement modifiable uniquement par un paiement';
  end if;
  return new;
end;
$$;

create trigger schools_protect_subscription before update on public.schools
  for each row execute function public.protect_subscription();

-- Appelée par le serveur à la réception d'un paiement confirmé. Idempotente :
-- Wave peut renvoyer le même événement plusieurs fois.
create or replace function public.confirm_subscription_payment(ref text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  p subscription_payments;
  base timestamptz;
begin
  select * into p from subscription_payments where provider_ref = ref for update;
  if not found or p.status = 'paid' then
    return;
  end if;
  update subscription_payments set status = 'paid', paid_at = now() where id = p.id;
  select greatest(now(), coalesce(paid_until, now()), trial_ends_at) into base from schools where id = p.school_id;
  update schools
  set paid_until = base + make_interval(months => p.months), plan = p.plan
  where id = p.school_id;
end;
$$;

revoke execute on function public.confirm_subscription_payment(text) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Journal WhatsApp
-- ---------------------------------------------------------------------------

create table if not exists public.message_log (
  id           uuid primary key default gen_random_uuid(),
  school_id    uuid not null references public.schools(id) on delete cascade,
  kind         text not null check (kind in ('lesson_reminder', 'payment_reminder', 'welcome')),
  lesson_id    uuid references public.lessons(id) on delete cascade,
  student_id   uuid references public.students(id) on delete cascade,
  phone        text not null,
  status       text not null default 'pending' check (status in ('pending', 'sent', 'failed')),
  error        text,
  provider_id  text,
  created_at   timestamptz not null default now()
);
-- Un seul rappel par leçon, quoi qu'il arrive (relance manuelle + envoi
-- automatique le même soir, tâche relancée deux fois…).
create unique index if not exists message_log_one_lesson_reminder
  on public.message_log (lesson_id) where kind = 'lesson_reminder';
create index if not exists message_log_school_idx on public.message_log (school_id, created_at desc);
create index if not exists message_log_student_idx on public.message_log (student_id, kind, created_at desc);

alter table public.message_log enable row level security;
create policy message_log_select on public.message_log for select to authenticated using (public.is_staff(school_id));
create policy message_log_insert on public.message_log for insert to authenticated with check (public.is_staff(school_id));
create policy message_log_update on public.message_log for update to authenticated
  using (public.is_staff(school_id)) with check (public.is_staff(school_id));

-- ---------------------------------------------------------------------------
-- Index manquants sur les clés étrangères (conseil du linter Supabase)
-- ---------------------------------------------------------------------------
create index if not exists lessons_instructor_idx on public.lessons (instructor_id);
create index if not exists lessons_vehicle_idx on public.lessons (vehicle_id);
create index if not exists exams_student_idx on public.exams (student_id);
create index if not exists memberships_instructor_idx on public.memberships (instructor_id);
create index if not exists payments_created_by_idx on public.payments (created_by);
