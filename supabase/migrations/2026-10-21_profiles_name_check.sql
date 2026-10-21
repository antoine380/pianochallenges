-- =====================================================================================
-- Migration 2026-10-21 : pseudos propres — À EXÉCUTER PAR ANTOINE dans Supabase > SQL Editor > New query > Run.
-- Idempotente. NOT VALID : les lignes déjà en base ne sont pas vérifiées (rien ne casse), seules les
-- nouvelles écritures (insert / update de profiles) doivent respecter la règle.
-- Règle (la même que nameErr() dans l'app) :
--   - 2 à 24 caractères après btrim (fini le pseudo « ␣␣␣ » ou d'une lettre vide) ;
--   - aucun caractère de contrôle (U+0000–001F, U+007F) ni de direction du texte
--     (U+200E/U+200F, U+202A–U+202E, U+2066–U+2069) : ils permettent d'afficher un faux score
--     (« Ana‮321 PX 0009 » s'affichait « AnaXP 123 9000 »).
-- Pour voir ensuite les lignes anciennes qui ne respectent pas la règle :
--   select id, name from public.profiles where not (char_length(btrim(name)) between 2 and 24
--     and name !~ '[[:cntrl:]‎‏‪-‮⁦-⁩]');
-- Pour les corriger puis valider la contrainte (facultatif) :
--   update public.profiles set name = 'Player' where <condition ci-dessus>;
--   alter table public.profiles validate constraint profiles_name_clean;
-- =====================================================================================
alter table public.profiles drop constraint if exists profiles_name_clean;
alter table public.profiles add constraint profiles_name_clean check (
  char_length(btrim(name)) between 2 and 24
  and name !~ U&'[\0001-\001F\007F\200E\200F\202A-\202E\2066-\2069]'
) not valid;
