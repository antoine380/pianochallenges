-- Vérifications de la migration Famille et paiement (2026-10-26_family.sql), lancées par run.sh sur une base jetable.
\set ON_ERROR_STOP 1
create or replace function pg_temp.ok(c boolean, what text) returns void language plpgsql as $$ begin if not c then raise exception 'ÉCHEC : %', what; end if; raise notice 'ok  %', what; end $$;
create or replace function pg_temp.as_user(uid text) returns void language sql as $$
  select set_config('request.jwt.claims', case when uid is null then '{"role":"anon"}' else json_build_object('sub', uid, 'aal', 'aal1', 'role', 'authenticated')::text end, false) $$;
create or replace function pg_temp.as_admin(uid text) returns void language sql as $$
  select set_config('request.jwt.claims', json_build_object('sub', uid, 'aal', 'aal2', 'role', 'authenticated')::text, false) $$;
-- l'erreur levée par une instruction (texte du message), ou '' si elle passe
create or replace function pg_temp.err(q text) returns text language plpgsql as $$ begin execute q; return ''; exception when others then return sqlerrm; end $$;
grant execute on all functions in schema pg_temp to authenticated, anon;

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000f1', 'owner@fam.test'), ('00000000-0000-0000-0000-0000000000f2', 'kid1@fam.test'),
  ('00000000-0000-0000-0000-0000000000f3', 'kid2@fam.test'), ('00000000-0000-0000-0000-0000000000f4', 'kid3@fam.test'),
  ('00000000-0000-0000-0000-0000000000f5', 'kid4@fam.test'), ('00000000-0000-0000-0000-0000000000f6', 'solo@fam.test');
insert into public.profiles (id, name, avatar) values ('00000000-0000-0000-0000-0000000000f1', 'Maman', 3), ('00000000-0000-0000-0000-0000000000f2', 'Léo', 1),
  ('00000000-0000-0000-0000-0000000000f3', 'Inès', 2), ('00000000-0000-0000-0000-0000000000f4', 'Noé', 4);

-- 1. un joueur ne peut rien écrire ; sans abonnement : pas de famille, entitlement vide
select pg_temp.as_user('00000000-0000-0000-0000-0000000000f1');
set role authenticated;
select pg_temp.ok(pg_temp.err($$insert into public.subscriptions (user_id, store, product, plan, status, store_id) values ('00000000-0000-0000-0000-0000000000f1','manual','x','family','active','x')$$) like '%permission%', 'subscriptions : pas d''écriture par un joueur');
select pg_temp.ok(pg_temp.err($$select public.sub_apply('{}'::jsonb)$$) like '%permission%', 'sub_apply refusé à un joueur');
select pg_temp.ok(public.my_entitlement() ->> 'plan' is null, 'my_entitlement vide sans abonnement');
select pg_temp.ok(public.family_status() ->> 'role' is null, 'family_status : pas de famille');
select pg_temp.ok(pg_temp.err('select public.family_invite()') = 'no_family', 'family_invite sans abonnement : no_family');
reset role;
select pg_temp.as_user(null); set role anon;
select pg_temp.ok(pg_temp.err('select public.my_entitlement()') like '%permission%', 'my_entitlement refusé à anon');
select pg_temp.ok(pg_temp.err('select public.family_status()') like '%permission%', 'family_status refusé à anon');
reset role;

-- 2. le serveur (clé service) enregistre un abonnement Famille → la famille est créée
set role service_role;
select pg_temp.ok((public.sub_apply(jsonb_build_object('user_id', '00000000-0000-0000-0000-0000000000f1', 'store', 'stripe', 'store_id', 'sub_TEST1', 'product', 'family_year',
  'plan', 'family', 'status', 'trialing', 'period_end', now() + interval '7 days', 'trial_end', now() + interval '7 days', 'customer_id', 'cus_TEST', 'amount_cents', 19900, 'currency', 'EUR', 'billing', 'year')) ->> 'family_id') is not null, 'sub_apply family : famille créée');
select pg_temp.ok((public.sub_apply(jsonb_build_object('store', 'stripe', 'store_id', 'sub_TEST1', 'plan', 'family', 'status', 'active', 'period_end', now() + interval '365 days')) ->> 'ok')::boolean, 'sub_apply : mise à jour sans user_id (retrouvé par store_id)');
select pg_temp.ok((select count(*) from public.subscriptions) = 1 and (select status from public.subscriptions) = 'active' and (select customer_id from public.subscriptions) = 'cus_TEST', 'une seule ligne, statut à jour, client gardé');
select pg_temp.ok(pg_temp.err($$select public.sub_apply('{"store":"stripe","store_id":"sub_X","plan":"life","status":"active","user_id":"00000000-0000-0000-0000-0000000000f1"}'::jsonb)$$) like '%check%', 'plan « life » refusé (pas d''offre à vie)');
select pg_temp.ok(public.sub_customer('00000000-0000-0000-0000-0000000000f1') = 'cus_TEST', 'sub_customer pour le portail');
reset role;

-- 3. le titulaire : Premium, famille 1/4, invitation
select pg_temp.as_user('00000000-0000-0000-0000-0000000000f1'); set role authenticated;
select pg_temp.ok(public.my_entitlement() ->> 'source' = 'self' and public.my_entitlement() ->> 'plan' = 'family', 'titulaire : entitlement family/self');
select pg_temp.ok(public.family_status() ->> 'role' = 'owner' and (public.family_status() ->> 'used')::int = 1 and (public.family_status() ->> 'seats')::int = 4, 'titulaire : 1 place prise sur 4');
select pg_temp.ok((select count(*) from public.subscriptions) = 1, 'le titulaire lit son abonnement (RLS)');
create temp table inv as select public.family_invite() j;
grant select on inv to authenticated, anon;
select pg_temp.ok((select j ->> 'code' from inv) ~ '^[A-HJ-NP-Z2-9]{8}$' and (select j ->> 'url' from inv) like 'https://pianochallenges.com/?fam=%', 'invitation : code de 8 caractères et lien ?fam=');
select pg_temp.ok((select (j ->> 'expires_at')::timestamptz from inv) between now() + interval '6 days 23 hours' and now() + interval '7 days 1 minute', 'invitation valable 7 jours');
select pg_temp.ok(public.family_status() -> 'invite' ->> 'code' = (select j ->> 'code' from inv), 'family_status montre l''invitation en cours');
reset role;

-- 4. un enfant voit « Rejoindre la famille de Maman », rejoint, devient Premium
select pg_temp.as_user('00000000-0000-0000-0000-0000000000f2'); set role authenticated;
select pg_temp.ok((select count(*) from public.subscriptions) = 0, 'RLS : un autre joueur ne voit pas l''abonnement');
select pg_temp.ok(public.family_invite_info((select j ->> 'code' from inv)) ->> 'owner' = 'Maman' and (public.family_invite_info((select j ->> 'code' from inv)) ->> 'ok')::boolean, 'family_invite_info : famille de Maman, place libre');
select pg_temp.ok(public.family_invite_info('ZZZZZZZZ') ->> 'error' = 'invite_invalid', 'code inconnu : invite_invalid');
select pg_temp.ok((public.family_join(lower((select j ->> 'code' from inv))) ->> 'used')::int = 2, 'family_join (minuscules acceptées) : 2/4');
select pg_temp.ok(public.my_entitlement() ->> 'source' = 'family' and public.my_entitlement() ->> 'family_owner' = 'Maman', 'membre : Premium par la famille');
select pg_temp.ok(public.family_status() ->> 'role' = 'member' and jsonb_array_length(public.family_status() -> 'members') = 2 and public.family_status() -> 'invite' = 'null'::jsonb, 'membre : voit les 2 membres, pas le code');
select pg_temp.ok(pg_temp.err('select public.family_invite()') = 'not_owner', 'un membre ne peut pas inviter');
select pg_temp.ok(pg_temp.err($$select public.family_remove('00000000-0000-0000-0000-0000000000f1')$$) = 'not_owner', 'un membre ne peut retirer personne');
select pg_temp.ok((select count(*) from public.family_members) = 1, 'RLS family_members : le membre lit sa famille (lui seul ici)');
reset role;
select pg_temp.as_user('00000000-0000-0000-0000-0000000000f3'); set role authenticated;
select pg_temp.ok(pg_temp.err(format('select public.family_join(%L)', (select j ->> 'code' from inv))) = 'invite_used', 'code déjà utilisé : invite_used');
reset role;

-- 5. limite : 4 personnes au total, titulaire compris
create or replace function pg_temp.inv_for_owner() returns text language plpgsql as $$ declare c text; begin
  perform set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000f1","role":"authenticated"}', false);
  c := public.family_invite() ->> 'code'; return c; end $$;
grant execute on function pg_temp.inv_for_owner() to authenticated;
set role authenticated;
create temp table c2 as select pg_temp.inv_for_owner() c;
select pg_temp.as_user('00000000-0000-0000-0000-0000000000f3');
select pg_temp.ok((public.family_join((select c from c2)) ->> 'used')::int = 3, 'Inès rejoint : 3/4');
create temp table c3 as select pg_temp.inv_for_owner() c;
create temp table c3b as select pg_temp.inv_for_owner() c;  -- remplace c3 (un seul lien en cours)
select pg_temp.as_user('00000000-0000-0000-0000-0000000000f4');
select pg_temp.ok(pg_temp.err(format('select public.family_join(%L)', (select c from c3))) = 'invite_invalid', 'un nouveau lien remplace l''ancien non utilisé');
select pg_temp.ok((public.family_join((select c from c3b)) ->> 'used')::int = 4, 'Noé rejoint : 4/4');
select pg_temp.as_user('00000000-0000-0000-0000-0000000000f1');
select pg_temp.ok(pg_temp.err('select public.family_invite()') = 'family_full', 'famille pleine : plus d''invitation (family_full)');
select pg_temp.ok((public.family_status() ->> 'left')::int = 0, 'family_status : 0 place restante');
reset role;
-- une invitation créée avant d'être plein ne passe pas non plus la limite
insert into public.family_invites (code, family_id, expires_at) select 'ABCDEFGH', id, now() + interval '1 day' from public.families;
select pg_temp.as_user('00000000-0000-0000-0000-0000000000f5'); set role authenticated;
select pg_temp.ok(pg_temp.err($$select public.family_join('ABCDEFGH')$$) = 'family_full', '5e personne refusée : family_full');
reset role;
update public.family_invites set expires_at = now() - interval '1 minute' where code = 'ABCDEFGH';
select pg_temp.as_user('00000000-0000-0000-0000-0000000000f5'); set role authenticated;
select pg_temp.ok(pg_temp.err($$select public.family_join('ABCDEFGH')$$) = 'invite_expired', 'lien expiré : invite_expired');

-- 6. quitter, retirer
select pg_temp.as_user('00000000-0000-0000-0000-0000000000f4');
select pg_temp.ok((public.family_leave() ->> 'ok')::boolean, 'Noé quitte la famille');
select pg_temp.ok(public.my_entitlement() ->> 'plan' is null, 'Noé n''est plus Premium');
select pg_temp.ok(pg_temp.err('select public.family_leave()') = 'not_member', 'quitter deux fois : not_member');
select pg_temp.as_user('00000000-0000-0000-0000-0000000000f1');
select pg_temp.ok(pg_temp.err('select public.family_leave()') = 'is_owner', 'le titulaire ne quitte pas sa propre famille');
select pg_temp.ok((public.family_remove('00000000-0000-0000-0000-0000000000f3') ->> 'ok')::boolean, 'le titulaire retire Inès');
select pg_temp.ok((public.family_status() ->> 'used')::int = 2, 'famille : 2/4 après le retrait');
select pg_temp.ok(pg_temp.err($$select public.family_remove('00000000-0000-0000-0000-0000000000f6')$$) = 'not_member', 'retirer un inconnu : not_member');
reset role;

-- 7. fin de l'abonnement du titulaire → les membres perdent le Premium ; prem_grants reste pris en compte
set role service_role;
select public.sub_apply(jsonb_build_object('store', 'stripe', 'store_id', 'sub_TEST1', 'plan', 'family', 'status', 'canceled'));
reset role;
select pg_temp.as_user('00000000-0000-0000-0000-0000000000f2'); set role authenticated;
select pg_temp.ok(public.my_entitlement() ->> 'plan' is null and (public.family_status() ->> 'active')::boolean = false, 'abonnement résilié : le membre n''est plus Premium, famille inactive');
reset role;
insert into public.prem_grants (user_id, until) values ('00000000-0000-0000-0000-0000000000f2', now() + interval '30 days');
select pg_temp.as_user('00000000-0000-0000-0000-0000000000f2'); set role authenticated;
select pg_temp.ok(public.my_entitlement() ->> 'source' = 'grant', 'mois offert : source grant');
reset role;
-- Solo en retard de paiement : encore Premium jusqu'à la fin de période
set role service_role;
select public.sub_apply(jsonb_build_object('user_id', '00000000-0000-0000-0000-0000000000f6', 'store', 'apple', 'store_id', '1000000123', 'product', 'pc_solo_year', 'plan', 'solo', 'status', 'past_due', 'period_end', now() + interval '3 days', 'amount_cents', 14900, 'currency', 'eur', 'billing', 'year'));
select public.sub_apply(jsonb_build_object('user_id', '00000000-0000-0000-0000-0000000000f5', 'store', 'stripe', 'store_id', 'sub_M', 'product', 'solo_month', 'plan', 'solo', 'status', 'active', 'period_end', now() + interval '20 days', 'amount_cents', 1799, 'currency', 'eur', 'billing', 'month'));
reset role;
select pg_temp.as_user('00000000-0000-0000-0000-0000000000f6'); set role authenticated;
select pg_temp.ok(public.my_entitlement() ->> 'plan' = 'solo' and public.my_entitlement() ->> 'store' = 'apple', 'solo Apple en retard de paiement : encore Premium');
select pg_temp.ok(pg_temp.err($$select public.family_join('ABCDEFGH')$$) <> '' , 'contrôles d''erreur clairs');
reset role;

-- 8. back office : admin_pay / admin_family (aal2 + table admins)
select pg_temp.as_admin('00000000-0000-0000-0000-0000000000f2'); set role authenticated;
select pg_temp.ok(pg_temp.err('select public.admin_pay()') like '%forbidden%', 'admin_pay refusé à un non-admin');
reset role;
select pg_temp.as_admin('00000000-0000-0000-0000-00000000000a'); set role authenticated;
create temp table pay as select public.admin_pay() j;
select pg_temp.ok((select (j ->> 'active')::int from pay) = 2 and (select (j ->> 'mrr_cents')::int from pay) = 1799 + round(14900 / 12.0), 'admin_pay : 2 abonnés, revenus mensuels = mensuel + annuel/12');
select pg_temp.ok((select j -> 'families' ->> 'n' from pay)::int = 1 and (select j -> 'families' ->> 'members' from pay)::int = 1 and (select (j ->> 'churn_30')::int from pay) = 1, 'admin_pay : familles, membres, résiliations');
select pg_temp.ok(public.admin_family('00000000-0000-0000-0000-0000000000f2') -> 'family' -> 'owner' ->> 'name' = 'Maman', 'admin_family : famille d''un membre');
select pg_temp.ok(public.admin_family('00000000-0000-0000-0000-0000000000f6') -> 'family' = 'null'::jsonb and jsonb_array_length(public.admin_family('00000000-0000-0000-0000-0000000000f6') -> 'subs') = 1, 'admin_family : joueur sans famille, ses abonnements');
select pg_temp.ok(public.admin_family('00000000-0000-0000-0000-0000000000f1') -> 'subs' -> 0 ->> 'customer_id' is null, 'admin_family : pas d''identifiant client Stripe exposé');
reset role;
select pg_temp.as_admin('00000000-0000-0000-0000-00000000000b'); set role authenticated;
select pg_temp.ok(pg_temp.err($$select public.admin_family_remove('00000000-0000-0000-0000-0000000000f2')$$) like '%forbidden%', 'admin_family_remove : rôle support requis');
reset role;
