-- MIDI 4 (28/10/2026) : l'administrateur connecté dans l'APP est prévenu d'un nouveau « Signaler un problème ».
-- À lancer par Antoine dans l'éditeur SQL Supabase, APRÈS 2026-10-25_admin.sql (tables admins, feedback, profiles ; admin_rank).
-- Idempotente (create or replace). Recopiée en fin de supabase/schema.sql.
--
-- Le back office /admin garde ses fonctions (admin_feedback, jeton aal2 = mot de passe + code TOTP). L'app, elle, n'a pas de code TOTP :
--   am_i_admin()             : vrai si le compte connecté est dans « admins » (n'apprend rien sur les autres comptes) ;
--   admin_feedback_peek(id)  : pour un compte admin de rôle « support » ou plus, les 5 derniers signalements d'id > p_after,
--                              réduits au strict nécessaire pour une alerte : id, date, type, pseudo public (profiles.name),
--                              80 premiers caractères du message (espaces ramenés à un seul). Jamais l'e-mail de contact, le contexte
--                              ni l'identifiant du joueur : le détail reste dans /admin (aal2). Tout autre appelant reçoit null.
-- Aucune table ni droit de lecture n'est ouvert : la RLS de « feedback » reste fermée (revoke all), tout passe par ces deux fonctions.

create or replace function public.am_i_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select auth.uid() is not null and exists (select 1 from public.admins a where a.user_id = auth.uid())
$$;
revoke all on function public.am_i_admin() from public, anon;
grant execute on function public.am_i_admin() to authenticated;

create or replace function public.admin_feedback_peek(p_after bigint default 0)
returns jsonb language plpgsql stable security definer set search_path = public as $$
begin
  if auth.uid() is null or not exists (select 1 from public.admins a
      where a.user_id = auth.uid() and public.admin_rank(a.role) >= public.admin_rank('support')) then
    return null;
  end if;
  return jsonb_build_object(
    'max', (select coalesce(max(id), 0) from public.feedback),
    'new', (select count(*) from public.feedback where status = 'new'),
    'rows', (select coalesce(jsonb_agg(jsonb_build_object('id', f.id, 'at', f.at, 'kind', f.kind, 'name', p.name,
                     'msg', left(regexp_replace(btrim(f.msg), '\s+', ' ', 'g'), 80)) order by f.id desc), '[]'::jsonb)
             from (select * from public.feedback where id > coalesce(p_after, 0) order by id desc limit 5) f
             left join public.profiles p on p.id = f.user_id));
end $$;
revoke all on function public.admin_feedback_peek(bigint) from public, anon;
grant execute on function public.admin_feedback_peek(bigint) to authenticated;
