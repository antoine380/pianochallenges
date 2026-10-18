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
  updated_at timestamptz not null default now()
);

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
