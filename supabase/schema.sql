-- Piano Challenges: run this once in Supabase > SQL Editor > New query > Run.
-- profiles: public leaderboard (name, character, XP...). progress: each player's saved progress, private.

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null default 'Player' check (char_length(name) between 1 and 24),
  avatar smallint not null default 0 check (avatar between 0 and 9),
  xp integer not null default 0 check (xp >= 0),
  level integer not null default 1,
  streak integer not null default 0,
  solved integer not null default 0,
  photo text,
  updated_at timestamptz not null default now()
);
alter table public.profiles add column if not exists photo text; -- bases créées avant l'ajout de la photo Google
-- pseudo propre (migration 2026-10-21_profiles_name_check.sql) : 2 à 24 caractères après btrim, pas de caractères de
-- contrôle ni de direction du texte (bidi). NOT VALID : les lignes existantes ne sont pas revérifiées.
alter table public.profiles drop constraint if exists profiles_name_clean;
alter table public.profiles add constraint profiles_name_clean check (
  char_length(btrim(name)) between 2 and 24
  and name !~ U&'[\0001-\001F\007F\200E\200F\202A-\202E\2066-\2069]'
) not valid;

create table if not exists public.progress (
  user_id uuid primary key references auth.users(id) on delete cascade,
  data jsonb not null,
  updated_at timestamptz not null default now()
);

create index if not exists profiles_xp_idx on public.profiles (xp desc);

alter table public.profiles enable row level security;
alter table public.progress enable row level security;

drop policy if exists "profiles are public" on public.profiles;
drop policy if exists "insert own profile" on public.profiles;
drop policy if exists "update own profile" on public.profiles;
create policy "profiles are public" on public.profiles for select using (true);
create policy "insert own profile" on public.profiles for insert with check (auth.uid() = id);
create policy "update own profile" on public.profiles for update using (auth.uid() = id) with check (auth.uid() = id);

drop policy if exists "read own progress" on public.progress;
drop policy if exists "insert own progress" on public.progress;
drop policy if exists "update own progress" on public.progress;
create policy "read own progress" on public.progress for select using (auth.uid() = user_id);
create policy "insert own progress" on public.progress for insert with check (auth.uid() = user_id);
create policy "update own progress" on public.progress for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

grant select on public.profiles to anon, authenticated;
grant insert, update on public.profiles to authenticated;
grant select, insert, update on public.progress to authenticated;

-- xp_log: XP earned per player and per day, for the day / week / month / year leaderboards.
create table if not exists public.xp_log (
  user_id uuid not null references auth.users(id) on delete cascade,
  day date not null,
  xp integer not null default 0 check (xp >= 0 and xp < 100000),
  primary key (user_id, day)
);
alter table public.xp_log enable row level security;
drop policy if exists "xp_log own select" on public.xp_log;
drop policy if exists "xp_log own insert" on public.xp_log;
drop policy if exists "xp_log own update" on public.xp_log;
create policy "xp_log own select" on public.xp_log for select using (auth.uid() = user_id);
create policy "xp_log own insert" on public.xp_log for insert with check (auth.uid() = user_id);
create policy "xp_log own update" on public.xp_log for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
grant select, insert, update on public.xp_log to authenticated;

-- leaderboard(since): top 50 players by XP earned since a date (called by the app with sb.rpc).
create or replace function public.leaderboard(since date)
returns table (id uuid, name text, avatar int, photo text, level int, streak int, xp bigint)
language sql stable security definer set search_path = public as $$
  select p.id, p.name, p.avatar::int, p.photo, p.level::int, p.streak::int, sum(l.xp)::bigint as xp
  from public.xp_log l join public.profiles p on p.id = l.user_id
  where l.day >= since and l.xp > 0
  group by p.id
  order by xp desc
  limit 50
$$;
revoke all on function public.leaderboard(date) from public;
grant execute on function public.leaderboard(date) to anon, authenticated;

-- my_rank(since): the caller's own rank and XP, for players outside the top 50 (migration 2026-10-21_my_rank.sql).
create or replace function public.my_rank(since date default null)
returns table (rank bigint, xp bigint)
language plpgsql stable security definer set search_path = public as $$
declare uid uuid := auth.uid(); mine bigint;
begin
  if uid is null then return; end if;
  if since is null then
    select p.xp::bigint into mine from public.profiles p where p.id = uid;
    if mine is null or mine <= 0 then return; end if;
    return query select (1 + count(*))::bigint, mine from public.profiles p where p.xp > mine;
  else
    select sum(l.xp)::bigint into mine from public.xp_log l where l.user_id = uid and l.day >= since and l.xp > 0;
    if mine is null or mine <= 0 then return; end if;
    return query
      select (1 + count(*))::bigint, mine
      from (select l.user_id from public.xp_log l join public.profiles p on p.id = l.user_id
            where l.day >= since and l.xp > 0 group by l.user_id having sum(l.xp) > mine) s;
  end if;
end $$;
revoke all on function public.my_rank(date) from public;
grant execute on function public.my_rank(date) to authenticated;

-- =====================================================================================
-- Migration 2026-10-20 (audit #12, #37) — À EXÉCUTER PAR ANTOINE dans Supabase > SQL Editor > New query > Run.
-- Idempotente : peut être relancée sans risque. Tant qu'elle n'est pas appliquée, l'app retombe sur l'ancien
-- upsert direct de xp_log (compatibilité assurée côté client dans cloudPushNow).
-- Contenu :
--   1. profiles.photo (photo Google), déjà utilisée par leaderboard() mais absente du schéma (#37)
--   2. xp_log : policies recréées proprement (drop policy if exists) + grant manquant (#37)
--   3. add_xp(delta, day, streak, solved) : seule voie pour créditer de l'XP, plafond 3000 XP/jour,
--      recalcule profiles.xp = somme de xp_log et profiles.level avec la formule de l'app
--   4. trigger profiles_guard : un client (rôle authenticated) ne peut plus écrire xp/level/streak/solved
--      directement dans profiles ; seule add_xp (security definer) le fait
--   5. reprise : l'XP déjà acquise avant xp_log est reportée une fois sur un jour sentinelle (2000-01-01)
-- =====================================================================================

-- 1. photo
alter table public.profiles add column if not exists photo text;

-- 2. xp_log : policies idempotentes + droits
drop policy if exists "xp_log own select" on public.xp_log;
drop policy if exists "xp_log own insert" on public.xp_log;
drop policy if exists "xp_log own update" on public.xp_log;
create policy "xp_log own select" on public.xp_log for select using (auth.uid() = user_id);
create policy "xp_log own insert" on public.xp_log for insert with check (auth.uid() = user_id);
create policy "xp_log own update" on public.xp_log for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
grant select, insert, update on public.xp_log to authenticated;

-- 3. niveau à partir de l'XP (même formule que levelInfo() dans l'app : 100 XP, puis +40 par niveau)
create or replace function public.level_for_xp(xp integer)
returns integer language plpgsql immutable as $$
declare l integer := 1; base integer := 0; need integer := 100;
begin
  while xp >= base + need loop
    base := base + need; l := l + 1; need := 100 + (l - 1) * 40;
  end loop;
  return l;
end $$;

-- add_xp : crédite delta XP au jour donné pour l'utilisateur connecté (plafond 3000 XP / jour),
-- met à jour streak / solved si fournis, puis recalcule profiles.xp et profiles.level.
-- Appelée par l'app : sb.rpc('add_xp', {delta, day, streak, solved}). Retourne l'XP total du profil.
create or replace function public.add_xp(delta integer, day date, streak integer default null, solved integer default null)
returns integer
language plpgsql security definer set search_path = public as $$
#variable_conflict use_column
declare
  uid uuid := auth.uid(); total integer;
  v_delta integer := delta; v_day date := day; v_streak integer := streak; v_solved integer := solved; -- copies locales : pas d'ambiguïté avec les colonnes
begin
  if uid is null then raise exception 'not signed in'; end if;
  if v_delta is null or v_delta < 0 or v_delta > 3000 then raise exception 'bad delta'; end if;
  if v_day is null or v_day > current_date + 1 or v_day < current_date - 30 then raise exception 'bad day'; end if;
  if v_delta > 0 then
    insert into public.xp_log as l (user_id, day, xp) values (uid, v_day, least(3000, v_delta))
    on conflict (user_id, day) do update set xp = least(3000, l.xp + excluded.xp);
  end if;
  select coalesce(sum(l.xp), 0)::integer into total from public.xp_log l where l.user_id = uid;
  insert into public.profiles as p (id, xp, level, streak, solved, updated_at)
  values (uid, total, public.level_for_xp(total), greatest(0, coalesce(v_streak, 0)), greatest(0, coalesce(v_solved, 0)), now())
  on conflict (id) do update set
    xp = total, level = public.level_for_xp(total),
    streak = greatest(0, coalesce(v_streak, p.streak)),
    solved = greatest(0, coalesce(v_solved, p.solved)),
    updated_at = now();
  return total;
end $$;
revoke all on function public.add_xp(integer, date, integer, integer) from public;
grant execute on function public.add_xp(integer, date, integer, integer) to authenticated;

-- 4. garde-fou : les colonnes de score de profiles ne sont modifiables que par add_xp (qui s'exécute
--    avec les droits de son propriétaire, donc current_user <> 'authenticated')
create or replace function public.profiles_guard()
returns trigger language plpgsql as $$
begin
  if current_user = 'authenticated' then
    if tg_op = 'UPDATE' then
      new.xp := old.xp; new.level := old.level; new.streak := old.streak; new.solved := old.solved;
    else
      new.xp := 0; new.level := 1; new.streak := 0; new.solved := 0;
    end if;
  end if;
  return new;
end $$;
drop trigger if exists profiles_guard on public.profiles;
create trigger profiles_guard before insert or update on public.profiles
  for each row execute function public.profiles_guard();

-- 5. reprise de l'existant : l'XP acquise avant la tenue de xp_log est reportée sur un jour sentinelle,
--    pour que profiles.xp = somme(xp_log) ne fasse perdre d'XP à personne (une seule fois).
insert into public.xp_log (user_id, day, xp)
select p.id, date '2000-01-01', least(99999, p.xp - coalesce(s.total, 0))
from public.profiles p
left join (select user_id, sum(xp) as total from public.xp_log group by user_id) s on s.user_id = p.id
where p.xp > coalesce(s.total, 0)
  and not exists (select 1 from public.xp_log l where l.user_id = p.id and l.day = date '2000-01-01');

-- ===== Notifications (voir aussi supabase/notifications.sql et supabase/functions/notify) =====

-- 1. notifications écrites par le serveur (fonction notify, avec la clé service_role), lues par leur destinataire
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check (kind in ('recap','streak','daily','news','rank','duel','welcome','lvl','elo','unlock')),
  cat text not null default 'news' check (cat in ('social','progress','remind','news')),
  title text not null check (char_length(title) <= 120),
  body text not null default '' check (char_length(body) <= 300),
  action text check (action is null or action ~ '^(daily|rank|learn|free|progress|hub|game:(runner|speed|memory))$'),
  created_at timestamptz not null default now()
);
create index if not exists notifications_user_idx on public.notifications (user_id, created_at desc);
alter table public.notifications enable row level security;
drop policy if exists "notifications own select" on public.notifications;
create policy "notifications own select" on public.notifications for select using (auth.uid() = user_id);
grant select on public.notifications to authenticated;

-- 2. préférences e-mail de chaque compte (réglées dans l'app) ; le jeton sert aux liens de désinscription
create table if not exists public.notif_prefs (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email_weekly boolean not null default true,
  email_streak boolean not null default true,
  email_social boolean not null default true,
  email_news boolean not null default false,
  lang text not null default 'fr' check (lang in ('fr','en')),
  unsub_token uuid not null default gen_random_uuid(),
  welcome_sent_at timestamptz,
  last_streak_mail date,
  last_weekly_mail date,
  updated_at timestamptz not null default now()
);
alter table public.notif_prefs enable row level security;
drop policy if exists "notif_prefs own select" on public.notif_prefs;
drop policy if exists "notif_prefs own insert" on public.notif_prefs;
drop policy if exists "notif_prefs own update" on public.notif_prefs;
create policy "notif_prefs own select" on public.notif_prefs for select using (auth.uid() = user_id);
create policy "notif_prefs own insert" on public.notif_prefs for insert with check (auth.uid() = user_id);
create policy "notif_prefs own update" on public.notif_prefs for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
-- l'app ne peut écrire que les choix (pas les dates d'envoi ni le jeton)
revoke all on public.notif_prefs from anon, authenticated;
grant select (user_id, email_weekly, email_streak, email_social, email_news, lang, updated_at) on public.notif_prefs to authenticated;
grant insert (user_id, email_weekly, email_streak, email_social, email_news, lang, updated_at) on public.notif_prefs to authenticated;
-- user_id is in the update list because the app upserts (ON CONFLICT … DO UPDATE sets every sent column); RLS still limits it to the own row
grant update (user_id, email_weekly, email_streak, email_social, email_news, lang, updated_at) on public.notif_prefs to authenticated;
create index if not exists notif_prefs_unsub_idx on public.notif_prefs (unsub_token);

-- 3. envois planifiés (pg_cron + pg_net) vers la fonction notify.
--    Avant : créer le secret partagé dans le coffre (Antoine le tape, il ne va pas dans le dépôt) :
--      select vault.create_secret('<une longue chaîne au hasard>', 'notify_secret');
--    et le même dans Edge Functions > Secrets sous le nom NOTIFY_SECRET (avec RESEND_API_KEY).
create extension if not exists pg_cron;
create extension if not exists pg_net;
create or replace function public.notify_call(job text)
returns void language sql security definer set search_path = public as $$
  select net.http_post(
    url := 'https://ijdxeasxmgevuchyuenn.supabase.co/functions/v1/notify',
    headers := jsonb_build_object('Content-Type','application/json',
      'x-notify-secret', coalesce((select decrypted_secret from vault.decrypted_secrets where name = 'notify_secret'), '')),
    body := jsonb_build_object('job', job),
    timeout_milliseconds := 150000);
$$;
revoke all on function public.notify_call(text) from public, anon, authenticated;
-- heures en UTC : 17 h UTC = 19 h à Paris en été, 18 h en hiver
select cron.unschedule(jobname) from cron.job where jobname in ('pc-welcome','pc-streak','pc-weekly');
-- the welcome job runs at :15 and :45 so it never sends at the same time as the other two (Resend: 2 requests a second)
select cron.schedule('pc-welcome', '15,45 * * * *', $$ select public.notify_call('welcome') $$);
select cron.schedule('pc-streak',  '0 17 * * *',  $$ select public.notify_call('streak') $$);
select cron.schedule('pc-weekly',  '0 16 * * 0',  $$ select public.notify_call('weekly') $$);

-- ===== Back office et mesure d'usage (migration 2026-10-25_admin.sql, recopiée ici) =====
-- =====================================================================================
-- Migration 2026-10-25 : back office (/admin) et mesure d'usage — À EXÉCUTER PAR ANTOINE dans
-- Supabase > SQL Editor > New query > Run. Idempotente : peut être relancée sans risque.
-- Prérequis : schema.sql (profiles, progress, xp_log, notifications, notif_prefs). Les ligues
-- (2026-10-24_leagues.sql) sont facultatives : le back office les détecte.
-- Recopiée en fin de schema.sql.
--
-- Principe de sécurité
--   - Un compte n'est administrateur que s'il est dans public.admins ET que sa session a passé la double
--     authentification (jeton aal2 = mot de passe + code TOTP). is_admin(rôle) le vérifie à chaque appel.
--   - Rôles : owner (tout) > support (joueurs, support, notifications à un joueur) > lecture (statistiques).
--   - Les tables nouvelles ont RLS sans policy d'écriture : rien n'y est lisible ni modifiable directement
--     depuis l'app. Tout passe par des fonctions security definer : track_events / send_feedback /
--     log_errors (l'app, avec des contrôles de taille) et admin_* (le back office, après is_admin).
--   - admin_log : journal en ajout seul (un déclencheur refuse UPDATE et DELETE, même pour le propriétaire).
--   - Suppression de compte, suspension et notification à tous passent par la fonction Edge « admin »
--     (supabase/functions/admin), qui revérifie le jeton et utilise la clé service côté serveur.
--   - Aucune adresse IP n'est enregistrée. Événements conservés 13 mois, erreurs 90 jours.
-- =====================================================================================

-- ---------- 1. administrateurs et journal ----------
create table if not exists public.admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'lecture' check (role in ('owner','support','lecture')),
  created_at timestamptz not null default now()
);
alter table public.admins enable row level security;
revoke all on public.admins from anon, authenticated;

create table if not exists public.admin_log (
  id bigserial primary key,
  at timestamptz not null default now(),
  admin_id uuid,                                  -- pas de clé étrangère : le journal survit à la suppression d'un compte
  admin_email text,
  action text not null check (char_length(action) between 1 and 60),
  target text check (target is null or char_length(target) <= 120),
  detail jsonb not null default '{}'::jsonb check (pg_column_size(detail) <= 8192)
);
create index if not exists admin_log_at_idx on public.admin_log (at desc);
alter table public.admin_log enable row level security;
revoke all on public.admin_log from anon, authenticated;

create or replace function public.admin_log_frozen()
returns trigger language plpgsql as $$
begin raise exception 'admin_log is append-only'; end $$;
drop trigger if exists admin_log_frozen on public.admin_log;
create trigger admin_log_frozen before update or delete on public.admin_log
  for each row execute function public.admin_log_frozen();
-- TRUNCATE aussi
drop trigger if exists admin_log_frozen_t on public.admin_log;
create trigger admin_log_frozen_t before truncate on public.admin_log
  for each statement execute function public.admin_log_frozen();

create or replace function public.admin_rank(r text)
returns integer language sql immutable as $$
  select case r when 'owner' then 3 when 'support' then 2 when 'lecture' then 1 else 0 end
$$;

-- vrai si l'appelant est administrateur avec au moins ce rôle ET si sa session est en aal2 (code TOTP vérifié)
create or replace function public.is_admin(min_role text default 'lecture')
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce(auth.jwt() ->> 'aal', '') = 'aal2'
     and exists (select 1 from public.admins a
                 where a.user_id = auth.uid() and public.admin_rank(a.role) >= public.admin_rank(min_role))
$$;
revoke all on function public.is_admin(text) from public, anon;
grant execute on function public.is_admin(text) to authenticated;

create or replace function public.admin_guard(min_role text default 'lecture')
returns void language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_admin(min_role) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
end $$;
revoke all on function public.admin_guard(text) from public, anon, authenticated;

create or replace function public.admin_write_log(p_action text, p_target text, p_detail jsonb default '{}'::jsonb)
returns void language sql security definer set search_path = public as $$
  insert into public.admin_log (admin_id, admin_email, action, target, detail)
  values (auth.uid(), (select u.email from auth.users u where u.id = auth.uid()), left(p_action, 60), left(p_target, 120), coalesce(p_detail, '{}'::jsonb));
$$;
revoke all on function public.admin_write_log(text, text, jsonb) from public, anon, authenticated;

-- ---------- 2. mesure d'usage (événements envoyés par l'app) ----------
create table if not exists public.events (
  id bigserial primary key,
  at timestamptz not null default now(),
  anon_id text not null check (anon_id ~ '^[A-Za-z0-9_-]{8,40}$'),  -- identifiant aléatoire de l'appareil, sans lien avec l'identité
  user_id uuid references auth.users(id) on delete cascade,          -- rempli seulement pour un compte connecté
  name text not null check (name ~ '^[a-z][a-z0-9_]{1,31}$'),
  props jsonb not null default '{}'::jsonb check (jsonb_typeof(props) = 'object' and pg_column_size(props) <= 2048),
  lang text check (lang is null or lang in ('fr','en')),
  dev text check (dev is null or dev in ('phone','tablet','desktop')),
  plat text check (plat is null or plat in ('web','ios')),
  inp text check (inp is null or inp in ('midi','mic','screen','none')),
  ver text check (ver is null or char_length(ver) <= 24)
);
create index if not exists events_at_idx on public.events (at);
create index if not exists events_name_at_idx on public.events (name, at);
create index if not exists events_anon_idx on public.events (anon_id, at);
create index if not exists events_user_idx on public.events (user_id) where user_id is not null;
alter table public.events enable row level security;
revoke all on public.events from anon, authenticated;

-- l'app envoie ses événements par lots : sb.rpc / POST /rest/v1/rpc/track_events {p_anon, p_evts:[{n,t,p,l,d,s,i,v}]}
create or replace function public.track_events(p_anon text, p_evts jsonb)
returns integer language plpgsql security definer set search_path = public as $$
declare e jsonb; n integer := 0; ts timestamptz; nm text; pr jsonb; recent integer;
begin
  if p_anon is null or p_anon !~ '^[A-Za-z0-9_-]{8,40}$' then return 0; end if;
  if p_evts is null or jsonb_typeof(p_evts) <> 'array' or jsonb_array_length(p_evts) = 0 then return 0; end if;
  if jsonb_array_length(p_evts) > 50 or pg_column_size(p_evts) > 65536 then return 0; end if;
  -- frein : 600 événements par appareil et par heure au plus
  select count(*) into recent from public.events where anon_id = p_anon and at > now() - interval '1 hour';
  if recent >= 600 then return 0; end if;
  for e in select * from jsonb_array_elements(p_evts) loop
    continue when jsonb_typeof(e) <> 'object';
    nm := e ->> 'n';
    continue when nm is null or nm !~ '^[a-z][a-z0-9_]{1,31}$';
    pr := case when jsonb_typeof(e -> 'p') = 'object' and pg_column_size(e -> 'p') <= 2048 then e -> 'p' else '{}'::jsonb end;
    begin ts := to_timestamp((e ->> 't')::double precision / 1000); exception when others then ts := now(); end;
    if ts is null or ts > now() + interval '5 minutes' or ts < now() - interval '3 days' then ts := now(); end if;
    insert into public.events (at, anon_id, user_id, name, props, lang, dev, plat, inp, ver)
    values (ts, p_anon, auth.uid(), nm, pr,
      case when e ->> 'l' in ('fr','en') then e ->> 'l' end,
      case when e ->> 'd' in ('phone','tablet','desktop') then e ->> 'd' end,
      case when e ->> 's' in ('web','ios') then e ->> 's' end,
      case when e ->> 'i' in ('midi','mic','screen','none') then e ->> 'i' end,
      left(e ->> 'v', 24));
    n := n + 1;
  end loop;
  return n;
end $$;
revoke all on function public.track_events(text, jsonb) from public;
grant execute on function public.track_events(text, jsonb) to anon, authenticated;

-- ---------- 3. réglages à distance ----------
create table if not exists public.app_config (
  key text primary key check (key ~ '^[a-z][a-z0-9_]{1,31}$'),
  value jsonb not null check (pg_column_size(value) <= 32768),
  updated_at timestamptz not null default now(),
  updated_by uuid
);
alter table public.app_config enable row level security;
drop policy if exists "app_config public read" on public.app_config;
create policy "app_config public read" on public.app_config for select using (true);
revoke all on public.app_config from anon, authenticated;
grant select (key, value, updated_at) on public.app_config to anon, authenticated;

-- ---------- 4. support : « Signaler un problème » ----------
create table if not exists public.feedback (
  id bigserial primary key,
  at timestamptz not null default now(),
  anon_id text check (anon_id is null or anon_id ~ '^[A-Za-z0-9_-]{8,40}$'),
  user_id uuid references auth.users(id) on delete cascade,
  kind text not null default 'bug' check (kind in ('bug','idea','other')),
  msg text not null check (char_length(msg) between 3 and 2000),
  contact text check (contact is null or char_length(contact) <= 120),
  ctx jsonb not null default '{}'::jsonb check (jsonb_typeof(ctx) = 'object' and pg_column_size(ctx) <= 2048),
  status text not null default 'new' check (status in ('new','seen','done')),
  note text check (note is null or char_length(note) <= 1000)
);
create index if not exists feedback_at_idx on public.feedback (at desc);
alter table public.feedback enable row level security;
revoke all on public.feedback from anon, authenticated;

create or replace function public.send_feedback(p_anon text, p_kind text, p_msg text, p_contact text default null, p_ctx jsonb default '{}'::jsonb)
returns boolean language plpgsql security definer set search_path = public as $$
declare recent integer; m text := btrim(coalesce(p_msg, ''));
begin
  if char_length(m) < 3 then return false; end if;
  if p_anon is not null and p_anon !~ '^[A-Za-z0-9_-]{8,40}$' then p_anon := null; end if;
  if p_anon is null and auth.uid() is null then return false; end if;
  select count(*) into recent from public.feedback f
   where f.at > now() - interval '1 hour' and (f.anon_id = p_anon or (auth.uid() is not null and f.user_id = auth.uid()));
  if recent >= 5 then return false; end if;
  insert into public.feedback (anon_id, user_id, kind, msg, contact, ctx)
  values (p_anon, auth.uid(), case when p_kind in ('bug','idea','other') then p_kind else 'other' end, left(m, 2000),
          nullif(left(btrim(coalesce(p_contact, '')), 120), ''),
          case when jsonb_typeof(p_ctx) = 'object' and pg_column_size(p_ctx) <= 2048 then p_ctx else '{}'::jsonb end);
  return true;
end $$;
revoke all on function public.send_feedback(text, text, text, text, jsonb) from public;
grant execute on function public.send_feedback(text, text, text, text, jsonb) to anon, authenticated;

-- ---------- 5. erreurs JavaScript remontées (échantillonnées par l'app) ----------
create table if not exists public.client_errors (
  id bigserial primary key,
  at timestamptz not null default now(),
  anon_id text check (anon_id is null or anon_id ~ '^[A-Za-z0-9_-]{8,40}$'),
  user_id uuid references auth.users(id) on delete cascade,
  msg text not null check (char_length(msg) <= 300),
  src text check (src is null or char_length(src) <= 200),
  line integer, col integer,
  stack text check (stack is null or char_length(stack) <= 1200),
  ver text check (ver is null or char_length(ver) <= 24),
  dev text check (dev is null or char_length(dev) <= 12),
  plat text check (plat is null or char_length(plat) <= 8),
  ua text check (ua is null or char_length(ua) <= 200)
);
create index if not exists client_errors_at_idx on public.client_errors (at desc);
alter table public.client_errors enable row level security;
revoke all on public.client_errors from anon, authenticated;

create or replace function public.log_errors(p_anon text, p_errs jsonb)
returns integer language plpgsql security definer set search_path = public as $$
declare e jsonb; n integer := 0; recent integer;
begin
  if p_anon is null or p_anon !~ '^[A-Za-z0-9_-]{8,40}$' then return 0; end if;
  if p_errs is null or jsonb_typeof(p_errs) <> 'array' or jsonb_array_length(p_errs) > 5 then return 0; end if;
  select count(*) into recent from public.client_errors where anon_id = p_anon and at > now() - interval '1 hour';
  if recent >= 30 then return 0; end if;
  for e in select * from jsonb_array_elements(p_errs) loop
    continue when jsonb_typeof(e) <> 'object' or coalesce(e ->> 'm', '') = '';
    insert into public.client_errors (anon_id, user_id, msg, src, line, col, stack, ver, dev, plat, ua)
    values (p_anon, auth.uid(), left(e ->> 'm', 300), left(e ->> 'f', 200),
      case when (e ->> 'l') ~ '^\d{1,7}$' then (e ->> 'l')::integer end,
      case when (e ->> 'c') ~ '^\d{1,7}$' then (e ->> 'c')::integer end,
      left(e ->> 'k', 1200), left(e ->> 'v', 24), left(e ->> 'd', 12), left(e ->> 's', 8), left(e ->> 'u', 200));
    n := n + 1;
  end loop;
  return n;
end $$;
revoke all on function public.log_errors(text, jsonb) from public;
grant execute on function public.log_errors(text, jsonb) to anon, authenticated;

-- ---------- 6. mois Premium offerts (lu par l'app avec my_premium()) ----------
create table if not exists public.prem_grants (
  user_id uuid primary key references auth.users(id) on delete cascade,
  until timestamptz not null,
  granted_by uuid,
  updated_at timestamptz not null default now()
);
alter table public.prem_grants enable row level security;
revoke all on public.prem_grants from anon, authenticated;

create or replace function public.my_premium()
returns timestamptz language sql stable security definer set search_path = public as $$
  select g.until from public.prem_grants g where g.user_id = auth.uid() and g.until > now()
$$;
revoke all on function public.my_premium() from public, anon;
grant execute on function public.my_premium() to authenticated;

-- ---------- 7. statistiques par jour (vue matérialisée, rafraîchie chaque nuit) ----------
-- une ligne par jour (heure de Paris) × événement × langue × appareil × entrée : nombre d'événements et d'acteurs distincts
create materialized view if not exists public.stats_daily as
  select (e.at at time zone 'Europe/Paris')::date as day, e.name,
         coalesce(e.lang, '') as lang, coalesce(e.dev, '') as dev, coalesce(e.inp, '') as inp,
         count(*)::integer as n,
         count(distinct coalesce(e.user_id::text, e.anon_id))::integer as actors
  from public.events e
  where e.at < date_trunc('day', now() at time zone 'Europe/Paris') at time zone 'Europe/Paris'
  group by 1, 2, 3, 4, 5;
create unique index if not exists stats_daily_key on public.stats_daily (day, name, lang, dev, inp);
revoke all on public.stats_daily from anon, authenticated;

-- tâche de nuit : rafraîchir les statistiques, purger les vieilles données
create or replace function public.admin_nightly()
returns void language plpgsql security definer set search_path = public as $$
begin
  refresh materialized view concurrently public.stats_daily;
  delete from public.events where at < now() - interval '13 months';
  delete from public.client_errors where at < now() - interval '90 days';
end $$;
revoke all on function public.admin_nightly() from public, anon, authenticated;

do $cron$ begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.unschedule(jobname) from cron.job where jobname = 'pc-admin-nightly';
    perform cron.schedule('pc-admin-nightly', '10 2 * * *', 'select public.admin_nightly()');  -- 2 h 10 UTC
  end if;
end $cron$;

-- ---------- 8. fonctions du back office ----------
-- filtre commun des événements (période en jours de Paris, langue, appareil, entrée ; '' = tous)
create or replace function public.admin_ev(p_from date, p_to date, p_lang text default '', p_dev text default '', p_inp text default '')
returns setof public.events language sql stable security definer set search_path = public as $$
  select e.* from public.events e
  where e.at >= (p_from::timestamp at time zone 'Europe/Paris') and e.at < ((p_to + 1)::timestamp at time zone 'Europe/Paris')
    and (coalesce(p_lang, '') = '' or e.lang = p_lang)
    and (coalesce(p_dev, '') = '' or e.dev = p_dev)
    and (coalesce(p_inp, '') = '' or e.inp = p_inp)
$$;
revoke all on function public.admin_ev(date, date, text, text, text) from public, anon, authenticated;

create or replace function public.admin_me()
returns jsonb language plpgsql stable security definer set search_path = public as $$
begin
  perform public.admin_guard('lecture');
  return jsonb_build_object('role', (select role from public.admins where user_id = auth.uid()),
                            'email', (select email from auth.users where id = auth.uid()));
end $$;

create or replace function public.admin_dashboard()
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare today date := (now() at time zone 'Europe/Paris')::date; r jsonb; ret jsonb; alerts jsonb := '[]'::jsonb;
  errs integer; fb integer; last_ev timestamptz; stats_at date; play jsonb;
begin
  perform public.admin_guard('lecture');
  with a as (select coalesce(user_id::text, anon_id) k, user_id, at from public.events where at > now() - interval '30 days')
  select jsonb_build_object(
    'active_day', (select count(distinct k) from a where at >= (today::timestamp at time zone 'Europe/Paris')),
    'active_7', (select count(distinct k) from a where at > now() - interval '7 days'),
    'active_30', (select count(distinct k) from a),
    'guests_30', (select count(distinct k) from a where user_id is null and not exists (select 1 from public.events e2 where e2.anon_id = a.k and e2.user_id is not null)),
    'accounts', (select count(*) from auth.users),
    'new_accounts_7', (select count(*) from auth.users where created_at > now() - interval '7 days'),
    'new_accounts_30', (select count(*) from auth.users where created_at > now() - interval '30 days'),
    'new_devices_7', (select count(*) from (select anon_id from public.events group by anon_id having min(at) > now() - interval '7 days') s)
  ) into r;
  -- temps de jeu : secondes déclarées par les fins d'activité (leçons, parties, quiz, duels), 7 jours
  select jsonb_build_object('sec_7', coalesce(sum(case when (props ->> 'sec') ~ '^\d{1,6}$' then (props ->> 'sec')::integer end), 0),
                            'sessions_7', count(*))
    into play from public.events where at > now() - interval '7 days' and name in ('learn_end','game_end','quiz_end','duel_end','pp_lesson_done');
  -- rétention : appareils vus pour la première fois il y a N jours ou plus (60 derniers jours), revenus le jour N
  with f as (select anon_id, min((at at time zone 'Europe/Paris')::date) d0 from public.events group by anon_id),
       c as (select f.anon_id, f.d0 from f where f.d0 >= today - 60),
       x as (select n, count(*) filter (where c.d0 <= today - n) as cohort,
                    count(*) filter (where c.d0 <= today - n and exists (select 1 from public.events e where e.anon_id = c.anon_id
                       and (e.at at time zone 'Europe/Paris')::date = c.d0 + n)) as back
             from c cross join (values (1), (7), (30)) v(n) group by n)
  select jsonb_object_agg('d' || n, jsonb_build_object('cohort', cohort, 'back', back)) into ret from x;
  -- alertes
  select count(*) into errs from public.client_errors where at > now() - interval '24 hours';
  select count(*) into fb from public.feedback where status = 'new';
  select max(at) into last_ev from public.events;
  select max(day) into stats_at from public.stats_daily;
  if errs >= 20 then alerts := alerts || jsonb_build_object('lvl', 'serious', 'k', 'errors', 'n', errs); end if;
  if fb > 0 then alerts := alerts || jsonb_build_object('lvl', 'warning', 'k', 'feedback', 'n', fb); end if;
  if last_ev is null or last_ev < now() - interval '24 hours' then alerts := alerts || jsonb_build_object('lvl', 'warning', 'k', 'no_events', 'at', last_ev); end if;
  if stats_at is null or stats_at < today - 2 then alerts := alerts || jsonb_build_object('lvl', 'warning', 'k', 'stats_stale', 'day', stats_at); end if;
  return r || jsonb_build_object('play', play, 'retention', coalesce(ret, '{}'::jsonb), 'alerts', alerts,
    'series', (select coalesce(jsonb_agg(jsonb_build_object('day', d, 'actors', v) order by d), '[]'::jsonb) from (
       select day d, sum(actors)::integer v from public.stats_daily where name = 'app_open' and day >= today - 30 group by day
       union all
       select today, count(distinct coalesce(user_id::text, anon_id))::integer from public.events
        where name = 'app_open' and at >= (today::timestamp at time zone 'Europe/Paris')) s));
end $$;

-- statistiques détaillées d'une période, avec filtres
create or replace function public.admin_stats(p_from date, p_to date, p_lang text default '', p_dev text default '', p_inp text default '')
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare out jsonb;
begin
  perform public.admin_guard('lecture');
  if p_from is null or p_to is null or p_to < p_from or p_to - p_from > 400 then raise exception 'bad period'; end if;
  with e as (select * from public.admin_ev(p_from, p_to, p_lang, p_dev, p_inp)),
  k as (select e.*, coalesce(e.user_id::text, e.anon_id) actor from e)
  select jsonb_build_object(
    'events', (select count(*) from e),
    'actors', (select count(distinct actor) from k),
    -- entonnoir du premier lancement, par appareil (anon_id)
    'funnel', jsonb_build_array(
      (select count(distinct anon_id) from e where name = 'app_open' and (props ->> 'first') = '1'),
      (select count(distinct anon_id) from e where name = 'first_note'),
      (select count(distinct anon_id) from e where name = 'pp_lesson_done' and props ->> 'id' = 'p01'),
      (select count(distinct anon_id) from e where name = 'pp_lesson_done' and props ->> 'id' = 'p03'),
      (select count(distinct anon_id) from e where name = 'signup')),
    'pp', (select coalesce(jsonb_agg(jsonb_build_object('id', id, 'n', n, 'stars', st) order by id), '[]'::jsonb) from (
       select props ->> 'id' id, count(distinct anon_id) n, round(avg(nullif(props ->> 'stars', '')::numeric), 2) st
       from e where name = 'pp_lesson_done' and (props ->> 'id') ~ '^p\d\d$' group by 1) s),
    'inputs', (select coalesce(jsonb_object_agg(i, n), '{}'::jsonb) from (
       select coalesce(inp, 'none') i, count(distinct actor) n from k where name = 'app_open' group by 1) s),
    'keyboards', (select coalesce(jsonb_agg(jsonb_build_object('name', nm, 'n', n) order by n desc), '[]'::jsonb) from (
       select left(props ->> 'name', 40) nm, count(distinct anon_id) n from e where name = 'midi_connected' and props ? 'name' group by 1 order by 2 desc limit 12) s),
    'devices', (select coalesce(jsonb_object_agg(d, n), '{}'::jsonb) from (
       select coalesce(dev, '?') || '·' || coalesce(plat, '?') d, count(distinct actor) n from k where name = 'app_open' group by 1) s),
    'langs', (select coalesce(jsonb_object_agg(l, n), '{}'::jsonb) from (
       select coalesce(lang, '?') l, count(distinct actor) n from k where name = 'app_open' group by 1) s),
    'quiz', (select jsonb_build_object('n', count(*), 'players', round(avg(nullif(props ->> 'players', '')::numeric), 1),
                                      'ok_rate', round(avg(case when (props ->> 'q')::numeric > 0 then (props ->> 'ok')::numeric / (props ->> 'q')::numeric end), 3),
                                      'online', count(*) filter (where props ->> 'mode' = 'online'))
             from e where name = 'quiz_end' and coalesce(props ->> 'q', '') ~ '^\d{1,4}$' and coalesce(props ->> 'ok', '0') ~ '^\d{1,4}$'),
    'duels', (select jsonb_build_object('n', count(*),
                'win', count(*) filter (where props ->> 'res' = '1'), 'loss', count(*) filter (where props ->> 'res' = '0'),
                'draw', count(*) filter (where props ->> 'res' = '0.5'),
                'bot', count(*) filter (where props ->> 'opp' = 'bot'), 'online', count(*) filter (where props ->> 'opp' = 'online'),
                'friend', count(*) filter (where props ->> 'opp' = 'friend'),
                'elo_avg', round(avg(case when (props ->> 'elo') ~ '^\d{1,4}$' then (props ->> 'elo')::integer end)),
                'by_game', (select coalesce(jsonb_object_agg(g, c), '{}'::jsonb) from (select props ->> 'game' g, count(*) c from e where name = 'duel_end' group by 1) s))
              from e where name = 'duel_end'),
    'elo', (select coalesce(jsonb_agg(jsonb_build_object('b', b, 'n', n) order by b), '[]'::jsonb) from (
       select (least(2400, (props ->> 'elo')::integer) / 200) * 200 b, count(distinct actor) n
       from k where name = 'duel_end' and (props ->> 'elo') ~ '^\d{1,4}$' group by 1) s),
    'goal', (select jsonb_build_object('n', count(*), 'actors', count(distinct actor),
               'by', (select coalesce(jsonb_object_agg(g, c), '{}'::jsonb) from (select coalesce(props ->> 'kind', '?') || ' ' || coalesce(props ->> 'v', '') g, count(*) c from e where name = 'goal_reached' group by 1) s))
             from k where name = 'goal_reached'),
    'badges', (select coalesce(jsonb_agg(jsonb_build_object('id', id, 'n', n) order by n desc), '[]'::jsonb) from (
       select left(props ->> 'id', 40) id, count(distinct actor) n from k where name = 'badge' and props ? 'id' group by 1 order by 2 desc limit 15) s),
    -- séries : celles des comptes (profiles.streak), à la date d'aujourd'hui
    'streaks', (select jsonb_build_object('0', count(*) filter (where streak = 0), '1-2', count(*) filter (where streak between 1 and 2),
               '3-6', count(*) filter (where streak between 3 and 6), '7-29', count(*) filter (where streak between 7 and 29),
               '30+', count(*) filter (where streak >= 30)) from public.profiles),
    'series', (select coalesce(jsonb_agg(jsonb_build_object('day', d, 'actors', a, 'events', n) order by d), '[]'::jsonb) from (
       select (at at time zone 'Europe/Paris')::date d, count(distinct actor) a, count(*) n from k group by 1) s)
  ) into out;
  -- activités : fins de leçon / partie / quiz / duel, par type
  out := out || jsonb_build_object('activities', (
    with e as (select * from public.admin_ev(p_from, p_to, p_lang, p_dev, p_inp))
    select coalesce(jsonb_agg(jsonb_build_object('name', nm, 'what', w, 'n', n, 'actors', a) order by n desc), '[]'::jsonb) from (
      select name nm, coalesce(case when name = 'learn_end' then props ->> 'what' when name in ('game_end','duel_end') then props ->> 'game' else '' end, '') w,
             count(*) n, count(distinct coalesce(user_id::text, anon_id)) a
      from e where name in ('learn_end','game_end','quiz_end','duel_end','pp_lesson_done') group by 1, 2 order by 3 desc limit 30) s));
  return out;
end $$;

-- joueurs : recherche par pseudo (et par e-mail pour owner / support)
create or replace function public.admin_users(p_q text default '', p_limit integer default 50, p_offset integer default 0)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare see_mail boolean := public.is_admin('support'); q text := btrim(coalesce(p_q, ''));
begin
  perform public.admin_guard('lecture');
  return (select jsonb_build_object('total', (select count(*) from auth.users), 'rows', coalesce(jsonb_agg(r order by r ->> 'created_at' desc), '[]'::jsonb)) from (
    select jsonb_build_object('id', u.id, 'name', p.name, 'avatar', p.avatar, 'email', case when see_mail then u.email end,
      'created_at', u.created_at, 'last_sign_in', u.last_sign_in_at, 'xp', coalesce(p.xp, 0), 'level', coalesce(p.level, 1),
      'streak', coalesce(p.streak, 0), 'banned', (u.banned_until is not null and u.banned_until > now()),
      'prem_until', (select g.until from public.prem_grants g where g.user_id = u.id and g.until > now())) r
    from auth.users u left join public.profiles p on p.id = u.id
    where q = '' or p.name ilike '%' || q || '%' or (see_mail and u.email ilike '%' || q || '%') or u.id::text = q
    order by u.created_at desc
    limit least(greatest(coalesce(p_limit, 50), 1), 200) offset greatest(coalesce(p_offset, 0), 0)) s);
end $$;

-- fiche d'un joueur
create or replace function public.admin_user(p_id uuid)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare see_mail boolean := public.is_admin('support'); out jsonb; d jsonb;
begin
  perform public.admin_guard('lecture');
  select data into d from public.progress where user_id = p_id;
  select jsonb_build_object(
    'id', u.id, 'email', case when see_mail then u.email end, 'created_at', u.created_at, 'last_sign_in', u.last_sign_in_at,
    'providers', u.raw_app_meta_data -> 'providers', 'banned_until', u.banned_until,
    'profile', (select to_jsonb(p) - 'id' from public.profiles p where p.id = u.id),
    'progress', case when d is null then null else jsonb_build_object(
       'xp', d -> 'xp', 'lang', d #> '{settings,lang}', 'input', d #> '{settings,input}', 'streak', d -> 'streak',
       'elo', d -> 'elo', 'pp', d #> '{pp,done}', 'goal', d -> 'goal', 'prem', d -> 'prem', 'size', pg_column_size(d),
       'updated_at', (select updated_at from public.progress where user_id = p_id)) end,
    'xp_days', (select coalesce(jsonb_agg(jsonb_build_object('day', day, 'xp', xp) order by day desc), '[]'::jsonb)
                from (select day, xp from public.xp_log where user_id = p_id and day > current_date - 30 order by day desc) s),
    'events', (select coalesce(jsonb_agg(jsonb_build_object('at', at, 'name', name, 'props', props) order by at desc), '[]'::jsonb)
               from (select at, name, props from public.events where user_id = p_id order by at desc limit 40) s),
    'feedback', (select coalesce(jsonb_agg(jsonb_build_object('id', id, 'at', at, 'kind', kind, 'msg', msg, 'status', status) order by at desc), '[]'::jsonb)
                 from public.feedback where user_id = p_id),
    'prem_until', (select g.until from public.prem_grants g where g.user_id = p_id),
    'admin_role', (select role from public.admins where user_id = p_id)
  ) into out from auth.users u where u.id = p_id;
  if out is null then raise exception 'not found'; end if;
  return out;
end $$;

create or replace function public.admin_user_rename(p_id uuid, p_name text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare old text; nm text := btrim(coalesce(p_name, ''));
begin
  perform public.admin_guard('support');
  if char_length(nm) not between 2 and 24 or nm ~ U&'[\0001-\001F\007F\200E\200F\202A-\202E\2066-\2069]' then raise exception 'bad name'; end if;
  select name into old from public.profiles where id = p_id;
  if not found then raise exception 'not found'; end if;
  update public.profiles set name = nm, updated_at = now() where id = p_id;
  perform public.admin_write_log('user.rename', p_id::text, jsonb_build_object('old', old, 'new', nm));
  return jsonb_build_object('ok', true);
end $$;

-- remise à zéro de la progression (XP, journal d'XP, progression sauvegardée) : owner seulement
create or replace function public.admin_user_reset(p_id uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare xp0 integer;
begin
  perform public.admin_guard('owner');
  select xp into xp0 from public.profiles where id = p_id;
  delete from public.progress where user_id = p_id;
  delete from public.xp_log where user_id = p_id;
  update public.profiles set xp = 0, level = 1, streak = 0, solved = 0, updated_at = now() where id = p_id;
  perform public.admin_write_log('user.reset', p_id::text, jsonb_build_object('xp_before', xp0));
  return jsonb_build_object('ok', true);
end $$;

-- offrir des jours de Premium (30 = un mois) ; 0 = retirer
create or replace function public.admin_user_premium(p_id uuid, p_days integer)
returns jsonb language plpgsql security definer set search_path = public as $$
declare u timestamptz;
begin
  perform public.admin_guard('support');
  if p_days is null or p_days < 0 or p_days > 400 then raise exception 'bad days'; end if;
  if not exists (select 1 from auth.users where id = p_id) then raise exception 'not found'; end if;
  if p_days = 0 then delete from public.prem_grants where user_id = p_id; u := null;
  else
    insert into public.prem_grants as g (user_id, until, granted_by) values (p_id, now() + make_interval(days => p_days), auth.uid())
    on conflict (user_id) do update set until = greatest(g.until, now()) + make_interval(days => p_days), granted_by = auth.uid(), updated_at = now()
    returning until into u;
  end if;
  perform public.admin_write_log('user.premium', p_id::text, jsonb_build_object('days', p_days, 'until', u));
  return jsonb_build_object('ok', true, 'until', u);
end $$;

-- export RGPD : toutes les données d'un joueur (sans le jeton de désinscription)
create or replace function public.admin_user_export(p_id uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare out jsonb; d jsonb;
begin
  perform public.admin_guard('support');
  select jsonb_build_object(
    'exported_at', now(),
    'account', jsonb_build_object('id', u.id, 'email', u.email, 'created_at', u.created_at, 'last_sign_in_at', u.last_sign_in_at, 'providers', u.raw_app_meta_data -> 'providers'),
    'profile', (select to_jsonb(p) from public.profiles p where p.id = u.id),
    'progress', (select to_jsonb(p) from public.progress p where p.user_id = u.id),
    'xp_log', (select coalesce(jsonb_agg(to_jsonb(x) order by x.day), '[]'::jsonb) from public.xp_log x where x.user_id = u.id),
    'notifications', (select coalesce(jsonb_agg(to_jsonb(n) order by n.created_at), '[]'::jsonb) from public.notifications n where n.user_id = u.id),
    'notif_prefs', (select to_jsonb(np) - 'unsub_token' from public.notif_prefs np where np.user_id = u.id),
    'events', (select coalesce(jsonb_agg(to_jsonb(e) - 'id' order by e.at), '[]'::jsonb) from public.events e where e.user_id = u.id),
    'feedback', (select coalesce(jsonb_agg(to_jsonb(f) order by f.at), '[]'::jsonb) from public.feedback f where f.user_id = u.id),
    'client_errors', (select coalesce(jsonb_agg(to_jsonb(c) order by c.at), '[]'::jsonb) from public.client_errors c where c.user_id = u.id),
    'prem_grants', (select to_jsonb(g) from public.prem_grants g where g.user_id = u.id)
  ) into out from auth.users u where u.id = p_id;
  if out is null then raise exception 'not found'; end if;
  if to_regclass('public.league_members') is not null then
    execute 'select coalesce(jsonb_agg(to_jsonb(m) order by m.week), ''[]''::jsonb) from public.league_members m where m.user_id = $1'
      into strict d using p_id;
    out := out || jsonb_build_object('league_members', d);
  end if;
  perform public.admin_write_log('user.export', p_id::text, '{}'::jsonb);
  return out;
end $$;

-- réglages à distance
create or replace function public.admin_config_list()
returns jsonb language plpgsql stable security definer set search_path = public as $$
begin
  perform public.admin_guard('lecture');
  return (select coalesce(jsonb_agg(jsonb_build_object('key', key, 'value', value, 'updated_at', updated_at) order by key), '[]'::jsonb) from public.app_config);
end $$;

create or replace function public.admin_config_set(p_key text, p_value jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare old jsonb;
begin
  perform public.admin_guard('owner');
  if p_key is null or p_key !~ '^[a-z][a-z0-9_]{1,31}$' then raise exception 'bad key'; end if;
  select value into old from public.app_config where key = p_key;
  if p_value is null then delete from public.app_config where key = p_key;
  else
    insert into public.app_config (key, value, updated_at, updated_by) values (p_key, p_value, now(), auth.uid())
    on conflict (key) do update set value = excluded.value, updated_at = now(), updated_by = auth.uid();
  end if;
  perform public.admin_write_log('config.set', p_key, jsonb_build_object('old', old, 'new', p_value));
  return jsonb_build_object('ok', true);
end $$;

-- notifications : historique (30 jours) et tâches planifiées
create or replace function public.admin_notifs()
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare jobs jsonb := '[]'::jsonb;
begin
  perform public.admin_guard('lecture');
  if to_regclass('cron.job') is not null then
    begin
      execute $q$select coalesce(jsonb_agg(jsonb_build_object('name', j.jobname, 'schedule', j.schedule, 'active', j.active,
          'last', (select jsonb_build_object('at', d.start_time, 'status', d.status, 'msg', left(d.return_message, 200))
                   from cron.job_run_details d where d.jobid = j.jobid order by d.start_time desc limit 1)) order by j.jobname), '[]'::jsonb)
        from cron.job j where j.jobname like 'pc-%'$q$ into jobs;
    exception when others then jobs := '[]'::jsonb;
    end;
  end if;
  return jsonb_build_object(
    'by_kind', (select coalesce(jsonb_object_agg(kind, n), '{}'::jsonb) from (select kind, count(*) n from public.notifications where created_at > now() - interval '30 days' group by 1) s),
    'recent', (select coalesce(jsonb_agg(jsonb_build_object('title', title, 'body', body, 'kind', kind, 'at', at, 'n', n) order by at desc), '[]'::jsonb) from (
        select title, body, kind, max(created_at) at, count(*) n from public.notifications where created_at > now() - interval '30 days'
        group by title, body, kind order by max(created_at) desc limit 30) s),
    'prefs', (select jsonb_build_object('n', count(*), 'weekly', count(*) filter (where email_weekly), 'streak', count(*) filter (where email_streak)) from public.notif_prefs),
    'jobs', jobs);
end $$;

-- nombre de destinataires d'un groupe (affiché avant l'envoi ; l'envoi passe par la fonction Edge « admin »)
create or replace function public.admin_notify_count(p_group text)
returns integer language plpgsql stable security definer set search_path = public as $$
begin
  perform public.admin_guard('support');
  return (select count(*) from public.admin_notify_targets(p_group));
end $$;

create or replace function public.admin_notify_targets(p_group text)
returns table (user_id uuid) language sql stable security definer set search_path = public as $$
  select u.id from auth.users u
  left join public.notif_prefs np on np.user_id = u.id
  where case p_group
    when 'all' then true
    when 'active7' then exists (select 1 from public.xp_log l where l.user_id = u.id and l.day > current_date - 7 and l.xp > 0)
    when 'inactive14' then not exists (select 1 from public.xp_log l where l.user_id = u.id and l.day > current_date - 14 and l.xp > 0)
    when 'fr' then coalesce(np.lang, 'fr') = 'fr'
    when 'en' then np.lang = 'en'
    else false end
$$;
revoke all on function public.admin_notify_targets(text) from public, anon, authenticated;

-- ligues (si la migration des ligues est installée)
create or replace function public.admin_leagues()
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare w date; groups jsonb; weeks jsonb;
begin
  perform public.admin_guard('lecture');
  if to_regclass('public.league_members') is null or to_regprocedure('public.league_week(timestamp with time zone)') is null then
    return jsonb_build_object('installed', false);
  end if;
  execute 'select public.league_week(now())' into w;
  execute $q$select coalesce(jsonb_agg(jsonb_build_object('tier', tier, 'grp', grp, 'n', n, 'closed', closed) order by tier desc, grp), '[]'::jsonb) from (
      select m.tier, m.grp, count(*) n, bool_and(m.move is not null) closed from public.league_members m where m.week = $1 group by 1, 2) s$q$ into groups using w;
  execute $q$select coalesce(jsonb_agg(jsonb_build_object('week', week, 'formed_at', formed_at, 'closed_at', closed_at) order by week desc), '[]'::jsonb)
      from (select * from public.league_weeks order by week desc limit 8) s$q$ into weeks;
  return jsonb_build_object('installed', true, 'week', w, 'groups', groups, 'weeks', weeks);
end $$;

create or replace function public.admin_league_action(p_action text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare n integer;
begin
  perform public.admin_guard('owner');
  if to_regclass('public.league_members') is null then raise exception 'leagues not installed'; end if;
  if p_action = 'form' then execute 'select public.league_form()' into n;
  elsif p_action = 'close' then execute 'select public.league_close()' into n;
  else raise exception 'bad action'; end if;
  perform public.admin_write_log('league.' || p_action, null, jsonb_build_object('rows', n));
  return jsonb_build_object('ok', true, 'rows', n);
end $$;

-- support
create or replace function public.admin_feedback(p_status text default '', p_limit integer default 100)
returns jsonb language plpgsql stable security definer set search_path = public as $$
begin
  perform public.admin_guard('support');
  return (select coalesce(jsonb_agg(jsonb_build_object('id', f.id, 'at', f.at, 'kind', f.kind, 'msg', f.msg, 'contact', f.contact, 'ctx', f.ctx,
      'status', f.status, 'note', f.note, 'user_id', f.user_id, 'name', p.name) order by f.at desc), '[]'::jsonb)
    from (select * from public.feedback where coalesce(p_status, '') = '' or status = p_status order by at desc limit least(greatest(coalesce(p_limit, 100), 1), 500)) f
    left join public.profiles p on p.id = f.user_id);
end $$;

create or replace function public.admin_feedback_set(p_id bigint, p_status text, p_note text default null)
returns jsonb language plpgsql security definer set search_path = public as $$
begin
  perform public.admin_guard('support');
  if p_status not in ('new','seen','done') then raise exception 'bad status'; end if;
  update public.feedback set status = p_status, note = coalesce(left(p_note, 1000), note) where id = p_id;
  if not found then raise exception 'not found'; end if;
  perform public.admin_write_log('feedback.set', p_id::text, jsonb_build_object('status', p_status));
  return jsonb_build_object('ok', true);
end $$;

-- système : versions vues, erreurs groupées, journal
create or replace function public.admin_system()
returns jsonb language plpgsql stable security definer set search_path = public as $$
begin
  perform public.admin_guard('lecture');
  return jsonb_build_object(
    'versions', (select coalesce(jsonb_agg(jsonb_build_object('ver', ver, 'plat', plat, 'n', n, 'last', last) order by last desc), '[]'::jsonb) from (
        select coalesce(ver, '?') ver, coalesce(plat, '?') plat, count(distinct anon_id) n, max(at) last
        from public.events where name = 'app_open' and at > now() - interval '30 days' group by 1, 2 order by max(at) desc limit 20) s),
    'errors', (select coalesce(jsonb_agg(jsonb_build_object('msg', msg, 'src', src, 'line', line, 'n', n, 'devices', d, 'last', last, 'ver', ver) order by n desc), '[]'::jsonb) from (
        select msg, max(src) src, max(line) line, count(*) n, count(distinct anon_id) d, max(at) last, max(ver) ver
        from public.client_errors where at > now() - interval '7 days' group by msg order by count(*) desc limit 30) s),
    'errors_24h', (select count(*) from public.client_errors where at > now() - interval '24 hours'),
    'events_total', (select count(*) from public.events),
    'stats_day', (select max(day) from public.stats_daily));
end $$;

create or replace function public.admin_log_list(p_limit integer default 100)
returns jsonb language plpgsql stable security definer set search_path = public as $$
begin
  perform public.admin_guard('support');
  return (select coalesce(jsonb_agg(jsonb_build_object('at', at, 'who', admin_email, 'action', action, 'target', target, 'detail', detail) order by at desc), '[]'::jsonb)
    from (select * from public.admin_log order by at desc limit least(greatest(coalesce(p_limit, 100), 1), 500)) s);
end $$;

-- droits : les fonctions admin_* ne sont appelables que par un compte connecté (elles vérifient ensuite is_admin)
do $g$ declare f record; begin
  for f in select p.oid::regprocedure sig from pg_proc p join pg_namespace n on n.oid = p.pronamespace
           where n.nspname = 'public' and p.proname in ('admin_me','admin_dashboard','admin_stats','admin_users','admin_user','admin_user_rename',
             'admin_user_reset','admin_user_premium','admin_user_export','admin_config_list','admin_config_set','admin_notifs','admin_notify_count',
             'admin_leagues','admin_league_action','admin_feedback','admin_feedback_set','admin_system','admin_log_list') loop
    execute format('revoke all on function %s from public, anon', f.sig);
    execute format('grant execute on function %s to authenticated', f.sig);
  end loop;
end $g$;

-- ---------- 9. premier administrateur ----------
-- Remplace TON_EMAIL par l'adresse de ton compte Piano Challenges, décommente la ligne et lance-la une fois :
-- insert into public.admins (user_id, role) select id, 'owner' from auth.users where email = 'TON_EMAIL' on conflict (user_id) do update set role = 'owner';
