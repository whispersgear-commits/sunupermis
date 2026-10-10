-- ===========================================================================
-- SunuPermis — reçus numérotés, vérification par QR code, factures, caisse
-- ---------------------------------------------------------------------------
-- 1. Chaque paiement reçoit un numéro de reçu, suivi et sans trou, par école
--    (REC-2026-0001), et un jeton secret pour la page publique de
--    vérification (QR code imprimé sur le reçu).
-- 2. Un paiement ne se modifie ni ne se supprime plus. Seul le propriétaire
--    peut l'annuler, avec un motif ; il reste visible, barré.
-- 3. Chaque élève reçoit un numéro de dossier, repris sur sa facture.
-- (Pas de DROP : appliquée telle quelle sur Supabase.)
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- Paiements : numéro, jeton, annulation
-- ---------------------------------------------------------------------------
alter table public.payments add column if not exists receipt_no integer;
alter table public.payments add column if not exists receipt_token text;
alter table public.payments add column if not exists cancelled_at timestamptz;
alter table public.payments add column if not exists cancelled_by uuid references auth.users(id) on delete set null;
alter table public.payments add column if not exists cancel_reason text;

-- Numéros des paiements déjà enregistrés, dans l'ordre chronologique.
with numbered as (
  select id, row_number() over (partition by school_id order by paid_at, id) as n
  from public.payments
  where receipt_no is null
)
update public.payments p set receipt_no = numbered.n from numbered where numbered.id = p.id;
update public.payments set receipt_token = encode(extensions.gen_random_bytes(12), 'hex') where receipt_token is null;

alter table public.payments alter column receipt_token set default encode(extensions.gen_random_bytes(12), 'hex');
alter table public.payments alter column receipt_token set not null;
create unique index if not exists payments_receipt_token_idx on public.payments (receipt_token);
create unique index if not exists payments_receipt_no_idx on public.payments (school_id, receipt_no);
create index if not exists payments_cancelled_by_idx on public.payments (cancelled_by);

-- Numéro attribué par la base, jamais par l'application : deux secrétaires
-- qui encaissent à la même seconde ne peuvent pas obtenir le même numéro.
-- Le verrou est propre à l'école et ne dure que le temps de l'insertion.
create or replace function public.assign_receipt_no()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform pg_advisory_xact_lock(hashtext('receipt:' || new.school_id::text));
  select coalesce(max(receipt_no), 0) + 1 into new.receipt_no from payments where school_id = new.school_id;
  -- Fixés par la base, quoi qu'envoie l'application : pas de reçu antidaté,
  -- pas de jeton choisi à l'avance, l'encaisseur est bien la personne connectée.
  new.receipt_token := encode(extensions.gen_random_bytes(12), 'hex');
  new.paid_at := now();
  if auth.uid() is not null then
    new.created_by := auth.uid();
  end if;
  new.cancelled_at := null;
  new.cancelled_by := null;
  new.cancel_reason := null;
  return new;
end;
$$;

create trigger payments_receipt_no before insert on public.payments
  for each row execute function public.assign_receipt_no();

-- Plus de modification ni de suppression depuis l'application : un
-- paiement encaissé est une trace. (Les politiques existantes sont fermées
-- plutôt que supprimées.)
alter policy payments_update on public.payments using (false) with check (false);
alter policy payments_delete on public.payments using (false);

-- Annulation : propriétaire seulement, motif obligatoire, une seule fois.
create or replace function public.cancel_payment(payment uuid, reason text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  p payments;
begin
  select * into p from payments where id = payment for update;
  if not found or not is_owner(p.school_id) then
    raise exception 'paiement introuvable';
  end if;
  if p.cancelled_at is not null then
    raise exception 'paiement déjà annulé';
  end if;
  if length(trim(coalesce(reason, ''))) < 3 then
    raise exception 'motif obligatoire';
  end if;
  update payments
  set cancelled_at = now(), cancelled_by = auth.uid(), cancel_reason = trim(reason)
  where id = payment;
end;
$$;

revoke execute on function public.cancel_payment(uuid, text) from public, anon;
grant execute on function public.cancel_payment(uuid, text) to authenticated;

-- Les soldes ignorent les paiements annulés.
create or replace view public.student_balances with (security_invoker = true) as
select
  s.id as student_id,
  s.school_id,
  s.package_price,
  coalesce((select sum(p.amount) from payments p where p.student_id = s.id and p.cancelled_at is null), 0)::integer as paid,
  (s.package_price - coalesce((select sum(p.amount) from payments p where p.student_id = s.id and p.cancelled_at is null), 0))::integer as balance,
  coalesce((select sum(i.amount) from installments i where i.student_id = s.id and i.due_date <= current_date), 0)::integer as due_to_date,
  (select count(*) from lessons l where l.student_id = s.id and l.status = 'done' and l.kind = 'driving')::integer as driving_lessons_done
from students s;

-- ---------------------------------------------------------------------------
-- Vérification publique d'un reçu (QR code)
-- ---------------------------------------------------------------------------
-- Ne renvoie que ce qui permet de reconnaître le reçu : pas de téléphone,
-- prénom et initiale du nom seulement.
create or replace function public.verify_receipt(token text)
returns table (
  school_name text,
  school_city text,
  receipt_no integer,
  receipt_year integer,
  amount integer,
  method text,
  paid_at timestamptz,
  student text,
  cancelled boolean
)
language sql
stable
security definer
set search_path = public
as $$
  select sc.name, sc.city, p.receipt_no, extract(year from p.paid_at)::integer, p.amount, p.method, p.paid_at,
         split_part(trim(st.full_name), ' ', 1) || coalesce(' ' || left(nullif(split_part(trim(st.full_name), ' ', 2), ''), 1) || '.', ''),
         p.cancelled_at is not null
  from payments p
  join schools sc on sc.id = p.school_id
  join students st on st.id = p.student_id
  where p.receipt_token = token and length(token) = 24;
$$;

revoke execute on function public.verify_receipt(text) from public;
grant execute on function public.verify_receipt(text) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Numéro de dossier élève (repris sur la facture)
-- ---------------------------------------------------------------------------
alter table public.students add column if not exists file_no integer;

with numbered as (
  select id, row_number() over (partition by school_id order by created_at, id) as n
  from public.students
  where file_no is null
)
update public.students s set file_no = numbered.n from numbered where numbered.id = s.id;
create unique index if not exists students_file_no_idx on public.students (school_id, file_no);

create or replace function public.assign_file_no()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform pg_advisory_xact_lock(hashtext('file:' || new.school_id::text));
  select coalesce(max(file_no), 0) + 1 into new.file_no from students where school_id = new.school_id;
  return new;
end;
$$;

create trigger students_file_no before insert on public.students
  for each row execute function public.assign_file_no();

-- Les fonctions de déclencheur ne sont pas appelables directement.
revoke execute on function public.assign_receipt_no() from public, anon, authenticated;
revoke execute on function public.assign_file_no() from public, anon, authenticated;

-- Index manquants signalés par le linter Supabase.
create index if not exists invitations_accepted_by_idx on public.invitations (accepted_by);
create index if not exists invitations_created_by_idx on public.invitations (created_by);
create index if not exists invitations_instructor_idx on public.invitations (instructor_id);
create index if not exists subscription_payments_created_by_idx on public.subscription_payments (created_by);
