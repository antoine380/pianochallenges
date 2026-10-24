-- Piano Challenges : notifications (dans l'app + e-mails Resend). À lancer une fois dans Supabase > SQL Editor.
-- Recopié aussi à la fin de schema.sql.

-- 1. notifications écrites par le serveur (fonction notify, avec la clé service_role), lues par leur destinataire
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check (kind in ('recap','streak','daily','news','rank','duel','welcome','lvl','elo','unlock','path')),
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
  remind_hour smallint not null default 18 check (remind_hour between 6 and 20), -- rappel de leçon (D24) : heure locale
  tz text not null default 'Europe/Paris' check (char_length(tz) between 1 and 64),
  last_path_mail date,
  path_mail_n smallint not null default 0,
  path_kept_mail date,
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
grant select (user_id, email_weekly, email_streak, email_social, email_news, lang, updated_at, remind_hour, tz) on public.notif_prefs to authenticated;
grant insert (user_id, email_weekly, email_streak, email_social, email_news, lang, updated_at, remind_hour, tz) on public.notif_prefs to authenticated;
-- user_id is in the update list because the app upserts (ON CONFLICT … DO UPDATE sets every sent column); RLS still limits it to the own row
grant update (user_id, email_weekly, email_streak, email_social, email_news, lang, updated_at, remind_hour, tz) on public.notif_prefs to authenticated;
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

-- 4. rappel de la prochaine leçon des Premiers pas (D24, lot 4) : copie des sections 3 à 5 de supabase/migrations/2026-10-25_reminder.sql
--    (sur une base déjà installée, lancer plutôt la migration, qui ajoute aussi les colonnes et le type 'path')
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
