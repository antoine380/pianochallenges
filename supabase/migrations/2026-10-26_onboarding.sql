-- Piano Challenges — chantier ONBOARDING (26/10/2026) : lecture des réponses du premier lancement dans le back office.
-- À lancer par Antoine dans l'éditeur SQL Supabase, APRÈS 2026-10-25_admin.sql (tables events, progress, admins ; fonctions admin_guard, admin_ev).
-- Rien de nouveau n'est stocké : l'app envoie déjà ses événements à track_events. Les nouveaux événements sont
--   onb_view   {s: hw|c|level|why|staff|time|how|recap, ctx: fn|onb}    un écran affiché (entonnoir)
--   onb_answer {q: level|why|staff|time|how, a: valeur, ctx}           une réponse (aucune donnée personnelle)
--   onb_skip   {q: <question>|rest|all, at?, ctx}                      une question sautée, « Passer » (le reste / tout)
--   onb_done   {ctx, sec, n, sk, level, dest}                          le programme validé (durée en secondes, réponses, sautées, destination)
-- ctx = fn (premier lancement, après la première note) ou onb (questionnaire après « Se connecter » / Réglages).
-- Idempotente (create or replace) ; security definer + search_path fixé ; lecture réservée aux administrateurs (admin_guard, aal2).

-- ---------- 1. statistiques de l'onboarding (écran Statistiques › Onboarding) ----------
-- même filtre que admin_stats (période en jours de Paris, langue, appareil, entrée) + p_ctx ('' = les deux parcours)
create or replace function public.admin_onboarding(p_from date, p_to date, p_lang text default '', p_dev text default '', p_inp text default '', p_ctx text default '')
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare out jsonb;
begin
  perform public.admin_guard('lecture');
  if p_from is null or p_to is null or p_to < p_from or p_to - p_from > 400 then raise exception 'bad period'; end if;
  if coalesce(p_ctx, '') not in ('', 'fn', 'onb') then raise exception 'bad ctx'; end if;
  with e as (
    select * from public.admin_ev(p_from, p_to, p_lang, p_dev, p_inp)
    where (name like 'onb\_%' or name = 'first_note') and (coalesce(p_ctx, '') = '' or name = 'first_note' or props ->> 'ctx' = p_ctx)),
  steps(k, ord) as (values ('hw',1),('c',2),('first_note',3),('level',4),('why',5),('staff',6),('time',7),('how',8),('recap',9),('done',10))
  select jsonb_build_object(
    -- entonnoir écran par écran : appareils distincts qui ont vu l'écran (first_note : ont joué le Do ; done : ont validé le programme)
    'funnel', (select coalesce(jsonb_agg(jsonb_build_object('k', s.k, 'n', (
        select count(distinct e.anon_id) from e where
          case s.k when 'first_note' then e.name = 'first_note'
                   when 'done' then e.name = 'onb_done'
                   else e.name = 'onb_view' and e.props ->> 's' = s.k end)) order by s.ord), '[]'::jsonb) from steps s),
    -- répartition des réponses par question (appareils distincts ; la dernière réponse de chacun)
    'answers', (select coalesce(jsonb_object_agg(q, a), '{}'::jsonb) from (
        select q, jsonb_object_agg(a, n) a from (
          select q, a, count(*) n from (
            select distinct on (anon_id, props ->> 'q') anon_id, props ->> 'q' q, left(props ->> 'a', 24) a
            from e where name = 'onb_answer' and props ->> 'q' in ('level','why','staff','time','how') order by anon_id, props ->> 'q', at desc, id desc) last
          group by q, a) x group by q) y),
    -- sauts : par question, « Passer » tout (avant la première note ou le questionnaire), « Passer » le reste
    'skips', (select coalesce(jsonb_object_agg(q, n), '{}'::jsonb) from (
        select left(props ->> 'q', 12) q, count(distinct anon_id) n from e where name = 'onb_skip' and props ? 'q' group by 1) s),
    'asked', (select coalesce(jsonb_object_agg(s, n), '{}'::jsonb) from (
        select props ->> 's' s, count(distinct anon_id) n from e where name = 'onb_view' and props ->> 's' in ('level','why','staff','time','how') group by 1) s),
    'done', (select jsonb_build_object('n', count(distinct anon_id),
        'sec_median', (select percentile_cont(0.5) within group (order by (props ->> 'sec')::numeric) from e where name = 'onb_done' and props ->> 'sec' ~ '^\d{1,6}$'),
        'answers_avg', round(avg(case when props ->> 'n' ~ '^\d{1,2}$' then (props ->> 'n')::numeric end), 2),
        'skipped_avg', round(avg(case when props ->> 'sk' ~ '^\d{1,2}$' then (props ->> 'sk')::numeric end), 2),
        'dest', (select coalesce(jsonb_object_agg(d, c), '{}'::jsonb) from (select coalesce(nullif(props ->> 'dest', ''), '?') d, count(*) c from e where name = 'onb_done' group by 1) s),
        'ctx', (select coalesce(jsonb_object_agg(c, k), '{}'::jsonb) from (select coalesce(props ->> 'ctx', '?') c, count(*) k from e where name = 'onb_done' group by 1) s))
      from e where name = 'onb_done'),
    -- par appareil : combien commencent (hw ou c vus) et combien valident le programme
    'by_dev', (select coalesce(jsonb_object_agg(d, jsonb_build_object('start', st, 'done', dn)), '{}'::jsonb) from (
        select coalesce(dev, '?') d,
               count(distinct anon_id) filter (where name = 'onb_view' and props ->> 's' in ('hw','c','level')) st,
               count(distinct anon_id) filter (where name = 'onb_done') dn
        from e group by 1) s)
  ) into out;
  return out;
end $$;

-- ---------- 2. fiche joueur : ses réponses (S.onb synchronisé dans progress) et ses événements d'onboarding ----------
create or replace function public.admin_user_onb(p_id uuid)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare d jsonb;
begin
  perform public.admin_guard('lecture');
  select data -> 'onb' into d from public.progress where user_id = p_id;
  return jsonb_build_object(
    'onb', case when jsonb_typeof(d) = 'object' then jsonb_strip_nulls(jsonb_build_object(
        'done', d -> 'done', 'skipped', d -> 'skipped', 'level', d -> 'level', 'why', d -> 'why', 'staff', d -> 'staff', 'time', d -> 'time',
        'how', d -> 'how', 'cont', d -> 'cont', 'place', d -> 'place', 'ctx', d -> 'ctx', 'sk', d -> 'sk', 'sec', d -> 'sec', 'quick', d -> 'quick', 'at', d -> 'at')) end,
    'events', (select coalesce(jsonb_agg(jsonb_build_object('at', at, 'name', name, 'props', props) order by at), '[]'::jsonb)
               from (select at, name, props from public.events where user_id = p_id and name like 'onb\_%' order by at desc limit 40) s));
end $$;

-- droits : comme les autres admin_* (compte connecté, puis is_admin vérifié dans la fonction)
do $g$ declare f record; begin
  for f in select p.oid::regprocedure sig from pg_proc p join pg_namespace n on n.oid = p.pronamespace
           where n.nspname = 'public' and p.proname in ('admin_onboarding','admin_user_onb') loop
    execute format('revoke all on function %s from public, anon', f.sig);
    execute format('grant execute on function %s to authenticated', f.sig);
  end loop;
end $g$;
