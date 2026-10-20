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
