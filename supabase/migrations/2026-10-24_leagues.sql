-- =====================================================================================
-- Migration 2026-10-24 : ligues hebdomadaires (proposition C11) — À EXÉCUTER PAR ANTOINE dans
-- Supabase > SQL Editor > New query > Run. Idempotente : peut être relancée sans risque.
-- Prérequis : schema.sql (profiles, xp_log, notifications) et les extensions pg_cron (déjà utilisée
-- par supabase/notifications.sql).
-- Tant qu'elle n'est pas appliquée, l'app garde l'ancien « Classement de la semaine » (l'appel à
-- my_league() répond « fonction introuvable » et l'app n'affiche pas la vue Ligue).
--
-- Principe
--   - 6 divisions : 0 Bronze, 1 Argent, 2 Or, 3 Saphir, 4 Rubis, 5 Diamant.
--   - Semaine du lundi au dimanche, heure de Paris (league_week()). L'XP comptée est celle de xp_log
--     (jours du lundi au dimanche, xp > 0), comme leaderboard(since).
--   - Lundi 00 h 05 (Paris) : league_form() range par division, au hasard, en groupes d'au plus 20,
--     les comptes qui ont gagné de l'XP les 14 derniers jours. Division = celle de leur dernière ligue
--     + promotion / relégation (Bronze au départ).
--   - Un compte absent de la formation (nouveau, revenu après une pause) rejoint un groupe de sa division
--     qui a moins de 20 joueurs à son premier appel de my_league() dans la semaine.
--   - Dimanche 20 h (Paris) : league_close() fige l'XP et le rang de chacun, décide la montée (top 5 avec
--     de l'XP, sauf en Diamant) ou la descente (3 derniers, hors top 5, sauf en Bronze) et écrit une
--     notification « fin de ligue » dans la table notifications (lue par l'app, kind 'rank').
--   - Classement dans un groupe : XP de la semaine décroissante, puis arrivée la plus ancienne.
--   - my_league() (security definer) : les membres du groupe de l'appelant, avec pseudo, avatar, photo,
--     niveau (publics dans profiles) et XP de la semaine. Jamais d'identifiant ni d'e-mail : la ligne de
--     l'appelant est signalée par me = true.
-- =====================================================================================

-- 1. tables (aucun accès direct depuis l'app : tout passe par my_league())
create table if not exists public.league_members (
  week date not null,                                   -- lundi de la semaine (Europe/Paris)
  user_id uuid not null references auth.users(id) on delete cascade,
  tier smallint not null check (tier between 0 and 5),  -- 0 Bronze … 5 Diamant
  grp integer not null check (grp >= 0),                -- numéro du groupe dans (week, tier)
  joined_at timestamptz not null default now(),
  final_xp integer,                                     -- rempli par league_close()
  final_rank smallint,
  move smallint check (move between -1 and 1),          -- 1 montée, 0 maintien, -1 descente
  primary key (week, user_id)
);
create index if not exists league_members_grp_idx on public.league_members (week, tier, grp);
create index if not exists league_members_user_idx on public.league_members (user_id, week desc);

create table if not exists public.league_weeks (
  week date primary key,
  formed_at timestamptz,
  closed_at timestamptz
);

alter table public.league_members enable row level security;
alter table public.league_weeks enable row level security;
-- RLS sans policy + aucun droit : ni anon ni authenticated ne lisent ou n'écrivent ces tables directement
revoke all on public.league_members from anon, authenticated;
revoke all on public.league_weeks from anon, authenticated;

-- 2. la semaine en cours (lundi, heure de Paris) et la fin de la ligue (dimanche 20 h, heure de Paris)
create or replace function public.league_week(ts timestamptz default now())
returns date language sql stable set search_path = public as $$
  select (date_trunc('week', ts at time zone 'Europe/Paris'))::date
$$;
create or replace function public.league_ends(wk date)
returns timestamptz language sql stable set search_path = public as $$
  select ((wk + 6)::timestamp + interval '20 hours') at time zone 'Europe/Paris'
$$;
revoke all on function public.league_week(timestamptz) from public;
revoke all on function public.league_ends(date) from public;

-- 3. fin de semaine : XP et rang figés, montée / descente, notification
create or replace function public.league_close(wk date default null, notify boolean default true)
returns integer
language plpgsql security definer set search_path = public as $$
#variable_conflict use_column
declare w date := coalesce(wk, public.league_week()); n integer := 0;
  tf text[] := array['Bronze','Argent','Or','Saphir','Rubis','Diamant'];
  te text[] := array['Bronze','Silver','Gold','Sapphire','Ruby','Diamond'];
begin
  perform pg_advisory_xact_lock(hashtext('pc-league-close-' || w));
  if exists (select 1 from public.league_weeks lw where lw.week = w and lw.closed_at is not null) then return 0; end if;
  with x as (
    select m.user_id, m.tier, m.grp, m.joined_at,
      coalesce((select sum(l.xp) from public.xp_log l where l.user_id = m.user_id and l.day between w and w + 6 and l.xp > 0), 0)::integer as xp
    from public.league_members m where m.week = w),
  r as (
    select x.*, row_number() over (partition by x.tier, x.grp order by x.xp desc, x.joined_at, x.user_id) as rk,
      count(*) over (partition by x.tier, x.grp) as cnt
    from x)
  update public.league_members m
     set final_xp = r.xp, final_rank = r.rk,
         move = case when r.rk <= 5 and r.xp > 0 and r.tier < 5 then 1
                     when r.rk > r.cnt - 3 and r.rk > 5 and r.tier > 0 then -1
                     else 0 end
    from r where m.week = w and m.user_id = r.user_id;
  get diagnostics n = row_count;
  if notify and n > 0 then
    insert into public.notifications (user_id, kind, cat, title, body, action)
    select m.user_id, 'rank', 'social',
      case when coalesce(np.lang, 'fr') = 'en'
        then te[m.tier + 1] || ' league is over: you finish #' || m.final_rank
        else 'Ligue ' || tf[m.tier + 1] || ' terminée : tu finis ' || m.final_rank || (case when m.final_rank = 1 then 'er' else 'e' end) end,
      case when coalesce(np.lang, 'fr') = 'en' then
        case m.move when 1 then 'Well played, you move up to ' || te[m.tier + 2] || '! Your new league starts on Monday.'
                    when -1 then 'You move down to ' || te[m.tier] || '. New league on Monday: time to climb back!'
                    else 'You stay in ' || te[m.tier + 1] || '. New league on Monday.' end
      else
        case m.move when 1 then 'Bravo, tu montes en ' || tf[m.tier + 2] || ' ! Ta nouvelle ligue commence lundi.'
                    when -1 then 'Tu descends en ' || tf[m.tier] || '. Nouvelle ligue lundi : à toi de remonter !'
                    else 'Tu restes en ' || tf[m.tier + 1] || '. Nouvelle ligue lundi.' end
      end,
      'rank'
    from public.league_members m left join public.notif_prefs np on np.user_id = m.user_id
    where m.week = w;
  end if;
  insert into public.league_weeks (week, closed_at) values (w, now())
    on conflict (week) do update set closed_at = coalesce(public.league_weeks.closed_at, now());
  return n;
end $$;
revoke all on function public.league_close(date, boolean) from public, anon, authenticated;

-- division d'un compte pour la semaine w : sa dernière ligue + montée / descente (Bronze s'il n'en a jamais eu)
create or replace function public.league_tier_for(uid uuid, w date)
returns smallint language sql stable security definer set search_path = public as $$
  select coalesce((select least(5, greatest(0, m.tier + coalesce(m.move, 0)))::smallint
                   from public.league_members m where m.user_id = uid and m.week < w
                   order by m.week desc limit 1), 0::smallint)
$$;
revoke all on function public.league_tier_for(uuid, date) from public, anon, authenticated;

-- 4. lundi : formation des groupes de 20 (au hasard, dans chaque division)
create or replace function public.league_form(wk date default null)
returns integer
language plpgsql security definer set search_path = public as $$
#variable_conflict use_column
declare w date := coalesce(wk, public.league_week()); n integer := 0;
begin
  perform pg_advisory_xact_lock(hashtext('pc-league-form-' || w));
  if exists (select 1 from public.league_weeks lw where lw.week = w and lw.formed_at is not null) then return 0; end if;
  -- la semaine précédente n'a pas été close (tâche du dimanche manquée) : on la clôt sans notification
  if exists (select 1 from public.league_members m where m.week = w - 7 and m.move is null) then
    perform public.league_close(w - 7, false);
  end if;
  with pool as (
    select a.user_id, public.league_tier_for(a.user_id, w) as tier
    from (select distinct l.user_id from public.xp_log l join public.profiles p on p.id = l.user_id
          where l.day >= w - 14 and l.day < w and l.xp > 0) a
    where not exists (select 1 from public.league_members m where m.week = w and m.user_id = a.user_id)),
  ng as (select pool.tier, ceil(count(*) / 20.0)::integer as k from pool group by pool.tier),
  ord as (select pool.user_id, pool.tier, row_number() over (partition by pool.tier order by random()) as rn from pool)
  -- groupes équilibrés : 21 joueurs = 11 + 10, pas 20 + 1 ; les arrivées de la semaine les complètent jusqu'à 20
  insert into public.league_members (week, user_id, tier, grp)
  select w, ord.user_id, ord.tier, ((ord.rn - 1) % ng.k)::integer from ord join ng on ng.tier = ord.tier
  on conflict (week, user_id) do nothing;
  get diagnostics n = row_count;
  insert into public.league_weeks (week, formed_at) values (w, now())
    on conflict (week) do update set formed_at = coalesce(public.league_weeks.formed_at, now());
  return n;
end $$;
revoke all on function public.league_form(date) from public, anon, authenticated;

-- 5. la ligue de l'appelant (appelée par l'app : sb.rpc("my_league"))
create or replace function public.my_league()
returns table (week date, tier integer, pos integer, name text, avatar integer, photo text, level integer,
               xp bigint, me boolean, ends_at timestamptz, closed boolean)
language plpgsql volatile security definer set search_path = public as $$
#variable_conflict use_column
declare uid uuid := auth.uid(); w date := public.league_week(); t smallint; g integer; cl boolean;
begin
  if uid is null then return; end if;                                       -- invité : rien
  if not exists (select 1 from public.profiles p where p.id = uid) then return; end if;
  if not exists (select 1 from public.league_weeks lw where lw.week = w and lw.formed_at is not null) then
    perform public.league_form(w);                                          -- la tâche du lundi n'est pas encore passée
  end if;
  select lw.closed_at is not null into cl from public.league_weeks lw where lw.week = w;
  select m.tier, m.grp into t, g from public.league_members m where m.week = w and m.user_id = uid;
  if t is null then
    if coalesce(cl, false) then return; end if;                             -- ligue close : on attend lundi
    perform pg_advisory_xact_lock(hashtext('pc-league-join-' || w));
    select m.tier, m.grp into t, g from public.league_members m where m.week = w and m.user_id = uid;
    if t is null then
      t := public.league_tier_for(uid, w);
      select m.grp into g from public.league_members m where m.week = w and m.tier = t
        group by m.grp having count(*) < 20 order by count(*), m.grp limit 1;
      if g is null then
        select coalesce(max(m.grp) + 1, 0) into g from public.league_members m where m.week = w and m.tier = t;
      end if;
      insert into public.league_members (week, user_id, tier, grp) values (w, uid, t, g)
        on conflict (week, user_id) do nothing;
    end if;
  end if;
  return query
    with x as (
      select m.user_id, m.joined_at,
        coalesce(m.final_xp, (select sum(l.xp) from public.xp_log l
                              where l.user_id = m.user_id and l.day between w and w + 6 and l.xp > 0), 0)::bigint as xp
      from public.league_members m where m.week = w and m.tier = t and m.grp = g)
    select w, t::integer,
      (row_number() over (order by x.xp desc, x.joined_at, x.user_id))::integer,
      p.name, p.avatar::integer, p.photo, p.level::integer, x.xp, x.user_id = uid,
      public.league_ends(w), coalesce(cl, false)
    from x join public.profiles p on p.id = x.user_id
    order by 3;
end $$;
revoke all on function public.my_league() from public;
-- anon aussi : l'app d'un invité peut ainsi savoir que la fonction existe (elle ne renvoie rien sans compte)
grant execute on function public.my_league() to anon, authenticated;

-- 6. planification (pg_cron, heures en UTC) : la fonction vérifie l'heure de Paris, ce qui suit
--    l'heure d'été et d'hiver (18 h UTC = 20 h à Paris en été, 19 h UTC = 20 h en hiver).
create extension if not exists pg_cron;
create or replace function public.league_cron(job text)
returns void language plpgsql security definer set search_path = public as $$
declare loc timestamp := now() at time zone 'Europe/Paris';
begin
  if job = 'close' and extract(isodow from loc) = 7 and extract(hour from loc) = 20 then
    perform public.league_close(public.league_week(), true);
  elsif job = 'form' and extract(isodow from loc) = 1 then
    perform public.league_form(public.league_week());
  end if;
end $$;
revoke all on function public.league_cron(text) from public, anon, authenticated;
select cron.unschedule(jobname) from cron.job where jobname in ('pc-league-close','pc-league-form');
select cron.schedule('pc-league-close', '0 18,19 * * 0',  $$ select public.league_cron('close') $$);  -- dimanche 20 h (Paris)
select cron.schedule('pc-league-form',  '5 22,23 * * 0',  $$ select public.league_cron('form') $$);   -- lundi 00 h 05 (Paris)

-- Pour essayer tout de suite (facultatif) : former les groupes de la semaine en cours
--   select public.league_form();
-- Pour voir les groupes :
--   select week, tier, grp, count(*) from public.league_members group by 1,2,3 order by 1 desc,2,3;
