-- Piano Challenges : notifications (dans l'app + e-mails Resend). À lancer une fois dans Supabase > SQL Editor.
-- Recopié aussi à la fin de schema.sql.

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
