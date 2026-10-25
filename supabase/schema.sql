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
grant select, insert on public.admin_log to service_role;            -- la fonction Edge « admin » écrit le journal
grant usage on sequence public.admin_log_id_seq to service_role;

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
  delete from public.feedback where at < now() - interval '13 months'; -- « Signaler un problème » : 13 mois au plus (page Confidentialité)
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
  -- temps de jeu (événements « play » : secondes jouées, d'après le compteur de l'app) et activités terminées, 7 jours
  select jsonb_build_object('sec_7', coalesce(sum(case when name = 'play' and (props ->> 'sec') ~ '^\d{1,6}$' then (props ->> 'sec')::integer end), 0),
                            'sessions_7', count(*) filter (where name in ('learn_end','game_end','quiz_end','duel_end','pp_lesson_done')))
    into play from public.events where at > now() - interval '7 days' and name in ('play','learn_end','game_end','quiz_end','duel_end','pp_lesson_done');
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
grant execute on function public.admin_notify_targets(text) to service_role; -- la fonction Edge « admin » (clé service)

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

-- ===== Ligues hebdomadaires (C11) : copie de supabase/migrations/2026-10-24_leagues.sql =====
-- 1. tables (aucun accès direct depuis l'app : tout passe par my_league())
create table if not exists public.league_members (
  week date not null,                                   -- lundi de la semaine (Europe/Paris)
  user_id uuid not null references auth.users(id) on delete cascade,
  tier smallint not null check (tier between 0 and 5),  -- 0 Bronze … 5 Diamant
  grp integer not null check (grp >= 0),                -- numéro du groupe dans (week, tier)
  joined_at timestamptz not null default now(),
  final_xp integer,                                     -- rempli par league_close()
  final_rank smallint,
  move smallint check (move between -1 and 1),          -- 1 montée, 0 maintien, -1 descente
  primary key (week, user_id)
);
create index if not exists league_members_grp_idx on public.league_members (week, tier, grp);
create index if not exists league_members_user_idx on public.league_members (user_id, week desc);

create table if not exists public.league_weeks (
  week date primary key,
  formed_at timestamptz,
  closed_at timestamptz
);

alter table public.league_members enable row level security;
alter table public.league_weeks enable row level security;
-- RLS sans policy + aucun droit : ni anon ni authenticated ne lisent ou n'écrivent ces tables directement
revoke all on public.league_members from anon, authenticated;
revoke all on public.league_weeks from anon, authenticated;

-- 2. la semaine en cours (lundi, heure de Paris) et la fin de la ligue (dimanche 20 h, heure de Paris)
create or replace function public.league_week(ts timestamptz default now())
returns date language sql stable set search_path = public as $$
  select (date_trunc('week', ts at time zone 'Europe/Paris'))::date
$$;
create or replace function public.league_ends(wk date)
returns timestamptz language sql stable set search_path = public as $$
  select ((wk + 6)::timestamp + interval '20 hours') at time zone 'Europe/Paris'
$$;
revoke all on function public.league_week(timestamptz) from public;
revoke all on function public.league_ends(date) from public;

-- 3. fin de semaine : XP et rang figés, montée / descente, notification
create or replace function public.league_close(wk date default null, notify boolean default true)
returns integer
language plpgsql security definer set search_path = public as $$
#variable_conflict use_column
declare w date := coalesce(wk, public.league_week()); n integer := 0;
  tf text[] := array['Bronze','Argent','Or','Saphir','Rubis','Diamant'];
  te text[] := array['Bronze','Silver','Gold','Sapphire','Ruby','Diamond'];
begin
  perform pg_advisory_xact_lock(hashtext('pc-league-close-' || w));
  if exists (select 1 from public.league_weeks lw where lw.week = w and lw.closed_at is not null) then return 0; end if;
  with x as (
    select m.user_id, m.tier, m.grp, m.joined_at,
      coalesce((select sum(l.xp) from public.xp_log l where l.user_id = m.user_id and l.day between w and w + 6 and l.xp > 0), 0)::integer as xp
    from public.league_members m where m.week = w),
  r as (
    select x.*, row_number() over (partition by x.tier, x.grp order by x.xp desc, x.joined_at, x.user_id) as rk,
      count(*) over (partition by x.tier, x.grp) as cnt
    from x)
  update public.league_members m
     set final_xp = r.xp, final_rank = r.rk,
         move = case when r.rk <= 5 and r.xp > 0 and r.tier < 5 then 1
                     when r.rk > r.cnt - 3 and r.rk > 5 and r.tier > 0 then -1
                     else 0 end
    from r where m.week = w and m.user_id = r.user_id;
  get diagnostics n = row_count;
  if notify and n > 0 then
    insert into public.notifications (user_id, kind, cat, title, body, action)
    select m.user_id, 'rank', 'social',
      case when coalesce(np.lang, 'fr') = 'en'
        then te[m.tier + 1] || ' league is over: you finish #' || m.final_rank
        else 'Ligue ' || tf[m.tier + 1] || ' terminée : tu finis ' || m.final_rank || (case when m.final_rank = 1 then 'er' else 'e' end) end,
      case when coalesce(np.lang, 'fr') = 'en' then
        case m.move when 1 then 'Well played, you move up to ' || te[m.tier + 2] || '! Your new league starts on Monday.'
                    when -1 then 'You move down to ' || te[m.tier] || '. New league on Monday: time to climb back!'
                    else 'You stay in ' || te[m.tier + 1] || '. New league on Monday.' end
      else
        case m.move when 1 then 'Bravo, tu montes en ' || tf[m.tier + 2] || ' ! Ta nouvelle ligue commence lundi.'
                    when -1 then 'Tu descends en ' || tf[m.tier] || '. Nouvelle ligue lundi : à toi de remonter !'
                    else 'Tu restes en ' || tf[m.tier + 1] || '. Nouvelle ligue lundi.' end
      end,
      'rank'
    from public.league_members m left join public.notif_prefs np on np.user_id = m.user_id
    where m.week = w;
  end if;
  insert into public.league_weeks (week, closed_at) values (w, now())
    on conflict (week) do update set closed_at = coalesce(public.league_weeks.closed_at, now());
  return n;
end $$;
revoke all on function public.league_close(date, boolean) from public, anon, authenticated;

-- division d'un compte pour la semaine w : sa dernière ligue + montée / descente (Bronze s'il n'en a jamais eu)
create or replace function public.league_tier_for(uid uuid, w date)
returns smallint language sql stable security definer set search_path = public as $$
  select coalesce((select least(5, greatest(0, m.tier + coalesce(m.move, 0)))::smallint
                   from public.league_members m where m.user_id = uid and m.week < w
                   order by m.week desc limit 1), 0::smallint)
$$;
revoke all on function public.league_tier_for(uuid, date) from public, anon, authenticated;

-- 4. lundi : formation des groupes de 20 (au hasard, dans chaque division)
create or replace function public.league_form(wk date default null)
returns integer
language plpgsql security definer set search_path = public as $$
#variable_conflict use_column
declare w date := coalesce(wk, public.league_week()); n integer := 0;
begin
  perform pg_advisory_xact_lock(hashtext('pc-league-form-' || w));
  if exists (select 1 from public.league_weeks lw where lw.week = w and lw.formed_at is not null) then return 0; end if;
  -- la semaine précédente n'a pas été close (tâche du dimanche manquée) : on la clôt sans notification
  if exists (select 1 from public.league_members m where m.week = w - 7 and m.move is null) then
    perform public.league_close(w - 7, false);
  end if;
  with pool as (
    select a.user_id, public.league_tier_for(a.user_id, w) as tier
    from (select distinct l.user_id from public.xp_log l join public.profiles p on p.id = l.user_id
          where l.day >= w - 14 and l.day < w and l.xp > 0) a
    where not exists (select 1 from public.league_members m where m.week = w and m.user_id = a.user_id)),
  ng as (select pool.tier, ceil(count(*) / 20.0)::integer as k from pool group by pool.tier),
  ord as (select pool.user_id, pool.tier, row_number() over (partition by pool.tier order by random()) as rn from pool)
  -- groupes équilibrés : 21 joueurs = 11 + 10, pas 20 + 1 ; les arrivées de la semaine les complètent jusqu'à 20
  insert into public.league_members (week, user_id, tier, grp)
  select w, ord.user_id, ord.tier, ((ord.rn - 1) % ng.k)::integer from ord join ng on ng.tier = ord.tier
  on conflict (week, user_id) do nothing;
  get diagnostics n = row_count;
  insert into public.league_weeks (week, formed_at) values (w, now())
    on conflict (week) do update set formed_at = coalesce(public.league_weeks.formed_at, now());
  return n;
end $$;
revoke all on function public.league_form(date) from public, anon, authenticated;

-- 5. la ligue de l'appelant (appelée par l'app : sb.rpc("my_league"))
create or replace function public.my_league()
returns table (week date, tier integer, pos integer, name text, avatar integer, photo text, level integer,
               xp bigint, me boolean, ends_at timestamptz, closed boolean)
language plpgsql volatile security definer set search_path = public as $$
#variable_conflict use_column
declare uid uuid := auth.uid(); w date := public.league_week(); t smallint; g integer; cl boolean;
begin
  if uid is null then return; end if;                                       -- invité : rien
  if not exists (select 1 from public.profiles p where p.id = uid) then return; end if;
  if not exists (select 1 from public.league_weeks lw where lw.week = w and lw.formed_at is not null) then
    perform public.league_form(w);                                          -- la tâche du lundi n'est pas encore passée
  end if;
  select lw.closed_at is not null into cl from public.league_weeks lw where lw.week = w;
  select m.tier, m.grp into t, g from public.league_members m where m.week = w and m.user_id = uid;
  if t is null then
    if coalesce(cl, false) then return; end if;                             -- ligue close : on attend lundi
    perform pg_advisory_xact_lock(hashtext('pc-league-join-' || w));
    select m.tier, m.grp into t, g from public.league_members m where m.week = w and m.user_id = uid;
    if t is null then
      t := public.league_tier_for(uid, w);
      select m.grp into g from public.league_members m where m.week = w and m.tier = t
        group by m.grp having count(*) < 20 order by count(*), m.grp limit 1;
      if g is null then
        select coalesce(max(m.grp) + 1, 0) into g from public.league_members m where m.week = w and m.tier = t;
      end if;
      insert into public.league_members (week, user_id, tier, grp) values (w, uid, t, g)
        on conflict (week, user_id) do nothing;
    end if;
  end if;
  return query
    with x as (
      select m.user_id, m.joined_at,
        coalesce(m.final_xp, (select sum(l.xp) from public.xp_log l
                              where l.user_id = m.user_id and l.day between w and w + 6 and l.xp > 0), 0)::bigint as xp
      from public.league_members m where m.week = w and m.tier = t and m.grp = g)
    select w, t::integer,
      (row_number() over (order by x.xp desc, x.joined_at, x.user_id))::integer,
      p.name, p.avatar::integer, p.photo, p.level::integer, x.xp, x.user_id = uid,
      public.league_ends(w), coalesce(cl, false)
    from x join public.profiles p on p.id = x.user_id
    order by 3;
end $$;
revoke all on function public.my_league() from public;
-- anon aussi : l'app d'un invité peut ainsi savoir que la fonction existe (elle ne renvoie rien sans compte)
grant execute on function public.my_league() to anon, authenticated;

-- 6. planification (pg_cron, heures en UTC) : la fonction vérifie l'heure de Paris, ce qui suit
--    l'heure d'été et d'hiver (18 h UTC = 20 h à Paris en été, 19 h UTC = 20 h en hiver).
create extension if not exists pg_cron;
create or replace function public.league_cron(job text)
returns void language plpgsql security definer set search_path = public as $$
declare loc timestamp := now() at time zone 'Europe/Paris';
begin
  if job = 'close' and extract(isodow from loc) = 7 and extract(hour from loc) = 20 then
    perform public.league_close(public.league_week(), true);
  elsif job = 'form' and extract(isodow from loc) = 1 then
    perform public.league_form(public.league_week());
  end if;
end $$;
revoke all on function public.league_cron(text) from public, anon, authenticated;
select cron.unschedule(jobname) from cron.job where jobname in ('pc-league-close','pc-league-form');
select cron.schedule('pc-league-close', '0 18,19 * * 0',  $$ select public.league_cron('close') $$);  -- dimanche 20 h (Paris)
select cron.schedule('pc-league-form',  '5 22,23 * * 0',  $$ select public.league_cron('form') $$);   -- lundi 00 h 05 (Paris)

-- Pour essayer tout de suite (facultatif) : former les groupes de la semaine en cours
--   select public.league_form();
-- Pour voir les groupes :
--   select week, tier, grp, count(*) from public.league_members group by 1,2,3 order by 1 desc,2,3;

-- ===== Rappel de la prochaine leçon des Premiers pas (D24, lot 4) : copie de supabase/migrations/2026-10-25_reminder.sql =====
-- =====================================================================================
-- Migration 2026-10-25 : rappel de la prochaine leçon des Premiers pas (écran D24, lot 4) — À EXÉCUTER PAR ANTOINE
-- dans Supabase > SQL Editor > New query > Run. Idempotente : peut être relancée sans risque.
-- Prérequis : schema.sql (progress, xp_log) et supabase/notifications.sql (notifications, notif_prefs, notify_call, pg_cron).
-- Ensuite : redéployer la fonction Edge « notify » (job « path » ajouté), voir l'en-tête de supabase/functions/notify/index.ts.
-- Tant qu'elle n'est pas appliquée, l'app enregistre ses préférences sans l'heure ni le fuseau (repli automatique).
--
-- Principe
--   - Qui : les comptes qui ont commencé les Premiers pas (progress.data.pp.start ou une leçon faite) sans les avoir finies
--     (moins de 14 leçons), avec l'interrupteur e-mail « Rappels » (notif_prefs.email_streak, le même que le rappel de série),
--     pas désinscrits, qui n'ont pas encore joué aujourd'hui (xp_log, jour local du joueur) mais ont déjà joué.
--   - Quand : une fois par jour, à l'heure choisie dans l'app (Réglages › Notifications, notif_prefs.remind_hour, 18 h par défaut,
--     8 h à 20 h, jamais à partir de 21 h), dans le fuseau du joueur (notif_prefs.tz, envoyé par l'app). Le job tourne chaque heure.
--   - Jamais deux e-mails de rappel le même jour (pas le jour d'un rappel de série, et le rappel de série saute le jour d'un rappel de leçon).
--   - Arrêt après 3 rappels sans retour ; puis un seul message « Ta place est gardée » 14 jours après la dernière séance.
--     Une séance après un rappel remet le compteur à zéro.
--   - Chaque envoi ajoute aussi une ligne dans notifications (kind 'path', cat 'remind', action 'hub'), lue par l'app.
-- =====================================================================================

-- 1. notifications : nouveau type 'path' (rappel de leçon)
alter table public.notifications drop constraint if exists notifications_kind_check;
alter table public.notifications add constraint notifications_kind_check
  check (kind in ('recap','streak','daily','news','rank','duel','welcome','lvl','elo','unlock','path'));

-- 2. notif_prefs : heure du rappel, fuseau, suivi des rappels de leçon
alter table public.notif_prefs add column if not exists remind_hour smallint not null default 18;
alter table public.notif_prefs add column if not exists tz text not null default 'Europe/Paris';
alter table public.notif_prefs add column if not exists last_path_mail date;
alter table public.notif_prefs add column if not exists path_mail_n smallint not null default 0;
alter table public.notif_prefs add column if not exists path_kept_mail date;
alter table public.notif_prefs drop constraint if exists notif_prefs_remind_hour_check;
alter table public.notif_prefs add constraint notif_prefs_remind_hour_check check (remind_hour between 6 and 20);
alter table public.notif_prefs drop constraint if exists notif_prefs_tz_check;
alter table public.notif_prefs add constraint notif_prefs_tz_check check (char_length(tz) between 1 and 64);
-- l'app écrit l'heure et le fuseau (pas les dates d'envoi ni le compteur)
grant select (remind_hour, tz) on public.notif_prefs to authenticated;
grant insert (remind_hour, tz) on public.notif_prefs to authenticated;
grant update (remind_hour, tz) on public.notif_prefs to authenticated;

-- 3. qui reçoit un rappel maintenant ? (appelé par la fonction notify avec la clé service_role)
--    kind = 'remind' (prochaine leçon) ou 'kept' (« Ta place est gardée ») ; n = rappels déjà envoyés sans retour ;
--    lesson = première leçon pas encore faite (p01…p14) ; last_play = dernier jour joué ; local_day = jour du joueur.
create or replace function public.path_due(p_now timestamptz default now())
returns table (user_id uuid, lang text, kind text, lesson text, n int, last_play date, local_day date)
language sql stable security definer set search_path = public as $$
  with c as (
    select np.user_id, np.lang, np.remind_hour, np.last_path_mail, np.last_streak_mail, np.path_mail_n, np.path_kept_mail,
           case when np.tz in (select name from pg_timezone_names) then p_now at time zone np.tz end as lt, p.data->'pp' as pp  -- un fuseau inconnu : lt null, pas d'erreur
    from public.notif_prefs np
    join public.progress p on p.user_id = np.user_id
    where np.email_streak
      and jsonb_typeof(p.data->'pp') = 'object'
  ), s as (
    select c.*, c.lt::date as today, extract(hour from c.lt)::int as hr,
      (select max(x.day) from public.xp_log x where x.user_id = c.user_id and x.xp > 0) as last_play,
      (select count(*) from jsonb_object_keys(case when jsonb_typeof(c.pp->'done') = 'object' then c.pp->'done' else '{}'::jsonb end) k
         where k ~ '^p(0[1-9]|1[0-4])$')::int as ndone,
      (select 'p' || lpad(i::text, 2, '0') from generate_series(1, 14) i
         where not (coalesce(c.pp->'done', '{}'::jsonb) ? ('p' || lpad(i::text, 2, '0'))) order by i limit 1) as next_lesson
    from c
  ), e as (
    select s.*, case when s.last_path_mail is null or s.last_play >= s.last_path_mail then 0 else s.path_mail_n end as eff_n
    from s
    where (s.pp ? 'start' or s.ndone > 0) and s.ndone < 14
      and s.last_play is not null and s.last_play < s.today
      and s.hr = s.remind_hour and s.hr < 21
  )
  select e.user_id, e.lang, 'remind', e.next_lesson, e.eff_n, e.last_play, e.today from e
   where e.eff_n < 3 and e.last_path_mail is distinct from e.today and e.last_streak_mail is distinct from e.today
  union all
  select e.user_id, e.lang, 'kept', e.next_lesson, e.eff_n, e.last_play, e.today from e
   where e.eff_n >= 3 and e.last_play = e.today - 14 and (e.path_kept_mail is null or e.path_kept_mail < e.last_play);
$$;
revoke all on function public.path_due(timestamptz) from public, anon, authenticated;
grant execute on function public.path_due(timestamptz) to service_role;

-- 4. noter l'envoi (compteur sans retour, ou « place gardée »)
create or replace function public.path_mark(p_user uuid, p_kind text, p_day date, p_n int)
returns void language sql security definer set search_path = public as $$
  update public.notif_prefs set
    last_path_mail = case when p_kind = 'remind' then p_day else last_path_mail end,
    path_mail_n    = case when p_kind = 'remind' then least(p_n + 1, 9) else path_mail_n end,
    path_kept_mail = case when p_kind = 'kept' then p_day else path_kept_mail end
  where user_id = p_user;
$$;
revoke all on function public.path_mark(uuid, text, date, int) from public, anon, authenticated;
grant execute on function public.path_mark(uuid, text, date, int) to service_role;

-- 5. chaque heure à la minute 5 (le job de bienvenue tourne à :15 et :45, la série à 17 h 00, le récap le dimanche à 16 h 00)
create extension if not exists pg_cron;
select cron.unschedule(jobname) from cron.job where jobname = 'pc-path';
select cron.schedule('pc-path', '5 * * * *', $$ select public.notify_call('path') $$);

-- Pour vérifier (facultatif) : qui recevrait un rappel à 18 h aujourd'hui (heure de Paris)
--   select * from public.path_due(date_trunc('day', now() at time zone 'Europe/Paris') + interval '18 hours' at time zone 'Europe/Paris');

-- ===== Famille et paiement (abonnements Stripe / Apple, formule Famille jusqu'à 4 personnes, back office Paiements) : copie de supabase/migrations/2026-10-26_family.sql =====
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
returns boolean language sql immutable as $$
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

-- la famille de l'appelant (titulaire ou membre) ; security definer pour que les règles RLS ne se rappellent pas elles-mêmes
create or replace function public.family_of(p_user uuid)
returns uuid language sql stable security definer set search_path = public as $$
  select coalesce((select f.id from public.families f where f.owner_id = p_user),
                  (select m.family_id from public.family_members m where m.user_id = p_user))
$$;
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
              when exists (select 1 from public.family_members where user_id = me) or exists (select 1 from public.families where owner_id = me) then 'already_member'
              when public.family_until(f.id) is null then 'family_inactive'
              when used >= f.seats then 'family_full' end;
  return jsonb_build_object('ok', why is null, 'error', why, 'owner', oname, 'avatar', coalesce(oav, 0), 'seats', f.seats, 'used', used,
    'mine', exists (select 1 from public.family_members where user_id = me and family_id = f.id));
end $$;

-- rejoindre avec un code
create or replace function public.family_join(p_code text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); c text := upper(btrim(coalesce(p_code, ''))); i public.family_invites; f public.families; used int; oname text;
begin
  if me is null then raise exception 'not_signed_in'; end if;
  if c !~ '^[A-HJ-NP-Z2-9]{8}$' then raise exception 'invite_invalid'; end if;
  select * into i from public.family_invites where code = c for update;
  if not found then raise exception 'invite_invalid'; end if;
  select * into f from public.families where id = i.family_id for update;   -- une seule inscription à la fois par famille
  if exists (select 1 from public.family_members where user_id = me and family_id = f.id) then
    return jsonb_build_object('ok', true, 'already', true, 'family_id', f.id);
  end if;
  if i.used_by is not null then raise exception 'invite_used'; end if;
  if i.expires_at <= now() then raise exception 'invite_expired'; end if;
  if f.owner_id = me then raise exception 'is_owner'; end if;
  if exists (select 1 from public.family_members where user_id = me) or exists (select 1 from public.families where owner_id = me) then raise exception 'already_member'; end if;
  if public.family_until(f.id) is null then raise exception 'family_inactive'; end if;
  select count(*) + 1 into used from public.family_members where family_id = f.id;
  if used >= f.seats then raise exception 'family_full'; end if;
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
-- p : {user_id?, store, store_id, product, plan, status, period_end?, trial_end?, customer_id?, cancel_at_period_end?, amount_cents?, currency?, billing?}
-- user_id peut manquer pour une mise à jour (on retrouve la ligne par store + store_id). Crée la famille pour un abonnement Famille.
create or replace function public.sub_apply(p jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare uid uuid; sid bigint; pl text := p ->> 'plan'; st text := p ->> 'status'; fid uuid;
begin
  if coalesce(p ->> 'store', '') not in ('stripe','apple','manual') or coalesce(p ->> 'store_id', '') = '' then raise exception 'bad store'; end if;
  uid := nullif(p ->> 'user_id', '')::uuid;
  if uid is null then select user_id into uid from public.subscriptions where store = p ->> 'store' and store_id = p ->> 'store_id'; end if;
  if uid is null then raise exception 'unknown user'; end if;
  if not exists (select 1 from auth.users where id = uid) then raise exception 'unknown user'; end if;
  insert into public.subscriptions as s (user_id, store, product, plan, status, period_end, trial_end, store_id, customer_id, cancel_at_period_end, amount_cents, currency, billing)
  values (uid, p ->> 'store', coalesce(p ->> 'product', pl), pl, st, nullif(p ->> 'period_end', '')::timestamptz, nullif(p ->> 'trial_end', '')::timestamptz,
          p ->> 'store_id', nullif(p ->> 'customer_id', ''), coalesce((p ->> 'cancel_at_period_end')::boolean, false),
          nullif(p ->> 'amount_cents', '')::integer, nullif(lower(p ->> 'currency'), ''), nullif(p ->> 'billing', ''))
  on conflict (store, store_id) do update set
    product = coalesce(excluded.product, s.product), plan = coalesce(excluded.plan, s.plan), status = coalesce(excluded.status, s.status),
    period_end = coalesce(excluded.period_end, s.period_end), trial_end = coalesce(excluded.trial_end, s.trial_end),
    customer_id = coalesce(excluded.customer_id, s.customer_id), cancel_at_period_end = excluded.cancel_at_period_end,
    amount_cents = coalesce(excluded.amount_cents, s.amount_cents), currency = coalesce(excluded.currency, s.currency),
    billing = coalesce(excluded.billing, s.billing), updated_at = now()
  returning id, plan into sid, pl;
  if pl = 'family' then
    insert into public.families (owner_id, sub_id) values (uid, sid) on conflict (owner_id) do update set sub_id = excluded.sub_id returning id into fid;
    -- le titulaire était membre d'une autre famille : il la quitte (une seule famille par personne)
    delete from public.family_members where user_id = uid;
  end if;
  return jsonb_build_object('ok', true, 'id', sid, 'user_id', uid, 'family_id', fid);
end $$;
revoke all on function public.sub_apply(jsonb) from public, anon, authenticated;
grant execute on function public.sub_apply(jsonb) to service_role;

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
  fid := public.family_of(p_user);
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
