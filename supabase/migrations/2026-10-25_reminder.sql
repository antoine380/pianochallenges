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
