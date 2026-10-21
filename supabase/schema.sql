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
