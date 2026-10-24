-- Faux Supabase minimal pour tester le SQL dans un Postgres local jetable (rôles, auth.users, auth.uid(), cron, progress, xp_log).
do $$ begin if not exists (select 1 from pg_roles where rolname='anon') then create role anon; create role authenticated; create role service_role; end if; end $$;
create schema auth; create table auth.users(id uuid primary key);
create schema cron; create table cron.job(jobname text);
create function cron.schedule(n text, s text, c text) returns int language sql as $$ insert into cron.job values (n) returning 1 $$;
create function cron.unschedule(n text) returns bool language sql as $$ delete from cron.job where jobname=n returning true $$;
create table public.progress(user_id uuid primary key references auth.users(id), data jsonb not null, updated_at timestamptz default now());
create table public.xp_log(user_id uuid references auth.users(id), day date, xp int default 0, primary key(user_id,day));
create function auth.uid() returns uuid language sql as $$ select null::uuid $$;
