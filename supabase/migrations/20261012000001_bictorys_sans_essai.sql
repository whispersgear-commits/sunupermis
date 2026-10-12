-- ===========================================================================
-- SunuPermis — paiement de l'abonnement par Bictorys, sans essai gratuit
-- ---------------------------------------------------------------------------
-- 1. Plus d'essai : une nouvelle école n'a accès au logiciel qu'après le
--    paiement de son premier abonnement (choisi à l'inscription).
-- 2. Le serveur confirme un paiement Bictorys sans clé de service Supabase :
--    il présente un secret partagé dont la base ne garde que l'empreinte.
--    Le secret lui-même n'est jamais écrit dans ce fichier.
-- (Pas de DROP : appliquée telle quelle sur Supabase.)
-- ===========================================================================

alter table public.schools alter column trial_ends_at set default now();
alter table public.subscription_payments alter column provider set default 'bictorys';

-- Empreintes des secrets du serveur. RLS active et aucune politique :
-- illisible depuis l'application.
create table if not exists public.app_secrets (
  name text primary key,
  hash text not null
);
alter table public.app_secrets enable row level security;
revoke all on public.app_secrets from anon, authenticated;

create or replace function public.check_server_secret(p_secret text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from app_secrets
    where name = 'payments_server'
      and hash = encode(extensions.digest(coalesce(p_secret, ''), 'sha256'), 'hex')
  );
$$;
revoke execute on function public.check_server_secret(text) from public, anon, authenticated;

-- Lecture d'un paiement d'abonnement par le serveur (webhook, retour de
-- paiement), avant d'interroger Bictorys.
create or replace function public.server_subscription_payment(p_payment uuid, p_secret text)
returns table (provider_ref text, amount integer, status text)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not check_server_secret(p_secret) then
    raise exception 'non autorisé';
  end if;
  return query select sp.provider_ref, sp.amount, sp.status from subscription_payments sp where sp.id = p_payment;
end;
$$;

-- Validation d'un paiement, après vérification de la transaction auprès de
-- Bictorys par le serveur. Idempotente : Bictorys peut notifier plusieurs fois.
create or replace function public.settle_subscription_payment(p_payment uuid, p_ref text, p_amount integer, p_secret text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  p subscription_payments;
begin
  if not check_server_secret(p_secret) then
    raise exception 'non autorisé';
  end if;
  select * into p from subscription_payments where id = p_payment for update;
  if not found or p.provider_ref is distinct from p_ref then
    return false;
  end if;
  if p.status = 'paid' then
    return true;
  end if;
  if p_amount < p.amount then
    update subscription_payments set status = 'failed' where id = p.id;
    return false;
  end if;
  perform confirm_subscription_payment(p.provider_ref);
  return true;
end;
$$;

-- Paiement abandonné ou refusé chez Bictorys.
create or replace function public.fail_subscription_payment(p_payment uuid, p_ref text, p_secret text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not check_server_secret(p_secret) then
    raise exception 'non autorisé';
  end if;
  update subscription_payments set status = 'failed'
  where id = p_payment and provider_ref = p_ref and status = 'pending';
end;
$$;

-- Appelables avec la clé publique, mais inutiles sans le secret du serveur.
revoke execute on function public.server_subscription_payment(uuid, text) from public;
revoke execute on function public.settle_subscription_payment(uuid, text, integer, text) from public;
revoke execute on function public.fail_subscription_payment(uuid, text, text) from public;
grant execute on function public.server_subscription_payment(uuid, text) to anon, authenticated;
grant execute on function public.settle_subscription_payment(uuid, text, integer, text) to anon, authenticated;
grant execute on function public.fail_subscription_payment(uuid, text, text) to anon, authenticated;

-- Une école créée désormais n'a pas d'essai. create_school s'appuie sur la
-- valeur par défaut de trial_ends_at (now()) : rien d'autre à changer.
