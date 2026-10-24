-- Scénario du rappel de leçon (D24) : path_due() / path_mark() sur 9 comptes types. Lancé par tools/audit/sql/run.sh.
\set ON_ERROR_STOP 1
-- "maintenant" = aujourd'hui 18 h 10 à Paris
create temp table k as select (date_trunc('day', now() at time zone 'Europe/Paris') + interval '18 hours 10 minutes') at time zone 'Europe/Paris' as now, (now() at time zone 'Europe/Paris')::date as d;
insert into auth.users select ('00000000-0000-0000-0000-00000000000'||i)::uuid from generate_series(1,9) i;
create function pg_temp.u(i int) returns uuid language sql as $$ select ('00000000-0000-0000-0000-00000000000'||i)::uuid $$;
insert into public.progress(user_id,data) values
 (pg_temp.u(1),'{"pp":{"start":1,"done":{"p01":{},"p02":{},"p03":{}}}}'),
 (pg_temp.u(2),'{"pp":{"start":1,"done":{"p01":{}}}}'),
 (pg_temp.u(3),'{"pp":{"start":1,"done":{"p01":{}}}}'),
 (pg_temp.u(4),'{"pp":{"done":{"p01":{},"p02":{},"p03":{},"p04":{},"p05":{},"p06":{},"p07":{},"p08":{},"p09":{},"p10":{},"p11":{},"p12":{},"p13":{},"p14":{}}}}'),
 (pg_temp.u(5),'{"pp":{"start":1,"done":{}}}'),
 (pg_temp.u(6),'{"pp":{"start":1,"done":{"p01":{}}}}'),
 (pg_temp.u(7),'{"pp":{"start":1,"done":{"p01":{}}}}'),
 (pg_temp.u(8),'{"settings":{}}'),
 (pg_temp.u(9),'{"pp":{"done":{"p01":{},"p02":{}}}}');
insert into public.notif_prefs(user_id, email_streak, lang) select pg_temp.u(i), i<>2, case when i=9 then 'en' else 'fr' end from generate_series(1,9) i;
update public.notif_prefs set tz='America/New_York' where user_id=pg_temp.u(5);
update public.notif_prefs set last_path_mail=(select d from k)-1, path_mail_n=3 where user_id=pg_temp.u(6);
update public.notif_prefs set last_streak_mail=(select d from k) where user_id=pg_temp.u(7);
update public.notif_prefs set last_path_mail=(select d from k)-1, path_mail_n=2 where user_id=pg_temp.u(9);
insert into public.xp_log select pg_temp.u(i), (select d from k)-1, 20 from generate_series(1,9) i where i<>6;
insert into public.xp_log values (pg_temp.u(3),(select d from k),10), (pg_temp.u(6),(select d from k)-5,10);
select right(user_id::text,1) u, lang, kind, lesson, n, last_play from public.path_due((select now from k)) order by 1;
-- à 17 h : personne
select count(*) as a_17h from public.path_due((select now from k) - interval '1 hour');
-- u6 : dernier jeu il y a 14 jours → « place gardée »
update public.xp_log set day=(select d from k)-14 where user_id=pg_temp.u(6);
select right(user_id::text,1) u, kind, n from public.path_due((select now from k)) where user_id=pg_temp.u(6);
-- path_mark : compteur et dates
select public.path_mark(pg_temp.u(1),'remind',(select d from k),0); select public.path_mark(pg_temp.u(6),'kept',(select d from k),3);
select right(user_id::text,1) u, last_path_mail=(select d from k) as mail_today, path_mail_n, path_kept_mail=(select d from k) as kept from public.notif_prefs where user_id in (pg_temp.u(1),pg_temp.u(6)) order by 1;
select count(*) as u1_encore from public.path_due((select now from k)) where user_id=pg_temp.u(1);
-- contrainte : kind 'path' accepté, heure 21 refusée
insert into public.notifications(user_id,kind,cat,title,action) values (pg_temp.u(1),'path','remind','Ta leçon 4 t''attend','hub');
do $$ begin update public.notif_prefs set remind_hour=21 where user_id=pg_temp.u(1); raise exception 'heure 21 acceptée'; exception when check_violation then raise notice 'heure 21 refusée : ok'; end $$;
-- fuseau inconnu ignoré sans erreur
update public.notif_prefs set tz='Mars/Olympus' where user_id=pg_temp.u(9);
select count(*) as sans_u9 from public.path_due((select now from k)) where user_id=pg_temp.u(9);
