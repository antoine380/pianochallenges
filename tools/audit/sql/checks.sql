-- Vérifications de la migration du back office (lancées par run.sh, sur une base jetable).
\set ON_ERROR_STOP 1
insert into auth.users (id, email, created_at) values
  ('00000000-0000-0000-0000-00000000000a', 'owner@example.com', now() - interval '40 days'),
  ('00000000-0000-0000-0000-00000000000b', 'reader@example.com', now() - interval '20 days'),
  ('00000000-0000-0000-0000-00000000000c', 'player@example.com', now() - interval '2 days');
insert into public.profiles (id, name) values ('00000000-0000-0000-0000-00000000000c', 'Joueur C');
insert into public.progress (user_id, data) values ('00000000-0000-0000-0000-00000000000c', '{"xp":120,"settings":{"lang":"fr","input":"midi"}}');
insert into public.admins (user_id, role) values ('00000000-0000-0000-0000-00000000000a', 'owner'), ('00000000-0000-0000-0000-00000000000b', 'lecture');
-- anciens événements pour la vue par jour et la rétention
insert into public.events (at, anon_id, name, props, lang, dev, inp) select now() - (d || ' days')::interval, 'dev' || (d % 5) || 'xxxxxxx', 'app_open', '{}'::jsonb, 'fr', 'desktop', 'midi' from generate_series(1, 20) d;
create or replace function pg_temp.ok(c boolean, what text) returns void language plpgsql as $$ begin if not c then raise exception 'ÉCHEC : %', what; end if; raise notice 'ok  %', what; end $$;
create or replace function pg_temp.as_user(uid text, aal text) returns void language sql as $$
  select set_config('request.jwt.claims', case when uid is null then '{"role":"anon"}' else json_build_object('sub', uid, 'aal', aal, 'role', 'authenticated')::text end, false) $$;

-- 1. l'app (anon) envoie des événements, sans pouvoir lire la table
select pg_temp.as_user(null, null);
set role anon;
select pg_temp.ok(public.track_events('abcdEFGH1234', '[{"n":"app_open","t":0,"p":{"first":"1"},"l":"fr","d":"phone","s":"web","i":"screen","v":"2026-10-25"},{"n":"first_note"},{"n":"BAD NAME"},{"n":"x","p":"pas un objet"}]'::jsonb) = 2, 'track_events : 2 valides sur 4 (nom invalide ignoré, « x » trop court)');
select pg_temp.ok(public.track_events('court', '[{"n":"app_open"}]'::jsonb) = 0, 'track_events : identifiant invalide refusé');
select pg_temp.ok(public.track_events('abcdEFGH1234', (select jsonb_agg('{"n":"app_open"}'::jsonb) from generate_series(1, 51))) = 0, 'track_events : lot de plus de 50 refusé');
select pg_temp.ok(public.send_feedback('abcdEFGH1234', 'bug', 'Le son coupe', null, '{"ver":"x"}'::jsonb), 'send_feedback anon');
select pg_temp.ok(public.log_errors('abcdEFGH1234', '[{"m":"TypeError: x is null","f":"index.html","l":"12","c":"3"}]'::jsonb) = 1, 'log_errors anon');
select pg_temp.ok((select count(*) from public.app_config) = 0, 'app_config lisible par anon');
do $$ begin perform 1 from public.events limit 1; raise exception 'ÉCHEC : events lisible par anon'; exception when insufficient_privilege then raise notice 'ok  events illisible par anon'; end $$;
do $$ begin perform 1 from public.feedback limit 1; raise exception 'ÉCHEC : feedback lisible'; exception when insufficient_privilege then raise notice 'ok  feedback illisible par anon'; end $$;
do $$ begin insert into public.app_config (key, value) values ('flags', '{}'); raise exception 'ÉCHEC : app_config modifiable par anon'; exception when insufficient_privilege then raise notice 'ok  app_config non modifiable par anon'; end $$;
do $$ begin perform public.admin_dashboard(); raise exception 'ÉCHEC : admin_dashboard par anon'; exception when insufficient_privilege then raise notice 'ok  admin_dashboard refusé à anon'; end $$;
reset role;
-- frein du support : 5 messages par heure
set role anon;
select public.send_feedback('abcdEFGH1234', 'bug', 'message ' || g) from generate_series(1, 6) g;
reset role;
select pg_temp.ok((select count(*) from public.feedback) = 5, 'send_feedback : 5 par heure au plus');

-- 2. un joueur connecté (même en aal2) n'est pas administrateur
select pg_temp.as_user('00000000-0000-0000-0000-00000000000c', 'aal2');
set role authenticated;
select pg_temp.ok(public.track_events('playerCCCC01', '[{"n":"learn_end","p":{"what":"chords","sec":"95"}},{"n":"signup"}]'::jsonb) = 2, 'track_events d''un compte');
do $$ begin perform public.admin_dashboard(); raise exception 'ÉCHEC'; exception when insufficient_privilege then raise notice 'ok  joueur aal2 non admin : refusé'; end $$;
do $$ begin perform 1 from public.admin_log; raise exception 'ÉCHEC'; exception when insufficient_privilege then raise notice 'ok  admin_log illisible'; end $$;
reset role;
select pg_temp.ok((select user_id is not null from public.events where anon_id = 'playerCCCC01' limit 1), 'user_id rempli par auth.uid()');

-- 3. owner sans le code TOTP (aal1) : refusé
select pg_temp.as_user('00000000-0000-0000-0000-00000000000a', 'aal1');
set role authenticated;
do $$ begin perform public.admin_me(); raise exception 'ÉCHEC'; exception when insufficient_privilege then raise notice 'ok  owner en aal1 : refusé'; end $$;
reset role;

-- 4. owner en aal2 : tout se charge
select public.admin_nightly();
select pg_temp.as_user('00000000-0000-0000-0000-00000000000a', 'aal2');
set role authenticated;
select pg_temp.ok(public.admin_me() ->> 'role' = 'owner', 'admin_me owner');
select pg_temp.ok((public.admin_dashboard() ->> 'accounts')::int = 3, 'admin_dashboard');
select pg_temp.ok(jsonb_array_length(public.admin_dashboard() -> 'series') >= 1, 'admin_dashboard : série par jour');
select pg_temp.ok(public.admin_dashboard() -> 'retention' ? 'd1', 'admin_dashboard : rétention');
select pg_temp.ok(jsonb_array_length(public.admin_stats(current_date - 30, current_date) -> 'funnel') = 5, 'admin_stats : entonnoir');
select pg_temp.ok((public.admin_stats(current_date - 30, current_date, 'fr', 'phone', 'screen') ->> 'events')::int = 1, 'admin_stats : filtres langue/appareil/entrée');
do $$ begin perform public.admin_stats(current_date, current_date - 1); raise exception 'ÉCHEC'; exception when raise_exception then raise notice 'ok  admin_stats : période invalide refusée'; end $$;
select pg_temp.ok((public.admin_users('player') -> 'rows' -> 0 ->> 'email') = 'player@example.com', 'admin_users : recherche par e-mail (owner)');
select pg_temp.ok((public.admin_user('00000000-0000-0000-0000-00000000000c') -> 'progress' ->> 'input') = '"midi"' or (public.admin_user('00000000-0000-0000-0000-00000000000c') #>> '{progress,input}') = 'midi', 'admin_user : fiche');
select public.admin_user_rename('00000000-0000-0000-0000-00000000000c', 'Nouveau nom');
select public.admin_user_premium('00000000-0000-0000-0000-00000000000c', 30);
select public.admin_config_set('flags', '{"paywall":false}'::jsonb);
select public.admin_config_set('news', '{"fr":[["Titre","Texte","#6a4bf0","M4 4h16"]]}'::jsonb);
select pg_temp.ok(jsonb_array_length(public.admin_config_list()) = 2, 'admin_config_set / list');
select pg_temp.ok(public.admin_notifs() ? 'jobs', 'admin_notifs');
select pg_temp.ok(public.admin_notify_count('all') = 3, 'admin_notify_count');
select pg_temp.ok(public.admin_leagues() ? 'installed', 'admin_leagues');
select pg_temp.ok(jsonb_array_length(public.admin_feedback('new')) = 5, 'admin_feedback');
select public.admin_feedback_set((select (public.admin_feedback('') -> 0 ->> 'id')::bigint), 'done', 'réglé');
select pg_temp.ok((public.admin_system() ->> 'errors_24h')::int = 1, 'admin_system');
select pg_temp.ok(public.admin_user_export('00000000-0000-0000-0000-00000000000c') -> 'profile' ->> 'name' = 'Nouveau nom', 'admin_user_export');
select pg_temp.ok(jsonb_array_length(public.admin_log_list()) = 6, 'journal : une ligne par action');
select public.admin_user_reset('00000000-0000-0000-0000-00000000000c');
reset role;
select pg_temp.ok((select count(*) from public.progress) = 0, 'admin_user_reset');
do $$ begin update public.admin_log set action = 'x'; raise exception 'ÉCHEC'; exception when raise_exception then if sqlerrm like 'ÉCHEC%' then raise; end if; raise notice 'ok  admin_log en ajout seul (UPDATE refusé)'; end $$;
do $$ begin delete from public.admin_log; raise exception 'ÉCHEC'; exception when raise_exception then if sqlerrm like 'ÉCHEC%' then raise; end if; raise notice 'ok  admin_log en ajout seul (DELETE refusé)'; end $$;

-- 5. rôle lecture : pas d'e-mail, pas d'écriture
select pg_temp.as_user('00000000-0000-0000-0000-00000000000b', 'aal2');
set role authenticated;
select pg_temp.ok((public.admin_users('') -> 'rows' -> 0 ->> 'email') is null, 'lecture : e-mails masqués');
select pg_temp.ok((public.admin_users('player@example.com') -> 'rows') = '[]'::jsonb, 'lecture : pas de recherche par e-mail');
do $$ begin perform public.admin_config_set('flags', '{}'); raise exception 'ÉCHEC'; exception when insufficient_privilege then raise notice 'ok  lecture : config refusée'; end $$;
do $$ begin perform public.admin_user_premium('00000000-0000-0000-0000-00000000000c', 30); raise exception 'ÉCHEC'; exception when insufficient_privilege then raise notice 'ok  lecture : Premium refusé'; end $$;
do $$ begin perform public.admin_feedback(''); raise exception 'ÉCHEC'; exception when insufficient_privilege then raise notice 'ok  lecture : support refusé'; end $$;
reset role;

-- 6. le joueur lit son Premium offert
select pg_temp.as_user('00000000-0000-0000-0000-00000000000c', 'aal1');
set role authenticated;
select pg_temp.ok(public.my_premium() > now() + interval '29 days', 'my_premium');
reset role;

-- 7. ligues (seulement si la migration des ligues est chargée)
select pg_temp.as_user('00000000-0000-0000-0000-00000000000a', 'aal2');
set role authenticated;
select pg_temp.ok(case when to_regclass('public.league_members') is null then (public.admin_leagues() ->> 'installed') = 'false'
  else (public.admin_league_action('form') ->> 'ok') = 'true' and (public.admin_leagues() ->> 'installed') = 'true' end, 'ligues : détectées (ou « non installées »), former');
reset role;

-- 8. la fonction Edge « admin » (clé service) : journal et destinataires
select pg_temp.as_user(null, null);
set role service_role;
insert into public.admin_log (admin_id, action, target) values ('00000000-0000-0000-0000-00000000000a', 'user.delete', 'x');
select pg_temp.ok((select count(*) from public.admin_notify_targets('all')) = 3, 'service_role : journal + admin_notify_targets');
reset role;
