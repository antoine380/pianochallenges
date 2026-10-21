-- =====================================================================================
-- Migration 2026-10-21 : my_rank(since) — À EXÉCUTER PAR ANTOINE dans Supabase > SQL Editor > New query > Run.
-- Idempotente. Tant qu'elle n'est pas appliquée, l'app n'affiche simplement pas la ligne « 1 284e · Toi »
-- (l'appel échoue et l'erreur est ignorée).
-- Rang de l'utilisateur connecté (auth.uid()) quand il est hors du top 50 renvoyé par leaderboard(since).
-- Même logique que leaderboard : XP gagnée depuis `since` (xp_log, jours avec xp > 0) ;
-- since = null : classement « Depuis le début » (profiles.xp, comme la requête directe de l'app).
-- Ne renvoie que le rang et l'XP de l'appelant : rien sur les autres joueurs.
-- Égalités : rang = 1 + nombre de joueurs avec strictement plus d'XP (les ex aequo partagent le rang).
-- =====================================================================================
create or replace function public.my_rank(since date default null)
returns table (rank bigint, xp bigint)
language plpgsql stable security definer set search_path = public as $$
declare uid uuid := auth.uid(); mine bigint;
begin
  if uid is null then return; end if;
  if since is null then
    select p.xp::bigint into mine from public.profiles p where p.id = uid;
    if mine is null or mine <= 0 then return; end if;
    return query select (1 + count(*))::bigint, mine from public.profiles p where p.xp > mine;
  else
    select sum(l.xp)::bigint into mine from public.xp_log l where l.user_id = uid and l.day >= since and l.xp > 0;
    if mine is null or mine <= 0 then return; end if;
    return query
      select (1 + count(*))::bigint, mine
      from (select l.user_id from public.xp_log l join public.profiles p on p.id = l.user_id
            where l.day >= since and l.xp > 0 group by l.user_id having sum(l.xp) > mine) s;
  end if;
end $$;
revoke all on function public.my_rank(date) from public;
grant execute on function public.my_rank(date) to authenticated;
