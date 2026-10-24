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
