-- MIDI 4 : vérifications de 2026-10-28_admin_feedback.sql (am_i_admin, admin_feedback_peek), lancées par run.sh sur une base jetable.
\set ON_ERROR_STOP 1
insert into auth.users (id, email, created_at) values
  ('00000000-0000-0000-0000-0000000000d1', 'support@example.com', now()),
  ('00000000-0000-0000-0000-0000000000d2', 'lecture@example.com', now()),
  ('00000000-0000-0000-0000-0000000000d3', 'joueur@example.com', now()) on conflict do nothing;
insert into public.profiles (id, name) values ('00000000-0000-0000-0000-0000000000d3', 'Léa D') on conflict do nothing;
insert into public.admins (user_id, role) values ('00000000-0000-0000-0000-0000000000d1', 'support'), ('00000000-0000-0000-0000-0000000000d2', 'lecture') on conflict do nothing;
create or replace function pg_temp.ok(c boolean, what text) returns void language plpgsql as $$ begin if not c then raise exception 'ÉCHEC : %', what; end if; raise notice 'ok  %', what; end $$;
create or replace function pg_temp.as_user(uid text, aal text default 'aal1') returns void language sql as $$
  select set_config('request.jwt.claims', case when uid is null then '{"role":"anon"}' else json_build_object('sub', uid, 'aal', aal, 'role', 'authenticated')::text end, false) $$;

-- un joueur envoie un signalement (diagnostic MIDI sur plusieurs lignes)
select pg_temp.as_user('00000000-0000-0000-0000-0000000000d3'); set role authenticated;
select pg_temp.ok(public.send_feedback(null, 'bug', E'Le Do du haut   manque\n\n— Diagnostic du clavier MIDI —\nPorts vus : LUMI Keys BLOCK', 'lea@example.com', '{"midi":"LUMI Keys BLOCK"}'::jsonb), 'send_feedback (joueur connecté)');
select pg_temp.ok(public.am_i_admin() = false, 'am_i_admin : faux pour un joueur');
select pg_temp.ok(public.admin_feedback_peek(0) is null, 'admin_feedback_peek : null pour un joueur');
do $$ begin perform 1 from public.feedback limit 1; raise exception 'ÉCHEC : feedback lisible par un joueur'; exception when insufficient_privilege then raise notice 'ok  feedback toujours illisible (RLS / droits)'; end $$;
reset role;
-- anonyme : aucun accès
select pg_temp.as_user(null); set role anon;
do $$ begin perform public.am_i_admin(); raise exception 'ÉCHEC : am_i_admin ouvert à anon'; exception when insufficient_privilege then raise notice 'ok  am_i_admin refusé à anon'; end $$;
do $$ begin perform public.admin_feedback_peek(0); raise exception 'ÉCHEC : admin_feedback_peek ouvert à anon'; exception when insufficient_privilege then raise notice 'ok  admin_feedback_peek refusé à anon'; end $$;
reset role;
-- administrateur « lecture » : il sait qu'il est admin, mais ne lit pas les messages (comme admin_feedback)
select pg_temp.as_user('00000000-0000-0000-0000-0000000000d2'); set role authenticated;
select pg_temp.ok(public.am_i_admin() = true, 'am_i_admin : vrai pour un admin lecture');
select pg_temp.ok(public.admin_feedback_peek(0) is null, 'admin_feedback_peek : null pour le rôle lecture');
reset role;
-- administrateur « support » en aal1 (l'app, sans code TOTP) : l'alerte, réduite
select pg_temp.as_user('00000000-0000-0000-0000-0000000000d1', 'aal1'); set role authenticated;
select pg_temp.ok(public.am_i_admin() = true, 'am_i_admin : vrai pour un admin support (aal1)');
create temp table pk as select public.admin_feedback_peek(0) j;
select pg_temp.ok((select (j->>'max')::bigint >= 1 and jsonb_array_length(j->'rows') between 1 and 5 from pk), 'admin_feedback_peek : max + lignes');
select pg_temp.ok((select (j->'rows'->0->>'name') = 'Léa D' and (j->'rows'->0->>'msg') like 'Le Do du haut manque — Diagnostic%' and char_length(j->'rows'->0->>'msg') <= 80 from pk), 'extrait : pseudo public, 80 caractères, espaces ramenés');
select pg_temp.ok((select not ((j->'rows'->0) ? 'contact') and not ((j->'rows'->0) ? 'ctx') and not ((j->'rows'->0) ? 'user_id') from pk), 'jamais le contact, le contexte ni l''identifiant');
select pg_temp.ok((select jsonb_array_length(public.admin_feedback_peek((j->>'max')::bigint)->'rows') = 0 from pk), 'p_after = max : rien de nouveau');
select pg_temp.ok(pg_catalog.has_function_privilege('authenticated', 'public.admin_feedback_peek(bigint)', 'execute') and not pg_catalog.has_function_privilege('anon', 'public.am_i_admin()', 'execute'), 'droits : authenticated seulement');
reset role;
select pg_temp.ok((select prosecdef and proconfig::text like '%search_path=public%' from pg_proc where proname = 'admin_feedback_peek'), 'security definer + search_path fixé');
