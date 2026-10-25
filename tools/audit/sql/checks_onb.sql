-- Vérifications de la migration de l'onboarding (2026-10-26_onboarding.sql), après checks.sql (mêmes comptes : a = owner, b = lecture, c = joueur).
\set ON_ERROR_STOP 1
create or replace function pg_temp.ok(c boolean, what text) returns void language plpgsql as $$ begin if not c then raise exception 'ÉCHEC : %', what; end if; raise notice 'ok  %', what; end $$;
create or replace function pg_temp.as_user(uid text, aal text) returns void language sql as $$
  select set_config('request.jwt.claims', case when uid is null then '{"role":"anon"}' else json_build_object('sub', uid, 'aal', aal, 'role', 'authenticated')::text end, false) $$;
-- deux appareils invités (fn) : l'un va au bout, l'autre passe tout ; un compte (onb) répond depuis l'app
select pg_temp.as_user(null, null);
set role anon;
select pg_temp.ok(public.track_events('onbDEV00001', '[
  {"n":"onb_view","p":{"s":"hw","ctx":"fn"},"d":"tablet"},{"n":"onb_view","p":{"s":"c","ctx":"fn"},"d":"tablet"},{"n":"first_note","p":{"how":"screen"},"d":"tablet"},
  {"n":"onb_view","p":{"s":"level","ctx":"fn"},"d":"tablet"},{"n":"onb_answer","p":{"q":"level","a":"debut","ctx":"fn"},"d":"tablet"},
  {"n":"onb_view","p":{"s":"why","ctx":"fn"},"d":"tablet"},{"n":"onb_answer","p":{"q":"why","a":"songs","ctx":"fn"},"d":"tablet"},
  {"n":"onb_view","p":{"s":"staff","ctx":"fn"},"d":"tablet"},{"n":"onb_skip","p":{"q":"staff","ctx":"fn"},"d":"tablet"},
  {"n":"onb_view","p":{"s":"time","ctx":"fn"},"d":"tablet"},{"n":"onb_answer","p":{"q":"time","a":"10","ctx":"fn"},"d":"tablet"},
  {"n":"onb_view","p":{"s":"recap","ctx":"fn"},"d":"tablet"},{"n":"onb_done","p":{"ctx":"fn","sec":"42","n":"3","sk":"1","level":"debut","dest":"pp"},"d":"tablet"}]'::jsonb) = 13, 'parcours complet envoyé (13 événements)');
select pg_temp.ok(public.track_events('onbDEV00002', '[{"n":"onb_view","p":{"s":"hw","ctx":"fn"},"d":"phone"},{"n":"onb_skip","p":{"q":"all","at":"hw","ctx":"fn"},"d":"phone"}]'::jsonb) = 2, 'appareil qui passe tout');
reset role;
select pg_temp.as_user('00000000-0000-0000-0000-00000000000c', 'aal1');
set role authenticated;
select pg_temp.ok(public.track_events('playerCCCC01', '[{"n":"onb_view","p":{"s":"level","ctx":"onb"}},{"n":"onb_answer","p":{"q":"level","a":"adv","ctx":"onb"}},{"n":"onb_answer","p":{"q":"why","a":"fun","ctx":"onb"}},{"n":"onb_answer","p":{"q":"why","a":"theory","ctx":"onb"}},{"n":"onb_done","p":{"ctx":"onb","sec":"30","n":"2","sk":"0","level":"adv","dest":"learn"}}]'::jsonb) = 5, 'compte : questionnaire (ctx onb)');
do $$ begin perform public.admin_onboarding(current_date - 7, current_date); raise exception 'ÉCHEC'; exception when insufficient_privilege then raise notice 'ok  admin_onboarding refusé à un joueur'; end $$;
do $$ begin perform public.admin_user_onb('00000000-0000-0000-0000-00000000000c'); raise exception 'ÉCHEC'; exception when insufficient_privilege then raise notice 'ok  admin_user_onb refusé à un joueur'; end $$;
reset role;
update public.progress set data = data || '{"onb":{"done":1,"v":2,"level":"adv","why":["theory"],"staff":"no","time":"20","ctx":"onb","sk":[],"sec":30,"email":"ne-doit-pas-sortir"}}'::jsonb where user_id = '00000000-0000-0000-0000-00000000000c';
-- anon ne peut pas appeler les fonctions
set role anon;
do $$ begin perform public.admin_onboarding(current_date - 7, current_date); raise exception 'ÉCHEC'; exception when insufficient_privilege then raise notice 'ok  admin_onboarding refusé à anon'; end $$;
reset role;
-- owner sans TOTP : refusé ; lecture en aal2 : accepté
select pg_temp.as_user('00000000-0000-0000-0000-00000000000a', 'aal1');
set role authenticated;
do $$ begin perform public.admin_onboarding(current_date - 7, current_date); raise exception 'ÉCHEC'; exception when insufficient_privilege then raise notice 'ok  owner en aal1 : refusé'; end $$;
reset role;
select pg_temp.as_user('00000000-0000-0000-0000-00000000000b', 'aal2');
set role authenticated;
create temp table r as select public.admin_onboarding(current_date - 7, current_date) j;
select pg_temp.ok((select jsonb_array_length(j -> 'funnel') = 10 from r), 'entonnoir : 10 étapes');
select pg_temp.ok((select (j -> 'funnel' -> 0 ->> 'n')::int = 2 and (j -> 'funnel' -> 2 ->> 'n')::int = 2 and (j -> 'funnel' -> 3 ->> 'n')::int = 2 and (j -> 'funnel' -> 9 ->> 'n')::int = 2 from r), 'entonnoir : 2 ouvrent, 2 jouent le Do (dont checks.sql), 2 voient le niveau, 2 valident');
select pg_temp.ok((select (j #>> '{answers,level,debut}')::int = 1 and (j #>> '{answers,level,adv}')::int = 1 and (j #>> '{answers,why,theory}')::int = 1 and (j #> '{answers,why}') ? 'fun' = false from r), 'réponses : dernière réponse par appareil');
select pg_temp.ok((select (j #>> '{skips,staff}')::int = 1 and (j #>> '{skips,all}')::int = 1 from r), 'sauts : par question et « tout passer »');
select pg_temp.ok((select (j #>> '{done,n}')::int = 2 and (j #>> '{done,sec_median}')::numeric = 36 and (j #>> '{done,dest,pp}')::int = 1 from r), 'programme validé : nombre, durée médiane, destination');
select pg_temp.ok((select (j #>> '{by_dev,tablet,start}')::int = 1 and (j #>> '{by_dev,tablet,done}')::int = 1 and (j #>> '{by_dev,phone,done}')::int = 0 from r), 'par appareil : commencé / validé');
select pg_temp.ok((select (public.admin_onboarding(current_date - 7, current_date, '', '', '', 'onb') -> 'funnel' -> 9 ->> 'n')::int = 1), 'filtre de parcours (onb)');
select pg_temp.ok((select (public.admin_onboarding(current_date - 7, current_date, '', 'phone') #>> '{done,n}')::int = 0), 'filtre d''appareil');
do $$ begin perform public.admin_onboarding(current_date - 7, current_date, '', '', '', 'x'); raise exception 'ÉCHEC'; exception when raise_exception then raise notice 'ok  parcours inconnu refusé'; end $$;
select pg_temp.ok((public.admin_user_onb('00000000-0000-0000-0000-00000000000c') #>> '{onb,level}') = 'adv' and (public.admin_user_onb('00000000-0000-0000-0000-00000000000c') #>> '{onb,time}') = '20', 'fiche joueur : réponses (progress.onb)');
select pg_temp.ok(not (public.admin_user_onb('00000000-0000-0000-0000-00000000000c') -> 'onb') ? 'email', 'fiche joueur : seules les clés connues sortent');
select pg_temp.ok(jsonb_array_length(public.admin_user_onb('00000000-0000-0000-0000-00000000000c') -> 'events') = 5, 'fiche joueur : ses événements d''onboarding');
select pg_temp.ok((public.admin_user_onb('00000000-0000-0000-0000-00000000000a') -> 'onb') = 'null'::jsonb or (public.admin_user_onb('00000000-0000-0000-0000-00000000000a') -> 'onb') is null, 'fiche joueur sans réponses : onb vide');
reset role;
