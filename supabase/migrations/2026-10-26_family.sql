-- =====================================================================================
-- Migration 2026-10-26 : abonnements (Stripe / Apple / manuel), formule Famille (jusqu'à 4 personnes) et vue
-- Paiements du back office — À EXÉCUTER PAR ANTOINE dans Supabase > SQL Editor > New query > Run.
-- Idempotente : peut être relancée sans risque. Recopiée en fin de schema.sql.
-- Prérequis : schema.sql (profiles) et 2026-10-25_admin.sql (admin_guard, admin_write_log, prem_grants).
--
-- Principe
--   - subscriptions : une ligne par abonnement d'un magasin (Stripe sur le site, Apple via RevenueCat dans l'app, ou
--     « manual » pour un test). Écrite SEULEMENT par les fonctions serveur (fonctions Edge stripe et revenuecat, avec
--     la clé service, via sub_apply). Un joueur ne lit que ses propres lignes.
--   - families / family_members / family_invites : le titulaire d'un abonnement Famille invite jusqu'à 3 personnes
--     (4 au total, titulaire compris). Chacun garde son compte et sa progression. Tout passe par les fonctions
--     family_* (security definer, search_path fixé) : aucune écriture directe depuis l'app.
--   - my_entitlement() : ce que l'app lit pour savoir si le joueur est Premium : abonnement perso, OU famille dont le
--     titulaire est abonné, OU mois offert (prem_grants). Renvoie le meilleur des trois.
--   - Messages d'erreur courts et stables (l'app les traduit) : not_signed_in, no_family, not_owner, family_full,
--     family_inactive, invite_invalid, invite_expired, invite_used, is_owner, already_member, not_member, too_many_invites.
-- =====================================================================================

-- ---------- 1. abonnements ----------
create table if not exists public.subscriptions (
  id bigserial primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  store text not null check (store in ('stripe','apple','manual')),
  product text not null check (char_length(product) between 1 and 100),       -- solo_month | solo_year | family_year (ou identifiant produit Apple)
  plan text not null check (plan in ('solo','family')),
  status text not null check (status in ('trialing','active','past_due','canceled','expired','refunded')),
  period_end timestamptz,                                                       -- fin de la période payée (ou de l'essai)
  trial_end timestamptz,
  store_id text not null check (char_length(store_id) between 1 and 200),       -- Stripe : sub_… ; Apple : original_transaction_id
  customer_id text check (customer_id is null or char_length(customer_id) <= 200), -- Stripe : cus_… (portail client)
  cancel_at_period_end boolean not null default false,
  amount_cents integer check (amount_cents is null or amount_cents between 0 and 1000000),
  currency text check (currency is null or currency ~ '^[a-z]{3}$'),
  billing text check (billing is null or billing in ('month','year')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (store, store_id)
);
-- horodatage du dernier événement magasin appliqué (RevenueCat event_timestamp_ms) : un événement plus ancien est ignoré
alter table public.subscriptions add column if not exists last_event_at timestamptz;
create index if not exists subscriptions_user_idx on public.subscriptions (user_id);
alter table public.subscriptions enable row level security;
revoke all on public.subscriptions from anon, authenticated;
grant select on public.subscriptions to authenticated;
drop policy if exists "subscriptions own read" on public.subscriptions;
create policy "subscriptions own read" on public.subscriptions for select to authenticated using (user_id = auth.uid());
grant select, insert, update on public.subscriptions to service_role;
grant usage on sequence public.subscriptions_id_seq to service_role;

-- un abonnement compte tant qu'il est en essai, actif ou en retard de paiement (Stripe relance) et que la période court
create or replace function public.sub_live(s public.subscriptions)
returns boolean language sql stable as $$   -- stable (pas immutable) : dépend de now()
  select s.status in ('trialing','active','past_due') and coalesce(s.period_end, 'infinity'::timestamptz) > now()
$$;

-- ---------- 2. familles ----------
create table if not exists public.families (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null unique references auth.users(id) on delete cascade,
  sub_id bigint references public.subscriptions(id) on delete set null,
  seats smallint not null default 4 check (seats between 2 and 6),            -- personnes au total, titulaire compris
  created_at timestamptz not null default now()
);
create table if not exists public.family_members (
  family_id uuid not null references public.families(id) on delete cascade,
  user_id uuid not null unique references auth.users(id) on delete cascade,  -- une seule famille par personne
  joined_at timestamptz not null default now(),
  primary key (family_id, user_id)
);
create table if not exists public.family_invites (
  code text primary key check (code ~ '^[A-HJ-NP-Z2-9]{8}$'),                 -- 8 caractères sans 0/O/1/I
  family_id uuid not null references public.families(id) on delete cascade,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  used_by uuid references auth.users(id) on delete set null,
  used_at timestamptz
);
create index if not exists family_invites_family_idx on public.family_invites (family_id, created_at desc);
alter table public.families enable row level security;
alter table public.family_members enable row level security;
alter table public.family_invites enable row level security;
revoke all on public.families, public.family_members, public.family_invites from anon, authenticated;
grant select, insert, update, delete on public.families, public.family_members, public.family_invites to service_role;

-- la famille d'un joueur (titulaire ou membre) : usage interne (admin_family), aucun droit pour l'app
create or replace function public.family_of_user(p_user uuid)
returns uuid language sql stable security definer set search_path = public as $$
  select coalesce((select f.id from public.families f where f.owner_id = p_user),
                  (select m.family_id from public.family_members m where m.user_id = p_user))
$$;
revoke all on function public.family_of_user(uuid) from public, anon, authenticated;
-- la famille de l'appelant (titulaire ou membre), pour les règles RLS ; security definer pour que les règles ne se rappellent
-- pas elles-mêmes. Seulement pour soi : demander la famille d'un autre est refusé (forbidden).
create or replace function public.family_of(p_user uuid)
returns uuid language plpgsql stable security definer set search_path = public as $$
begin
  if p_user is null or p_user is distinct from auth.uid() then raise exception 'forbidden'; end if;
  return public.family_of_user(p_user);
end $$;
revoke all on function public.family_of(uuid) from public, anon;
grant execute on function public.family_of(uuid) to authenticated;
grant select on public.families, public.family_members to authenticated;
drop policy if exists "families read own" on public.families;
create policy "families read own" on public.families for select to authenticated using (id = public.family_of(auth.uid()));
drop policy if exists "family_members read own" on public.family_members;
create policy "family_members read own" on public.family_members for select to authenticated using (family_id = public.family_of(auth.uid()));

-- fin de l'abonnement Famille du titulaire (null = pas d'abonnement Famille en cours)
create or replace function public.family_until(p_family uuid)
returns timestamptz language sql stable security definer set search_path = public as $$
  select max(coalesce(s.period_end, 'infinity'::timestamptz))
  from public.families f join public.subscriptions s on s.user_id = f.owner_id
  where f.id = p_family and s.plan = 'family' and public.sub_live(s)
$$;
revoke all on function public.family_until(uuid) from public, anon, authenticated;

-- la famille du titulaire, créée si besoin quand il a un abonnement Famille en cours (sinon null)
create or replace function public.family_ensure(p_owner uuid)
returns uuid language plpgsql security definer set search_path = public as $$
declare fid uuid; sid bigint;
begin
  select id into fid from public.families where owner_id = p_owner;
  if fid is not null then return fid; end if;
  select s.id into sid from public.subscriptions s where s.user_id = p_owner and s.plan = 'family' and public.sub_live(s)
    order by coalesce(s.period_end, 'infinity'::timestamptz) desc limit 1;
  if sid is null then return null; end if;
  insert into public.families (owner_id, sub_id) values (p_owner, sid)
    on conflict (owner_id) do update set sub_id = excluded.sub_id returning id into fid;
  return fid;
end $$;
revoke all on function public.family_ensure(uuid) from public, anon, authenticated;

-- ---------- 3. ce que l'app lit : my_entitlement() ----------
-- {plan: solo|family|gift|null, status, until (ISO), trial_end, source: self|family|grant|null,
--  store, family_owner (pseudo du titulaire quand source = family)}
create or replace function public.my_entitlement()
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare me uuid := auth.uid(); best jsonb := jsonb_build_object('plan', null, 'status', null, 'until', null, 'source', null);
        bu timestamptz := '-infinity'; s public.subscriptions; fid uuid; fu timestamptz; g timestamptz; oname text;
begin
  if me is null then return best; end if;
  -- 1. abonnement perso (le plus long)
  select * into s from public.subscriptions x where x.user_id = me and public.sub_live(x)
    order by coalesce(x.period_end, 'infinity'::timestamptz) desc limit 1;
  if found then
    bu := coalesce(s.period_end, '2999-12-31'::timestamptz);
    best := jsonb_build_object('plan', s.plan, 'status', s.status, 'until', bu, 'trial_end', s.trial_end, 'source', 'self', 'store', s.store,
                               'cancel_at_period_end', s.cancel_at_period_end, 'product', s.product);
  end if;
  -- 2. membre d'une famille dont le titulaire est abonné
  select m.family_id into fid from public.family_members m where m.user_id = me;
  if fid is not null then
    fu := public.family_until(fid);
    if fu is not null and least(fu, '2999-12-31'::timestamptz) > bu then
      bu := least(fu, '2999-12-31'::timestamptz);
      select p.name into oname from public.families f left join public.profiles p on p.id = f.owner_id where f.id = fid;
      best := jsonb_build_object('plan', 'family', 'status', 'active', 'until', bu, 'source', 'family', 'family_owner', oname);
    end if;
  end if;
  -- 3. mois offert depuis le back office
  select gr.until into g from public.prem_grants gr where gr.user_id = me and gr.until > now();
  if g is not null and g > bu then
    best := jsonb_build_object('plan', 'gift', 'status', 'active', 'until', g, 'source', 'grant');
  end if;
  return best;
end $$;
revoke all on function public.my_entitlement() from public, anon;
grant execute on function public.my_entitlement() to authenticated;

-- ---------- 4. fonctions Famille (appelées par l'app) ----------
create or replace function public.family_code()
returns text language sql volatile as $$
  select string_agg(substr('ABCDEFGHJKLMNPQRSTUVWXYZ23456789', 1 + (get_byte(decode(md5(gen_random_uuid()::text), 'hex'), i) % 32), 1), '')
  from generate_series(0, 7) i
$$;
revoke all on function public.family_code() from public, anon, authenticated;

-- état de la famille de l'appelant : rôle, places, membres, invitation en cours (titulaire seulement)
create or replace function public.family_status()
returns jsonb language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); fid uuid; f public.families; role text; fu timestamptz; inv jsonb; mem jsonb; used int;
begin
  if me is null then raise exception 'not_signed_in'; end if;
  fid := public.family_ensure(me);
  -- ancien titulaire (famille inactive) devenu membre d'une autre famille : on montre celle où il est membre
  if fid is not null and public.family_until(fid) is null and exists (select 1 from public.family_members where user_id = me) then fid := null; end if;
  if fid is not null then role := 'owner';
  else select m.family_id into fid from public.family_members m where m.user_id = me; if fid is not null then role := 'member'; end if;
  end if;
  if fid is null then return jsonb_build_object('role', null); end if;
  select * into f from public.families where id = fid;
  fu := public.family_until(fid);
  select count(*) + 1 into used from public.family_members where family_id = fid;
  select coalesce(jsonb_agg(x order by (x ->> 'owner')::boolean desc, x ->> 'joined_at'), '[]'::jsonb) into mem from (
    select jsonb_build_object('user_id', f.owner_id, 'name', p.name, 'avatar', coalesce(p.avatar, 0), 'owner', true, 'me', f.owner_id = me, 'joined_at', f.created_at) x
      from (select 1) one left join public.profiles p on p.id = f.owner_id
    union all
    select jsonb_build_object('user_id', m.user_id, 'name', p.name, 'avatar', coalesce(p.avatar, 0), 'owner', false, 'me', m.user_id = me, 'joined_at', m.joined_at)
      from public.family_members m left join public.profiles p on p.id = m.user_id where m.family_id = fid) s;
  if role = 'owner' then
    select jsonb_build_object('code', i.code, 'expires_at', i.expires_at) into inv from public.family_invites i
      where i.family_id = fid and i.used_by is null and i.expires_at > now() order by i.created_at desc limit 1;
  end if;
  return jsonb_build_object('role', role, 'family_id', fid, 'seats', f.seats, 'used', used, 'left', greatest(f.seats - used, 0),
    'active', fu is not null, 'until', least(fu, '2999-12-31'::timestamptz), 'members', mem, 'invite', inv);
end $$;

-- le titulaire crée un lien d'invitation (8 caractères, 7 jours, une seule utilisation) ; l'ancien lien non utilisé est remplacé
create or replace function public.family_invite()
returns jsonb language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); fid uuid; f public.families; used int; c text; n int; e timestamptz;
begin
  if me is null then raise exception 'not_signed_in'; end if;
  fid := public.family_ensure(me);
  if fid is null then
    if exists (select 1 from public.family_members where user_id = me) then raise exception 'not_owner'; end if;
    raise exception 'no_family';
  end if;
  select * into f from public.families where id = fid for update;
  if public.family_until(fid) is null then raise exception 'family_inactive'; end if;
  select count(*) + 1 into used from public.family_members where family_id = fid;
  if used >= f.seats then raise exception 'family_full'; end if;
  select count(*) into n from public.family_invites where family_id = fid and created_at > now() - interval '1 day';
  if n >= 20 then raise exception 'too_many_invites'; end if;
  delete from public.family_invites where family_id = fid and used_by is null;
  loop
    c := public.family_code();
    begin
      insert into public.family_invites (code, family_id, expires_at) values (c, fid, now() + interval '7 days') returning expires_at into e;
      exit;
    exception when unique_violation then -- très rare : on retire un autre code
    end;
  end loop;
  return jsonb_build_object('code', c, 'expires_at', e, 'url', 'https://pianochallenges.com/?fam=' || c, 'left', f.seats - used);
end $$;

-- avant de rejoindre : de qui est cette famille, reste-t-il une place ? (ne consomme pas le code)
create or replace function public.family_invite_info(p_code text)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare me uuid := auth.uid(); c text := upper(btrim(coalesce(p_code, ''))); i public.family_invites; f public.families; used int; oname text; oav int; why text;
begin
  if me is null then raise exception 'not_signed_in'; end if;
  if c !~ '^[A-HJ-NP-Z2-9]{8}$' then return jsonb_build_object('ok', false, 'error', 'invite_invalid'); end if;
  select * into i from public.family_invites where code = c;
  if not found then return jsonb_build_object('ok', false, 'error', 'invite_invalid'); end if;
  select * into f from public.families where id = i.family_id;
  select p.name, p.avatar into oname, oav from public.profiles p where p.id = f.owner_id;
  select count(*) + 1 into used from public.family_members where family_id = f.id;
  why := case when i.used_by is not null and i.used_by <> me then 'invite_used'
              when i.expires_at <= now() then 'invite_expired'
              when f.owner_id = me then 'is_owner'
              when exists (select 1 from public.family_members where user_id = me and family_id = f.id) then 'already_member'
              when exists (select 1 from public.family_members m where m.user_id = me and public.family_until(m.family_id) is not null)
                or exists (select 1 from public.families o where o.owner_id = me and public.family_until(o.id) is not null) then 'already_member'  -- une famille inactive ne compte pas
              when public.family_until(f.id) is null then 'family_inactive'
              when used >= f.seats then 'family_full' end;
  return jsonb_build_object('ok', why is null, 'error', why, 'owner', oname, 'avatar', coalesce(oav, 0), 'seats', f.seats, 'used', used,
    'mine', exists (select 1 from public.family_members where user_id = me and family_id = f.id));
end $$;

-- rejoindre avec un code
create or replace function public.family_join(p_code text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); c text := upper(btrim(coalesce(p_code, ''))); i public.family_invites; f public.families; used int; oname text; ifam uuid;
begin
  if me is null then raise exception 'not_signed_in'; end if;
  if c !~ '^[A-HJ-NP-Z2-9]{8}$' then raise exception 'invite_invalid'; end if;
  -- verrous dans le même ordre que family_invite : la famille d'abord, puis l'invitation
  select family_id into ifam from public.family_invites where code = c;
  if not found then raise exception 'invite_invalid'; end if;
  select * into f from public.families where id = ifam for update;   -- une seule inscription à la fois par famille
  select * into i from public.family_invites where code = c and family_id = ifam for update;
  if not found then raise exception 'invite_invalid'; end if;          -- remplacée entre-temps par un nouveau lien
  if exists (select 1 from public.family_members where user_id = me and family_id = f.id) then
    return jsonb_build_object('ok', true, 'already', true, 'family_id', f.id);
  end if;
  if i.used_by is not null then raise exception 'invite_used'; end if;
  if i.expires_at <= now() then raise exception 'invite_expired'; end if;
  if f.owner_id = me then raise exception 'is_owner'; end if;
  -- une famille inactive (abonnement du titulaire terminé) ne compte pas
  if exists (select 1 from public.family_members m where m.user_id = me and public.family_until(m.family_id) is not null)
     or exists (select 1 from public.families o where o.owner_id = me and public.family_until(o.id) is not null) then raise exception 'already_member'; end if;
  if public.family_until(f.id) is null then raise exception 'family_inactive'; end if;
  select count(*) + 1 into used from public.family_members where family_id = f.id;
  if used >= f.seats then raise exception 'family_full'; end if;
  delete from public.family_members where user_id = me;   -- l'ancienne famille inactive (une seule famille par personne)
  insert into public.family_members (family_id, user_id) values (f.id, me);
  update public.family_invites set used_by = me, used_at = now() where code = c;
  select p.name into oname from public.profiles p where p.id = f.owner_id;
  return jsonb_build_object('ok', true, 'family_id', f.id, 'owner', oname, 'used', used + 1, 'seats', f.seats);
end $$;

-- un membre quitte la famille
create or replace function public.family_leave()
returns jsonb language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid();
begin
  if me is null then raise exception 'not_signed_in'; end if;
  if exists (select 1 from public.families where owner_id = me) and not exists (select 1 from public.family_members where user_id = me) then raise exception 'is_owner'; end if;
  delete from public.family_members where user_id = me;
  if not found then raise exception 'not_member'; end if;
  return jsonb_build_object('ok', true);
end $$;

-- le titulaire retire un membre
create or replace function public.family_remove(p_user uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); fid uuid;
begin
  if me is null then raise exception 'not_signed_in'; end if;
  select id into fid from public.families where owner_id = me;
  if fid is null then raise exception 'not_owner'; end if;
  delete from public.family_members where family_id = fid and user_id = p_user;
  if not found then raise exception 'not_member'; end if;
  return jsonb_build_object('ok', true);
end $$;

do $g$ declare f text; begin
  foreach f in array array['public.family_status()','public.family_invite()','public.family_invite_info(text)','public.family_join(text)','public.family_leave()','public.family_remove(uuid)'] loop
    execute format('revoke all on function %s from public, anon', f);
    execute format('grant execute on function %s to authenticated', f);
  end loop;
end $g$;

-- ---------- 5. écriture des abonnements (fonctions Edge stripe et revenuecat, clé service seulement) ----------
-- p : {user_id?, store, store_id, product, plan, status, period_end?, trial_end?, customer_id?, cancel_at_period_end?, amount_cents?, currency?, billing?, event_at?}
-- user_id peut manquer pour une mise à jour (on retrouve la ligne par store + store_id). Crée la famille pour un abonnement Famille.
-- Apple : un user_id fourni réattribue la ligne (achats restaurés / transférés sur un autre compte).
-- event_at (RevenueCat event_timestamp_ms) : un événement plus ancien que le dernier appliqué est ignoré ({status:'ignored'}) ;
-- sans event_at (Stripe, qui relit l'abonnement à chaque fois) : toujours appliqué.
create or replace function public.sub_apply(p jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare uid uuid; sid bigint; pl text := p ->> 'plan'; st text := p ->> 'status'; fid uuid; ev timestamptz := nullif(p ->> 'event_at', '')::timestamptz;
begin
  if coalesce(p ->> 'store', '') not in ('stripe','apple','manual') or coalesce(p ->> 'store_id', '') = '' then raise exception 'bad store'; end if;
  uid := nullif(p ->> 'user_id', '')::uuid;
  if uid is null then select user_id into uid from public.subscriptions where store = p ->> 'store' and store_id = p ->> 'store_id'; end if;
  if uid is null then raise exception 'unknown user'; end if;
  if not exists (select 1 from auth.users where id = uid) then raise exception 'unknown user'; end if;
  insert into public.subscriptions as s (user_id, store, product, plan, status, period_end, trial_end, store_id, customer_id, cancel_at_period_end, amount_cents, currency, billing, last_event_at)
  values (uid, p ->> 'store', coalesce(p ->> 'product', pl), pl, st, nullif(p ->> 'period_end', '')::timestamptz, nullif(p ->> 'trial_end', '')::timestamptz,
          p ->> 'store_id', nullif(p ->> 'customer_id', ''), coalesce((p ->> 'cancel_at_period_end')::boolean, false),
          nullif(p ->> 'amount_cents', '')::integer, nullif(lower(p ->> 'currency'), ''), nullif(p ->> 'billing', ''), ev)
  on conflict (store, store_id) do update set
    user_id = case when s.store = 'apple' then coalesce(nullif(p ->> 'user_id', '')::uuid, s.user_id) else s.user_id end,
    last_event_at = coalesce(excluded.last_event_at, s.last_event_at),
    product = coalesce(excluded.product, s.product), plan = coalesce(excluded.plan, s.plan), status = coalesce(excluded.status, s.status),
    period_end = coalesce(excluded.period_end, s.period_end), trial_end = coalesce(excluded.trial_end, s.trial_end),
    customer_id = coalesce(excluded.customer_id, s.customer_id), cancel_at_period_end = excluded.cancel_at_period_end,
    amount_cents = coalesce(excluded.amount_cents, s.amount_cents), currency = coalesce(excluded.currency, s.currency),
    billing = coalesce(excluded.billing, s.billing), updated_at = now()
  where excluded.last_event_at is null or s.last_event_at is null or excluded.last_event_at >= s.last_event_at
  returning id, plan, user_id into sid, pl, uid;
  if sid is null then  -- événement plus ancien que le dernier appliqué (RevenueCat ne garantit pas l'ordre)
    return jsonb_build_object('ok', true, 'status', 'ignored', 'reason', 'stale');
  end if;
  -- abonnement réattribué à un autre compte : l'ancienne famille n'est plus portée par cette ligne
  update public.families set sub_id = null where sub_id = sid and owner_id <> uid;
  if pl = 'family' then
    insert into public.families (owner_id, sub_id) values (uid, sid) on conflict (owner_id) do update set sub_id = excluded.sub_id returning id into fid;
    -- le titulaire était membre d'une autre famille : il la quitte (une seule famille par personne)
    delete from public.family_members where user_id = uid;
  end if;
  return jsonb_build_object('ok', true, 'id', sid, 'user_id', uid, 'family_id', fid);
end $$;
revoke all on function public.sub_apply(jsonb) from public, anon, authenticated;
grant execute on function public.sub_apply(jsonb) to service_role;

-- RevenueCat TRANSFER : les achats Apple passent d'un compte à un autre (même identifiant Apple sur un autre compte).
-- p : {to (uuid), from: [uuid…], store_id?, event_at?} ; store_id donné = cette transaction seulement, sinon toutes les lignes
-- Apple des comptes « from ». Chaque ligne passe par sub_apply (même règle d'ordre des événements, familles).
create or replace function public.sub_transfer(p jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare dst uuid := nullif(p ->> 'to', '')::uuid; src uuid[]; sid text := nullif(p ->> 'store_id', ''); r public.subscriptions; n int := 0; o jsonb;
begin
  if dst is null or not exists (select 1 from auth.users where id = dst) then raise exception 'unknown user'; end if;
  select coalesce(array_agg(x::uuid), '{}') into src from jsonb_array_elements_text(coalesce(p -> 'from', '[]'::jsonb)) x
    where x ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';
  for r in select * from public.subscriptions s where s.store = 'apple' and s.user_id <> dst
             and ((sid is not null and s.store_id = sid) or (sid is null and s.user_id = any(src))) order by s.id loop
    o := public.sub_apply(jsonb_build_object('user_id', dst, 'store', 'apple', 'store_id', r.store_id, 'product', r.product, 'plan', r.plan,
           'status', r.status, 'cancel_at_period_end', r.cancel_at_period_end, 'event_at', p ->> 'event_at'));
    if o ->> 'status' is distinct from 'ignored' then n := n + 1; end if;
  end loop;
  return jsonb_build_object('ok', true, 'moved', n, 'to', dst);
end $$;
revoke all on function public.sub_transfer(jsonb) from public, anon, authenticated;
grant execute on function public.sub_transfer(jsonb) to service_role;

-- client Stripe d'un joueur (portail « Gérer mon abonnement »)
create or replace function public.sub_customer(p_user uuid)
returns text language sql stable security definer set search_path = public as $$
  select customer_id from public.subscriptions where user_id = p_user and store = 'stripe' and customer_id is not null order by updated_at desc limit 1
$$;
revoke all on function public.sub_customer(uuid) from public, anon, authenticated;
grant execute on function public.sub_customer(uuid) to service_role;

-- ---------- 6. back office : écran Paiements (admin_guard de 2026-10-25_admin.sql) ----------
-- revenus mensuels estimés (MRR) : mensuels + annuels / 12, abonnements payants en cours (essais exclus)
create or replace function public.admin_pay()
returns jsonb language plpgsql stable security definer set search_path = public as $$
begin
  perform public.admin_guard('lecture');
  return jsonb_build_object(
    'by_product', (select coalesce(jsonb_object_agg(product, n), '{}'::jsonb) from (select s.product, count(*) n from public.subscriptions s where public.sub_live(s) group by 1) x),
    'by_plan', (select coalesce(jsonb_object_agg(plan, n), '{}'::jsonb) from (select s.plan, count(*) n from public.subscriptions s where public.sub_live(s) group by 1) x),
    'by_store', (select coalesce(jsonb_object_agg(store, n), '{}'::jsonb) from (select s.store, count(*) n from public.subscriptions s where public.sub_live(s) group by 1) x),
    'active', (select count(*) from public.subscriptions s where public.sub_live(s) and s.status <> 'trialing'),
    'trials', (select count(*) from public.subscriptions s where public.sub_live(s) and s.status = 'trialing'),
    'past_due', (select count(*) from public.subscriptions s where public.sub_live(s) and s.status = 'past_due'),
    'canceling', (select count(*) from public.subscriptions s where public.sub_live(s) and s.cancel_at_period_end),
    'churn_30', (select count(*) from public.subscriptions s where s.status in ('canceled','expired','refunded') and s.updated_at > now() - interval '30 days'),
    'new_30', (select count(*) from public.subscriptions s where s.created_at > now() - interval '30 days'),
    'mrr_cents', (select coalesce(round(sum(case s.billing when 'month' then s.amount_cents when 'year' then s.amount_cents / 12.0 else 0 end)), 0)
                  from public.subscriptions s where public.sub_live(s) and s.status <> 'trialing'),
    'currency', coalesce((select s.currency from public.subscriptions s where s.currency is not null order by s.updated_at desc limit 1), 'eur'),
    'families', (select jsonb_build_object('n', count(*), 'active', count(*) filter (where public.family_until(f.id) is not null),
                   'members', (select count(*) from public.family_members), 'seats', coalesce(sum(f.seats), 0)) from public.families f),
    'grants', (select count(*) from public.prem_grants where until > now()),
    'recent', (select coalesce(jsonb_agg(r order by r ->> 'updated_at' desc), '[]'::jsonb) from (
        select jsonb_build_object('user_id', s.user_id, 'name', p.name, 'store', s.store, 'product', s.product, 'plan', s.plan, 'status', s.status,
          'period_end', s.period_end, 'cancel', s.cancel_at_period_end, 'amount_cents', s.amount_cents, 'billing', s.billing, 'updated_at', s.updated_at) r
        from public.subscriptions s left join public.profiles p on p.id = s.user_id order by s.updated_at desc limit 30) x));
end $$;

-- la famille d'un joueur (titulaire ou membre), avec l'abonnement qui la porte
create or replace function public.admin_family(p_user uuid)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare fid uuid; f public.families;
begin
  perform public.admin_guard('lecture');
  fid := public.family_of_user(p_user);
  if fid is null then return jsonb_build_object('family', null,
    'subs', (select coalesce(jsonb_agg(to_jsonb(s) - 'customer_id' order by s.updated_at desc), '[]'::jsonb) from public.subscriptions s where s.user_id = p_user)); end if;
  select * into f from public.families where id = fid;
  return jsonb_build_object(
    'family', jsonb_build_object('id', f.id, 'seats', f.seats, 'created_at', f.created_at, 'until', public.family_until(fid),
      'owner', (select jsonb_build_object('user_id', f.owner_id, 'name', p.name) from (select 1) one left join public.profiles p on p.id = f.owner_id),
      'members', (select coalesce(jsonb_agg(jsonb_build_object('user_id', m.user_id, 'name', p.name, 'joined_at', m.joined_at) order by m.joined_at), '[]'::jsonb)
                  from public.family_members m left join public.profiles p on p.id = m.user_id where m.family_id = fid),
      'invites', (select count(*) from public.family_invites i where i.family_id = fid and i.used_by is null and i.expires_at > now())),
    'subs', (select coalesce(jsonb_agg(to_jsonb(s) - 'customer_id' order by s.updated_at desc), '[]'::jsonb) from public.subscriptions s where s.user_id in (p_user, f.owner_id)));
end $$;

-- le support retire un membre d'une famille (aide quand quelqu'un s'est trompé de lien)
create or replace function public.admin_family_remove(p_user uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
begin
  perform public.admin_guard('support');
  delete from public.family_members where user_id = p_user;
  if not found then raise exception 'not_member'; end if;
  perform public.admin_write_log('family.remove', p_user::text, '{}'::jsonb);
  return jsonb_build_object('ok', true);
end $$;

do $g$ declare f text; begin
  foreach f in array array['public.admin_pay()','public.admin_family(uuid)','public.admin_family_remove(uuid)'] loop
    execute format('revoke all on function %s from public, anon', f);
    execute format('grant execute on function %s to authenticated', f);
  end loop;
end $g$;

-- ---------- 7. pour tester sans magasin (facultatif, à lancer à la main dans le SQL Editor) ----------
-- Donner un abonnement Famille de test à ton compte (remplace TON_EMAIL), puis l'enlever :
--   select public.sub_apply(jsonb_build_object('user_id', (select id from auth.users where email = 'TON_EMAIL'), 'store', 'manual',
--     'store_id', 'test-family', 'product', 'family_year', 'plan', 'family', 'status', 'active', 'period_end', now() + interval '30 days',
--     'amount_cents', 19900, 'currency', 'eur', 'billing', 'year'));
--   update public.subscriptions set status = 'expired' where store = 'manual' and store_id = 'test-family';
