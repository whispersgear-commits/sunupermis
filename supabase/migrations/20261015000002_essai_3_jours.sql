-- ===========================================================================
-- SunuPermis — essai gratuit de 3 jours
-- ---------------------------------------------------------------------------
-- Une nouvelle auto-école a accès à tout pendant 3 jours, sans payer. Ensuite,
-- l'accès demande un abonnement (les données sont conservées).
-- La formule choisie à l'inscription est enregistrée sur l'école.
-- (Pas de DROP : appliquée telle quelle sur Supabase.)
-- ===========================================================================

alter table public.schools alter column trial_ends_at set default now() + interval '3 days';

create or replace function public.create_school(school_name text, school_city text, school_phone text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  new_id uuid;
  u auth.users;
  chosen text;
begin
  if auth.uid() is null then
    raise exception 'connexion requise';
  end if;
  if exists (select 1 from memberships where user_id = auth.uid()) then
    select school_id into new_id from memberships where user_id = auth.uid() limit 1;
    return new_id;
  end if;
  select * into u from auth.users where id = auth.uid();
  chosen := u.raw_user_meta_data ->> 'plan';
  insert into schools (name, city, phone, plan, trial_ends_at)
  values (
    trim(school_name),
    nullif(trim(school_city), ''),
    nullif(trim(school_phone), ''),
    case when chosen in ('essentiel', 'pro', 'multi') then chosen else 'essentiel' end,
    now() + interval '3 days'
  )
  returning id into new_id;
  insert into memberships (user_id, school_id, role, full_name, email)
  values (auth.uid(), new_id, 'owner',
          coalesce(u.raw_user_meta_data ->> 'full_name', split_part(u.email, '@', 1)), u.email);
  return new_id;
end;
$$;
