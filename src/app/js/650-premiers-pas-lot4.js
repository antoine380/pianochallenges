// fragment de l'IIFE principale — ordre 650, voir src/app/README.md
/* ==== Premiers pas lot 4 (D5 placement, D23 compte, D24 rappel, D25 bilan, D28 micro) ==== */
// (intégration étape 4 : ACC/accS/accOpen… de la proposition de compte renommés ACCT/acctS/acctOpen… : ACC est l'Accompagnement)
// D5 : test de placement (PP.view="place", état PL) · D23 : « Garde tes progrès » (#accModal, S.acct={n,at,why}) · D24 : rappel de la prochaine leçon
// (notification « Rappels » ppr-<jour>, S.ppRem={n,last,kept}, heure S.settings.remindH, e-mail côté serveur : job « path » de notify) ·
// D25 : bilan de la semaine (#wkModal, S.wkRev={last}) · D28 : préparer le micro (#mpModal, S.micPrep={at,ok}, S.settings.micCents).
Object.assign(TXT.fr,{
  plKick:"Placement · 60 secondes", plT:"Montre-moi ce que tu sais", plSub:n=>n+" petites questions, on s'arrête au premier doute.", plGo:"C'est parti", plQ:(i,n)=>"Question "+i+" sur "+n,
  plIntro:"Quelques notes, deux accords et un rythme. Pas de piège : tu ne peux pas rater, on te place juste au bon endroit.",
  plNote:n=>"Joue un "+n, plNoteS:"N'importe lequel, sur tout le clavier.", plSeq:N=>"Joue "+N.join(" "), plSeqS:"L'une après l'autre, en montant.", plCont:"… continue",
  plMid:n=>"Joue le "+n+" central", plMidS:"Celui du milieu du clavier.", plChord:n=>"Joue "+n+" majeur", plChordS:N=>"("+N.join(" ")+" ensemble)", plChordM:"Au micro ou à l'écran : l'une après l'autre, c'est bon aussi.",
  plBeat:n=>"Joue un "+n+" sur chaque clic", plBeatS:"4 clics pour écouter, puis à toi : 4 fois.", plBeatL:"Écoute…", plBeatY:"À toi !",
  plDunno:"Je ne sais pas", plOk:"Bien !", plRes:"Résultat", plGood:n=>n+(n>1?" réponses justes":" réponse juste"), plStart:n=>"Tu commences à la leçon "+n,
  plAcqN:n=>n>1?"Les leçons 1 à "+n+" sont marquées « acquises ». Tu peux les ouvrir quand tu veux.":"La leçon 1 est marquée « acquise ». Tu peux l'ouvrir quand tu veux.", plAcq:"Acquise",
  plHere:"Commencer ici", plFromStart:"Reprendre depuis le début", plAllT:"Tu connais les bases !", plAllX:"On te propose les accords : étape 2 de Ma route.", plAllGo:"Aller aux accords", plAllPp:"Faire quand même les Premiers pas",
  plSet:"Test de placement", plOrC:n=>"ou joue un "+n,
  accT:"Garde tes progrès", accX:n=>"Tes "+n+(n>1?" leçons":" leçon")+", tes étoiles et ta série sur tous tes appareils.", accXg:"Ton objectif, tes étoiles et ta série sur tous tes appareils.",
  accLes:n=>n+(n>1?" leçons":" leçon"), accSt:n=>n+(n>1?" étoiles":" étoile"), accDay:n=>n+(n>1?" jours":" jour"), accG:"Continuer avec Google", accMail:"Recevoir un code par e-mail", accFree:"Gratuit. Pas de carte bancaire.", accLater:"Plus tard",
  remT0:n=>"Ta leçon "+n+" t'attend", remT1:n=>"2 minutes pour ta leçon "+n+" ?", remT2:n=>"On reprend ? Ta leçon "+n+" t'attend", remMel:"Ta mélodie t'attend", remKeptT:"Ta place est gardée", remKeptX:"Tes Premiers pas t'attendent, quand tu veux.",
  remHourL:"Heure du rappel", remHourD:"Ta prochaine leçon, une fois par jour, jamais après 21 h",
  wkT:"Ta semaine", wkRange:(a,b)=>"Du "+a+" au "+b, wkValid:"Semaine validée", wkDays:"jours joués", wkMin:"de piano", wkLes:"leçons", wkNotes:"notes apprises", wkXp:"XP gagnés", wkBestS:"meilleure série",
  wkYour:"Tes jours", wkBest:"Ta plus belle réussite", wkBestDay:(d,m)=>"Ta meilleure journée : "+d+" · "+m+" min", wkGoalQ:g=>"Ton objectif de "+g+", ça va ?", wkGoalX:(a,b)=>"Tu l'as atteint "+a+(a>1?" jours":" jour")+" sur "+b+".",
  wkGoalB:["Parfait","Plus","Moins"], wkGo:"Continuer", wkShare:"Partager", wkOne:n=>"Une semaine chargée ? 1 jour, c'est déjà ça."+(n?" Ta leçon "+n+" t'attend.":""), wkShareT:(d,m)=>"Ma semaine au piano : "+d+"/7 jours, "+m+" min",
  wkNtfT:"Ton bilan de la semaine", wkNtfX:(d,m)=>d+"/7 jours · "+m+" min", wkDOW:["L","M","M","J","V","S","D"], wkSaved:"Objectif mis à jour",
  mpOk:"Micro autorisé", mpWait:"On demande le micro…", mpNo:"Micro refusé", mpT:"On t'écoute", mpTips:d=>[d,"Évite la télé ou la musique autour","Joue normalement, pas besoin de taper fort"],
  mpDev:{ipad:"Pose l'iPad sur le pupitre",iphone:"Pose ton téléphone sur le pupitre",android:"Pose ton téléphone sur le pupitre",other:"Place l'ordinateur près du piano"}, mpPlay:n=>"Joue un "+n+" sur ton piano.", mpGot:n=>"Joue un "+n+" sur ton piano : on l'a bien entendu.", mpHeard:n=>"On entend un "+n+". Essaie un "+n+".",
  mpNoise:"Il y a du bruit autour : on entend mal.", mpLow:"Ton piano sonne un peu bas : on s'adapte.", mpHigh:"Ton piano sonne un peu haut : on s'adapte.", mpGo:"Ça marche", mpLater:"Plus tard",
  mpDenied:"Le micro est bloqué. Autorise-le pour Piano Challenges, puis réessaie.", mpDeniedApp:"Le micro est bloqué : ouvre Réglages › Piano Challenges › Micro, puis réessaie.", mpDeniedWeb:"Clique sur le cadenas à gauche de l'adresse, autorise le micro, puis réessaie.",
  mpRetry:"Réessayer", mpScreen:"Jouer sur l'écran", mpSet:"Préparer le micro"
});
Object.assign(TXT.en,{
  plKick:"Placement · 60 seconds", plT:"Show me what you know", plSub:n=>n+" short questions, we stop at the first doubt.", plGo:"Let's go", plQ:(i,n)=>"Question "+i+" of "+n,
  plIntro:"A few notes, two chords and a rhythm. No trick: you can't get it wrong, we just place you at the right spot.",
  plNote:n=>"Play "+ppArt(n), plNoteS:"Any of them, anywhere on the keyboard.", plSeq:N=>"Play "+N.join(" "), plSeqS:"One after the other, going up.", plCont:"… keep going",
  plMid:n=>"Play middle "+n, plMidS:"The one in the middle of the keyboard.", plChord:n=>"Play "+n+" major", plChordS:N=>"("+N.join(" ")+" together)", plChordM:"With the mic or on screen: one after the other is fine too.",
  plBeat:n=>"Play "+ppArt(n)+" on each click", plBeatS:"4 clicks to listen, then your turn: 4 times.", plBeatL:"Listen…", plBeatY:"Your turn!",
  plDunno:"I don't know", plOk:"Nice!", plRes:"Result", plGood:n=>n+(n>1?" right answers":" right answer"), plStart:n=>"You start at lesson "+n,
  plAcqN:n=>n>1?"Lessons 1 to "+n+" are marked as known. You can open them whenever you like.":"Lesson 1 is marked as known. You can open it whenever you like.", plAcq:"Known",
  plHere:"Start here", plFromStart:"Start from the beginning", plAllT:"You know the basics!", plAllX:"Let's go to chords: stage 2 of My path.", plAllGo:"Go to chords", plAllPp:"Do the First steps anyway",
  plSet:"Placement test", plOrC:n=>"or play "+ppArt(n),
  accT:"Keep your progress", accX:n=>"Your "+n+(n>1?" lessons":" lesson")+", your stars and your streak on all your devices.", accXg:"Your goal, your stars and your streak on all your devices.",
  accLes:n=>n+(n>1?" lessons":" lesson"), accSt:n=>n+(n>1?" stars":" star"), accDay:n=>n+(n>1?" days":" day"), accG:"Continue with Google", accMail:"Get a code by e-mail", accFree:"Free. No credit card.", accLater:"Later",
  remT0:n=>"Lesson "+n+" is waiting", remT1:n=>"2 minutes for lesson "+n+"?", remT2:n=>"Shall we go on? Lesson "+n+" is waiting", remMel:"Your melody is waiting", remKeptT:"Your spot is kept", remKeptX:"Your First steps are waiting, whenever you like.",
  remHourL:"Reminder time", remHourD:"Your next lesson, once a day, never after 9 pm",
  wkT:"Your week", wkRange:(a,b)=>a+" to "+b, wkValid:"Week complete", wkDays:"days played", wkMin:"of piano", wkLes:"lessons", wkNotes:"notes learned", wkXp:"XP earned", wkBestS:"best streak",
  wkYour:"Your days", wkBest:"Your best moment", wkBestDay:(d,m)=>"Your best day: "+d+" · "+m+" min", wkGoalQ:g=>"Your "+g+" goal, is it right?", wkGoalX:(a,b)=>"You reached it on "+a+" day"+(a>1?"s":"")+" out of "+b+".",
  wkGoalB:["Perfect","More","Less"], wkGo:"Continue", wkShare:"Share", wkOne:n=>"A busy week? 1 day still counts."+(n?" Lesson "+n+" is waiting.":""), wkShareT:(d,m)=>"My piano week: "+d+"/7 days, "+m+" min",
  wkNtfT:"Your week in review", wkNtfX:(d,m)=>d+"/7 days · "+m+" min", wkDOW:["M","T","W","T","F","S","S"], wkSaved:"Goal updated",
  mpOk:"Microphone allowed", mpWait:"Asking for the microphone…", mpNo:"Microphone blocked", mpT:"We're listening", mpTips:d=>[d,"Avoid the TV or music around you","Play normally, no need to hit hard"],
  mpDev:{ipad:"Put the iPad on the music stand",iphone:"Put your phone on the music stand",android:"Put your phone on the music stand",other:"Put the computer near the piano"}, mpPlay:n=>"Play "+ppArt(n)+" on your piano.", mpGot:n=>"Play "+ppArt(n)+" on your piano: we heard it well.", mpHeard:n=>"We hear "+ppArt(n)+". Try "+ppArt(n)+".",
  mpNoise:"It's noisy around you: we can't hear well.", mpLow:"Your piano sounds a little flat: we'll adjust.", mpHigh:"Your piano sounds a little sharp: we'll adjust.", mpGo:"It works", mpLater:"Later",
  mpDenied:"The microphone is blocked. Allow it for Piano Challenges, then try again.", mpDeniedApp:"The microphone is blocked: open Settings › Piano Challenges › Microphone, then try again.", mpDeniedWeb:"Click the padlock left of the address, allow the microphone, then try again.",
  mpRetry:"Try again", mpScreen:"Play on screen", mpSet:"Set up the microphone"
});
// mpHeard uses the note heard and the note asked: fix the FR/EN wording with two names
TXT.fr.mpHeard=(h,c)=>"On entend un "+h+". Essaie un "+c+"."; TXT.en.mpHeard=(h,c)=>"We hear "+ppArt(h)+". Try "+ppArt(c)+".";
Object.assign(NTF_ICON,{path:"learn", week:"scroll"});
const L4isO = x => x && typeof x==="object" && !Array.isArray(x);

