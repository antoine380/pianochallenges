// fragment de l'IIFE principale — ordre 750, voir src/app/README.md
// ---------- Liens des e-mails (?go=daily|pp|progress|hub, boutons des e-mails de la fonction notify) ----------
// lu une fois au démarrage puis retiré de l'adresse ; suivi seulement quand aucun écran de départ ne s'affiche (premier lancement, connexion, questionnaire, tutoriel)
const MAIL_GO = (()=>{ try{ const q=new URLSearchParams(location.search), g=q.get("go"); if(!g) return null; q.delete("go"); q.delete("from"); const s=q.toString(); history.replaceState(null,"",location.pathname+(s?"?"+s:"")+location.hash); return ["daily","pp","progress","hub","premium"].includes(g)?g:null; }catch(e){ return null; } })();
function mailGo(){ if(!MAIL_GO || gateNeeded() || !(S.onb&&S.onb.done) || !S.tourDone) return; try{ ntfDo({k:MAIL_GO}); }catch(e){} }

