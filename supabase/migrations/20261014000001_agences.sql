-- ===========================================================================
-- SunuPermis — agences (formule Multi-agences)
-- ---------------------------------------------------------------------------
-- Une école peut déclarer ses agences ; chaque élève est rattaché à l'une
-- d'elles. Le planning et les paiements se filtrent ensuite par agence,
-- à travers l'élève.
-- Seule une école en formule Multi-agences (ou en accès offert) peut modifier
-- sa liste d'agences : la base le vérifie, pas seulement l'écran.
-- (Pas de DROP : appliquée telle quelle sur Supabase.)
-- ===========================================================================

alter table public.schools add column if not exists agencies text[] not null default '{}'
  constraint schools_agencies_check check (cardinality(agencies) <= 20);

alter table public.students add column if not exists agency text
  constraint students_agency_check check (agency is null or char_length(agency) between 1 and 40);

create or replace function public.protect_agencies()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if current_user in ('authenticated', 'anon')
    and new.agencies is distinct from old.agencies
    and not (old.plan = 'multi' or old.trial_ends_at > now())
  then
    raise exception 'les agences sont réservées à la formule Multi-agences';
  end if;
  return new;
end;
$$;

create or replace trigger schools_protect_agencies before update on public.schools
  for each row execute function public.protect_agencies();
