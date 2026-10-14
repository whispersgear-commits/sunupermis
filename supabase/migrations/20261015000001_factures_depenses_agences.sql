-- ===========================================================================
-- SunuPermis — factures d'abonnement, dépenses, agences des moniteurs et
-- des voitures
-- (Pas de DROP : appliquée telle quelle sur Supabase.)
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- 1. Factures des abonnements
-- ---------------------------------------------------------------------------
-- Chaque abonnement payé reçoit un numéro de facture continu, propre à
-- SunuPermis (toutes écoles confondues), et la période qu'il couvre.
create sequence if not exists public.subscription_invoice_seq;

alter table public.subscription_payments add column if not exists invoice_no bigint unique;
alter table public.subscription_payments add column if not exists period_start timestamptz;
alter table public.subscription_payments add column if not exists period_end timestamptz;

-- Paiements déjà confirmés : numérotés dans l'ordre de paiement.
do $$
declare r record;
begin
  for r in select id from public.subscription_payments where status = 'paid' and invoice_no is null order by paid_at, created_at loop
    update public.subscription_payments set invoice_no = nextval('public.subscription_invoice_seq') where id = r.id;
  end loop;
end;
$$;

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
  select greatest(now(), coalesce(paid_until, now()), trial_ends_at) into base from schools where id = p.school_id;
  update subscription_payments
  set status = 'paid',
      paid_at = now(),
      invoice_no = nextval('subscription_invoice_seq'),
      period_start = base,
      period_end = base + make_interval(months => p.months)
  where id = p.id;
  update schools
  set paid_until = base + make_interval(months => p.months), plan = p.plan
  where id = p.school_id;
end;
$$;
revoke execute on function public.confirm_subscription_payment(text) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- 2. Dépenses
-- ---------------------------------------------------------------------------
-- Ce qui sort de la caisse : carburant, salaires, entretien… Avec les
-- encaissements, elles donnent le résultat du mois.
create table if not exists public.expenses (
  id          uuid primary key default gen_random_uuid(),
  school_id   uuid not null references public.schools(id) on delete cascade,
  spent_on    date not null default current_date,
  category    text not null check (category in ('fuel', 'salary', 'maintenance', 'rent', 'insurance', 'exam_fees', 'equipment', 'other')),
  label       text check (label is null or char_length(label) <= 120),
  amount      integer not null check (amount > 0 and amount <= 100000000),
  agency      text check (agency is null or char_length(agency) between 1 and 40),
  vehicle_id  uuid references public.vehicles(id) on delete set null,
  created_by  uuid references auth.users(id) on delete set null default auth.uid(),
  created_at  timestamptz not null default now()
);
create index if not exists expenses_school_idx on public.expenses (school_id, spent_on desc);

alter table public.expenses enable row level security;
-- Le bureau (propriétaire, secrétaire) saisit et consulte ; seul le
-- propriétaire corrige ou supprime.
do $$
begin
  if not exists (select 1 from pg_policies where tablename = 'expenses' and policyname = 'expenses_select') then
    create policy expenses_select on public.expenses for select to authenticated using (public.is_staff(school_id));
    create policy expenses_insert on public.expenses for insert to authenticated with check (public.is_staff(school_id));
    create policy expenses_update on public.expenses for update to authenticated using (public.is_owner(school_id)) with check (public.is_owner(school_id));
    create policy expenses_delete on public.expenses for delete to authenticated using (public.is_owner(school_id));
  end if;
end;
$$;
grant select, insert, update, delete on public.expenses to authenticated;

-- ---------------------------------------------------------------------------
-- 3. Agences des moniteurs et des voitures
-- ---------------------------------------------------------------------------
alter table public.instructors add column if not exists agency text
  constraint instructors_agency_check check (agency is null or char_length(agency) between 1 and 40);
alter table public.vehicles add column if not exists agency text
  constraint vehicles_agency_check check (agency is null or char_length(agency) between 1 and 40);
