// fragment de l'IIFE principale — ordre 886, voir src/app/README.md
/* ==== Matières une à une (chantier MATIÈRES, 31/10/2026) ==== */
// Chaque matière LEARN s'ouvre sur l'écran « une à une » (page sc1, moteur UA de js/800-gammes-une-a-une.js) : Accords, Gammes, Harmonie,
// Progressions, Oreille. La tuile « Gammes » ouvre « Gammes une à une » (plus de tuile en double). Grilles retenues :
//   Accords      : 12 fondamentales (Do…Si | Ré♭…Si♭) × types ; TRIADES (Majeur Mineur Diminué Augmenté Sus2 Sus4, fondamental),
//                  7e (Maj7 7 m7 ø7 °7, fondamental), RENVERSEMENTS (Majeur Mineur Diminué Maj7 7 m7 : l'accord dans toutes ses positions,
//                  plusieurs éléments) ; coupe par ligne.
//   Harmonie     : 12 tonalités × 7 degrés (I…VII) ; MAJEUR / MINEUR / MAJEUR 7e / MINEUR 7e ; une case = l'accord du degré ; coupe.
//   Progressions : 12 tonalités × progressions ; BASES (I–IV–V–I, I–V–vi–IV, vi–IV–I–V, I–vi–IV–V, i–iv–v–i) / PLUS LOIN (ii–V–I,
//                  i–VI–III–VII, blues, ii7–V7–Imaj7, canon) ; coupe.
//   Oreille      : une case par son à reconnaître (sans lignes) ; INTERVALLES / ACCORDS / GAMMES ; une case = 6 écoutes, le son et ses
//                  3 voisins les plus proches comme réponses (uaEarSet) ; pas de coupe.
// Étoiles : S.uaStars[sec][mode]["<k>-<tid>"] (fusion = max par case) ; mode choisi S.settings.uaMode[sec] ; tutoriel S.settings.uaTour[sec].
// « Configurer mon cours » #uaCfg (en haut de la page) = l'ancien écran de départ de la matière, inchangé (#secTabs). Ma route, Premiers
// pas, l'Entraînement du jour et les jeux lancent leurs parties comme avant. Textes : ceux de Gammes une à une, remplacés le temps
// d'une matière (UA_TX, uaUse). Test : tools/audit/r57_matieres.mjs.
const UA_SUBJ=["chords","scales","harmony","prog","ear"];
const uaFr = () => S.settings.lang==="fr";
const uaLang = (fr,en) => () => uaFr() ? fr : en;
// ---- Accords ----
const UA_CH={tri:["maj","min","dim","aug","sus2","sus4"], sev:["maj7","dom7","min7","hdim7","dim7"], inv:["maj","min","dim","maj7","dom7","min7"]};
const UA_CH_SH={maj:["Maj.","Maj"],min:["Min.","Min"],dim:["Dim.","Dim"],aug:["Aug.","Aug"],sus2:["Sus2","Sus2"],sus4:["Sus4","Sus4"],maj7:["Maj7","Maj7"],dom7:["7","7"],min7:["m7","m7"],hdim7:["ø7","ø7"],dim7:["°7","°7"]};
const uaCRoot = (tid,pc) => CROOTS[tid].find(k=>keyPc(k)===pc);
UA_DEF.chords={sec:"chords", col:"#c9463c", cups:true, rsep:7, sep:0,
  modes:[{v:"tri",l:uaLang("Triades","Triads")},{v:"sev",l:uaLang("7e","7ths")},{v:"inv",l:uaLang("Renversements","Inversions"),s:uaLang("Renv.","Inv.")}],
  cols:mode=>(UA_CH[mode]||UA_CH.tri).map(id=>({id, lg:uaFr()?CTYPE[id].fr:CTYPE[id].en, sh:UA_CH_SH[id][uaFr()?0:1]})),
  rows:mode=>SC1_PC.map(pc=>({id:pc, names:[...new Set((UA_CH[mode]||UA_CH.tri).map(tid=>noteName(tonicNote(uaCRoot(tid,pc)))))]})),
  k:(mode,tid,pc)=>uaCRoot(tid,pc),
  item:(tid,k)=>({sec:"chords",tid,k,inv:0}),
  queue:(tid,k,mode)=>mode==="inv" ? CTYPE[tid].iv.map((x,i)=>({sec:"chords",tid,k,inv:i})) : [{sec:"chords",tid,k,inv:0}],
  rvItems:(tid,k,mode)=>mode==="inv" ? CTYPE[tid].iv.map((x,i)=>({sec:"chords",tid,k,inv:i})) : [{sec:"chords",tid,k,inv:0}],
  name:(tid,k,mode)=>chordName(tid,k)+(mode==="inv"?" · "+(uaFr()?"renversements":"inversions"):""),
  ok:(tid,k,mode)=>!!UA_CH[mode] && UA_CH[mode].includes(tid) && !!CROOTS[tid] && CROOTS[tid].includes(k),
  lock:(tid,k)=>premType("chords",tid) || !keySimple(k), why:tid=>premType("chords",tid)?"types":"keys",
  row:(tid,k)=>keyPc(k), rowName:pc=>noteName(tonicNote(uaCRoot("maj",pc))), tn:k=>noteName(tonicNote(k))};
// ---- Harmonie ----
const UA_H={hmaj:"maj",hmin:"min",hmaj7:"maj7",hmin7:"min7"};
const uaHKey = (mode,pc) => TONICS[HTYPE[UA_H[mode]||"maj"].scale].find(k=>keyPc(k)===pc);
UA_DEF.harmony={sec:"harmony", col:"#2c56d6", cups:true, rsep:7, sep:0,
  modes:[{v:"hmaj",l:uaLang("Majeur","Major"),s:uaLang("Maj.","Maj.")},{v:"hmin",l:uaLang("Mineur","Minor"),s:uaLang("Min.","Min.")},{v:"hmaj7",l:uaLang("Majeur 7e","Major 7th"),s:uaLang("Maj. 7e","Maj. 7th")},{v:"hmin7",l:uaLang("Mineur 7e","Minor 7th"),s:uaLang("Min. 7e","Min. 7th")}],
  cols:mode=>{ const h=HTYPE[UA_H[mode]||"maj"], k0=h.scale==="major"?"C":"A"; return [0,1,2,3,4,5,6].map(d=>{ const r=hChord(h.scale,k0,d,h.sev).roman; return {id:String(d), lg:r, sh:r}; }); },
  rows:mode=>SC1_PC.map(pc=>({id:pc, names:[noteName(tonicNote(uaHKey(mode,pc)))]})),
  k:(mode,tid,pc)=>uaHKey(mode,pc),
  item:(tid,k,mode)=>({sec:"harmony",tid:UA_H[mode]||"maj",k,deg:+tid}),
  name:(tid,k,mode)=>itemName({sec:"harmony",tid:UA_H[mode]||"maj",k,deg:+tid}),
  ok:(tid,k,mode)=>!!UA_H[mode] && /^[0-6]$/.test(String(tid)) && TONICS[HTYPE[UA_H[mode]].scale].includes(k),
  lock:(tid,k,mode)=>premType("harmony",UA_H[mode]||"maj") || !keySimple(k), why:(tid,k,mode)=>premType("harmony",UA_H[mode]||"maj")?"types":"keys",
  row:(tid,k)=>keyPc(k), rowName:(pc,mode)=>noteName(tonicNote(uaHKey(mode,pc)))};
// ---- Progressions ----
const UA_P={pbase:["p145","pop","pop2","fifties","m145"], padv:["ii5i","mpop","blues","jazz","canon"]};
const uaPKey = (pid,pc) => TONICS[PROG[pid].scale].find(k=>keyPc(k)===pc);
const uaPName = pid => progName(pid)+(PROG[pid].scale==="minor"?(uaFr()?" (min.)":" (min.)"):"");
UA_DEF.prog={sec:"prog", col:"#6a3fd1", cups:true, rsep:7, sep:0,
  modes:[{v:"pbase",l:uaLang("Bases","Basics")},{v:"padv",l:uaLang("Plus loin","Further")}],
  cols:mode=>(UA_P[mode]||UA_P.pbase).map(id=>({id, lg:uaPName(id), sh:uaPName(id)})),
  rows:mode=>SC1_PC.map(pc=>({id:pc, names:[...new Set((UA_P[mode]||UA_P.pbase).map(pid=>noteName(tonicNote(uaPKey(pid,pc)))))]})),
  k:(mode,pid,pc)=>uaPKey(pid,pc),
  item:(pid,k)=>({sec:"prog",tid:pid,k}),
  name:(pid,k)=>itemName({sec:"prog",tid:pid,k}),
  ok:(pid,k,mode)=>!!UA_P[mode] && UA_P[mode].includes(pid) && TONICS[PROG[pid].scale].includes(k),
  lock:(pid,k)=>premType("prog",pid) || !keySimple(k), why:pid=>premType("prog",pid)?"types":"keys",
  row:(pid,k)=>keyPc(k), rowName:pc=>noteName(tonicNote(uaPKey("p145",pc))), tn:k=>noteName(tonicNote(k))};
// ---- Oreille ----
const UA_E={eint:"int", echord:"chord", escale:"scale"};
// the answers of a listen: the sound and its 3 closest neighbours in the list (intervals by size, chords and scales by family)
function uaEarSet(cat,id){ const L=earAnswers(cat).map(a=>a.id), i=L.indexOf(id);
  const near=L.map((x,j)=>[x,Math.abs(j-i)]).filter(([x])=>x!==id).sort((a,b)=>a[1]-b[1]).slice(0,3).map(x=>x[0]); return L.filter(x=>x===id||near.includes(x)); }
const uaEarItem = (cat,id) => ({sec:"ear",tid:cat,k:id,uaSet:uaEarSet(cat,id)});
// 6 listens: the sound 3 times, its neighbours 3 times, mixed
function uaEarQueue(cat,id){ const set=uaEarSet(cat,id), o=set.filter(x=>x!==id), q=[id,id,id].concat([0,1,2].map(()=>o[Math.floor(Math.random()*o.length)]));
  for(let i=q.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [q[i],q[j]]=[q[j],q[i]]; } return q.map(k=>({sec:"ear",tid:cat,k,uaSet:set})); }
UA_DEF.ear={sec:"ear", col:"#0e7490", cups:false, flat:true,
  modes:[{v:"eint",l:uaLang("Intervalles","Intervals"),s:uaLang("Interv.","Interv.")},{v:"echord",l:uaLang("Accords","Chords")},{v:"escale",l:uaLang("Gammes","Scales")}],
  cols:mode=>{ const cat=UA_E[mode]||"int"; return earAnswers(cat).map(a=>({id:a.id, lg:earLabel(cat,a.id), sh:cat==="int"?earLabel(cat,a.id,true):earLabel(cat,a.id)})); },
  rows:mode=>[{id:UA_E[mode]||"int", names:[""]}],
  k:mode=>UA_E[mode]||"int",
  item:(id,cat)=>uaEarItem(cat,id), queue:(id,cat)=>uaEarQueue(cat,id), rvItems:(id,cat)=>[uaEarItem(cat,id)],
  name:(id,cat)=>earLabel(cat,id),
  ok:(id,cat,mode)=>UA_E[mode]===cat && earAnswers(cat).some(a=>a.id===id),
  lock:(id,cat)=>premType("ear",cat), why:()=>"types", row:()=>null, rowName:()=>""};

// ---- textes : ceux de Gammes une à une, remplacés le temps d'une autre matière ----
const uaCap = s => s.charAt(0).toUpperCase()+s.slice(1);
// o : nm (titre), one/ones (élément), le, ce (« cet accord »), un, f (féminin), r1 (1 étoile), show (« je te montre … »), play (« tu … »), ev, seg (bulles du sous-mode)
function uaTxFr(o){ const e=o.f?"e":"", tous=o.f?"toutes les ":"tous les ";
  const none=o.none||("Pas encore joué"+e);
  return {sc1Name:o.nm, sc1PkNone:none, sc1Cell:(nm,n)=>nm+" : "+(n?n+(n>1?" étoiles":" étoile")+" sur 3":none.toLowerCase()), sc1OrC:c=>"Joue "+c+" pour "+(o.f?"la prochaine ":"le prochain ")+o.one,
    sc1R:n=>n>=3?"Sans faute !":n===2?uaCap(o.one)+" fini"+e+" !":n===1?o.r1+", continue !":"Prêt pour un nouvel essai ?",
    sc1New:"Nouveau record pour "+o.ce+" !", sc1Back:uaCap(tous+o.ones), sc1CupNtf:uaCap(tous+o.ones)+" de la ligne à 3 étoiles.",
    sc1CupA:(x,on)=>"Coupe de "+x+(on?" : gagnée":" : "+tous+o.ones+" à 3 étoiles"), sc1CupOff:x=>"Termine "+tous+o.ones+" de "+x+" avec 3 étoiles pour gagner la coupe.",
    sc1TmA:"Mode", sc1See:o.see, sc1DemoSub:o.demo, sc1DemoSubC:o.demo, sc1TurnSub:o.turn, sc1WellSub:"Rejoue ou passe à l'évaluation.",
    sc1PkTr:o.pkTr, sc1PkTrC:o.pkTr, sc1PkEv:o.pkEv, sc1PkEvC:o.pkEv,
    sc1RvB:n=>"Révision · "+(n>1?"tes "+n+" "+o.ones:o.f?"ta "+o.one:"ton "+o.one), sc1RvBS:n=>n>1?"Tes "+n+" "+o.ones:(o.f?"Ta ":"Ton ")+o.one,
    sc1RvTi:n=>"Révision de "+(n>1?"tes "+n+" "+o.ones:o.f?"ta "+o.one:"ton "+o.one), sc1RvNone:"Termine "+o.un+" avec 3 étoiles pour débloquer la révision.",
    sc1RvTx:"Rejoue d'un coup "+tous+o.ones+" que tu as réussi"+(o.f?"es":"s")+" sans faute (3 étoiles), pour les garder en mémoire.", sc1RvN:(n,m)=>n+" "+(n>1?o.ones:o.one)+" · "+m,
    sc1EndS:"Ta progression sur "+o.ce+" ne sera pas comptée.",
    sc1Tu:{seg:o.seg, cell:["Une case = "+o.un,["Touche une case pour "+o.go+".","{train}**Entraînement** : "+o.trTu+" Rien n'est noté.","{eval}**Évaluation** : "+o.evTu]],
      stars:["Les étoiles",["{s1}1 étoile : "+o.r1.toLowerCase()+".","{s2}2 étoiles : "+o.le+" fini"+e+", avec au moins une faute.","{s3}3 étoiles : "+o.le+" fini"+e+" sans faute."]],
      cup:["La coupe",["Au bout de chaque ligne, une coupe.","Tu la gagnes quand "+tous+o.ones+" de la ligne ont 3 étoiles."]],
      rv:["La révision",["Rejoue d'un coup "+tous+o.ones+" à 3 étoiles, pour les garder en mémoire.","Elle s'ouvre dès "+(o.f?"ta première ":"ton premier ")+o.one+" à 3 étoiles."]],
      cfg:UA_TU_CFG.fr},
    sc1RV:{3:["Sans faute !","Parfait, pas une seule faute !","Impeccable, du premier coup !","Zéro faute, bravo !","Propre et net : 3 étoiles !"],
      2:[uaCap(o.one)+" fini"+e+" !","Jusqu'au bout ! Le sans-faute est tout près.","Bien tenu jusqu'à la fin !"],
      1:[o.r1+", continue !","Bon début, continue !","Le début est là, la suite va venir !"], "1c":[o.r1+", continue !","Bon début, continue !"],
      0:["Prêt pour un nouvel essai ?","On remet ça ?","Chaque essai compte, on recommence ?","Pas grave, on y retourne ?"],
      cup:["Toute la ligne à 3 étoiles, chapeau !","Une coupe de plus dans ta vitrine !","Quelle régularité : la ligne complète !"],
      rec:["Nouveau record pour "+o.ce+" !","Mieux que la dernière fois !","Record battu, tu progresses !"]}}; }
function uaTxEn(o){ return {sc1Name:o.nm, sc1OrC:c=>"Play "+c+" for the next "+o.one,
    sc1R:n=>n>=3?"No mistake!":n===2?uaCap(o.one)+" finished!":n===1?o.r1+", keep going!":"Ready for another go?",
    sc1New:"New best for this "+o.one+"!", sc1Back:"All "+o.ones, sc1CupNtf:"All the "+o.ones+" of the row at 3 stars.",
    sc1CupA:(x,on)=>x+" cup"+(on?": won":": all the "+o.ones+" at 3 stars"), sc1CupOff:x=>"Finish all the "+x+" "+o.ones+" with 3 stars to win the cup.",
    sc1TmA:"Mode", sc1See:o.see, sc1DemoSub:o.demo, sc1DemoSubC:o.demo, sc1TurnSub:o.turn, sc1WellSub:"Play again or take the test.",
    sc1PkTr:o.pkTr, sc1PkTrC:o.pkTr, sc1PkEv:o.pkEv, sc1PkEvC:o.pkEv,
    sc1RvB:n=>"Review · "+(n>1?"your "+n+" "+o.ones:"your "+o.one), sc1RvBS:n=>n>1?"Your "+n+" "+o.ones:"Your "+o.one,
    sc1RvTi:n=>"Review your "+(n>1?n+" "+o.ones:o.one), sc1RvNone:"Finish a "+o.one+" with 3 stars to unlock the review.",
    sc1RvTx:"Play again, in one go, every "+o.one+" you nailed without a mistake (3 stars), to keep them in mind.", sc1RvN:(n,m)=>n+" "+(n>1?o.ones:o.one)+" · "+m,
    sc1EndS:"Your progress on this "+o.one+" won't count.",
    sc1Tu:{seg:o.seg, cell:["One box = one "+o.one,["Tap a box to "+o.go+".","{train}**Practice**: "+o.trTu+" Nothing is scored.","{eval}**Test**: "+o.evTu]],
      stars:["The stars",["{s1}1 star: "+o.r1.toLowerCase()+".","{s2}2 stars: the "+o.one+" finished, with at least one mistake.","{s3}3 stars: the "+o.one+" finished with no mistake."]],
      cup:["The cup",["At the end of each row, a cup.","You win it when all the "+o.ones+" of the row have 3 stars."]],
      rv:["The review",["Play all your 3-star "+o.ones+" again in one go, to keep them in mind.","It opens with your first 3-star "+o.one+"."]],
      cfg:UA_TU_CFG.en},
    sc1RV:{3:["No mistake!","Perfect, not a single mistake!","Spotless, first time!","Zero mistakes, well done!","Clean and neat: 3 stars!"],
      2:[uaCap(o.one)+" finished!","Right to the end! A clean run is close.","You held on to the end!"],
      1:[o.r1+", keep going!","Good start, keep going!","The start is there, the rest will come!"], "1c":[o.r1+", keep going!","Good start, keep going!"],
      0:["Ready for another go?","Shall we go again?","Every try counts, again?","No problem, let's go again?"],
      cup:["The whole row at 3 stars, hats off!","One more cup in your cabinet!","So steady: the full row!"],
      rec:["New best for this "+o.one+"!","Better than last time!","Record broken, you're improving!"]}}; }
const UA_TU_CFG={fr:["Configurer mon cours",["Tu préfères choisir toi-même ? Ici, tu règles ton cours comme avant : types, tonalités, chrono, aides.","Ces parties-là ne changent pas tes étoiles."]],
  en:["Set up my lesson",["Prefer to choose yourself? Here you set up your lesson as before: types, keys, timer, helps.","Those games don't change your stars."]]};
const UA_TX={fr:{
  chords:uaTxFr({nm:"Accords un à un", one:"accord", ones:"accords", le:"l'accord", ce:"cet accord", un:"un accord", r1:"3 notes justes", go:"jouer l'accord",
    see:"Revoir l'accord", demo:"Regarde et écoute l'accord, note par note.", turn:"À toi : joue-le. Ici, rien n'est noté.",
    pkTr:"Je te montre l'accord note par note, puis tu le joues avec les touches allumées et les doigtés. Rien n'est noté, à ton rythme.", pkEv:"Tu joues l'accord sans aide. Sans faute : 3 étoiles.",
    trTu:"je te montre l'accord, puis tu le joues avec les touches allumées et les doigtés.", evTu:"tu le joues seul, sans aide, pour gagner des étoiles.",
    seg:["Triades, 7e, renversements",["**TRIADES** : les accords de 3 notes, en position fondamentale.","**7e** : les accords de 4 notes.","**RENVERSEMENTS** : le même accord dans toutes ses positions, l'une après l'autre.","Chaque mode a ses propres étoiles."]]}),
  harmony:uaTxFr({nm:"Harmonie degré par degré", one:"degré", ones:"degrés", le:"l'accord", ce:"ce degré", un:"un degré", r1:"3 notes justes", go:"jouer l'accord de ce degré",
    see:"Revoir l'accord", demo:"Regarde et écoute l'accord du degré, note par note.", turn:"À toi : joue-le. Ici, rien n'est noté.",
    pkTr:"Je te montre l'accord du degré note par note, puis tu le joues avec les touches allumées et les doigtés. Rien n'est noté, à ton rythme.", pkEv:"Tu joues l'accord du degré sans aide. Sans faute : 3 étoiles.",
    trTu:"je te montre l'accord du degré, puis tu le joues avec les touches allumées et les doigtés.", evTu:"tu le joues seul, sans aide, pour gagner des étoiles.",
    seg:["Majeur, mineur, 7e",["Une ligne = une tonalité, une colonne = un degré (I à VII).","**MAJEUR** / **MINEUR** : les accords de 3 notes de la tonalité.","**7e** : les mêmes degrés en accords de 4 notes.","Chaque mode a ses propres étoiles."]]}),
  prog:uaTxFr({nm:"Progressions une à une", one:"progression", ones:"progressions", le:"la progression", ce:"cette progression", un:"une progression", f:true, r1:"3 accords justes", go:"la jouer",
    see:"Revoir la progression", demo:"Regarde et écoute les accords de la progression, un par un.", turn:"À toi : rejoue-la. Ici, rien n'est noté.",
    pkTr:"Je te montre les accords de la progression un par un, puis tu les rejoues avec les touches allumées. Rien n'est noté, à ton rythme.", pkEv:"Tu joues la progression sans aide. Sans faute : 3 étoiles.",
    trTu:"je te montre la progression, puis tu la rejoues avec les touches allumées et les doigtés.", evTu:"tu la joues seul, sans aide, pour gagner des étoiles.",
    seg:["Bases ou plus loin",["Une ligne = une tonalité, une colonne = une progression.","**BASES** : les enchaînements des chansons les plus connues.","**PLUS LOIN** : jazz, blues, canon…","Chaque mode a ses propres étoiles."]]}),
  ear:uaTxFr({nm:"Oreille son par son", none:"Pas encore écouté", one:"son", ones:"sons", le:"le son", ce:"ce son", un:"un son", r1:"3 bonnes réponses", go:"t'entraîner à le reconnaître",
    see:"Réécouter les sons", demo:"Écoute chaque son et retiens son nom.", turn:"À toi : quel son entends-tu ? Ici, rien n'est noté.",
    pkTr:"Je te fais écouter le son et ses voisins, chacun avec son nom, puis tu devines à ton rythme. Rien n'est noté.", pkEv:"6 écoutes sans aide : reconnais le son parmi ses voisins. Sans faute : 3 étoiles.",
    trTu:"je te fais écouter le son et ses voisins, puis tu devines.", evTu:"6 écoutes sans aide pour gagner des étoiles.",
    seg:["Intervalles, accords, gammes",["**INTERVALLES** : l'écart entre deux notes.","**ACCORDS** : majeur, mineur, 7e…","**GAMMES** : majeure, mineure, pentatonique…","Chaque mode a ses propres étoiles."]]})},
 en:{
  chords:uaTxEn({nm:"Chords one by one", one:"chord", ones:"chords", r1:"3 right notes", go:"play the chord",
    see:"See the chord again", demo:"Watch and listen to the chord, note by note.", turn:"Your turn: play it. Nothing is scored here.",
    pkTr:"I show you the chord note by note, then you play it with the keys lit and the fingering. Nothing is scored, take your time.", pkEv:"You play the chord without help. No mistake: 3 stars.",
    trTu:"I show you the chord, then you play it with the keys lit and the fingering.", evTu:"you play it on your own, with no help, to win stars.",
    seg:["Triads, 7ths, inversions",["**TRIADS**: 3-note chords, in root position.","**7THS**: 4-note chords.","**INVERSIONS**: the same chord in all its positions, one after the other.","Each mode has its own stars."]]}),
  harmony:uaTxEn({nm:"Harmony degree by degree", one:"degree", ones:"degrees", r1:"3 right notes", go:"play the chord of this degree",
    see:"See the chord again", demo:"Watch and listen to the chord of the degree, note by note.", turn:"Your turn: play it. Nothing is scored here.",
    pkTr:"I show you the chord of the degree note by note, then you play it with the keys lit and the fingering. Nothing is scored, take your time.", pkEv:"You play the chord of the degree without help. No mistake: 3 stars.",
    trTu:"I show you the chord of the degree, then you play it with the keys lit and the fingering.", evTu:"you play it on your own, with no help, to win stars.",
    seg:["Major, minor, 7ths",["One row = one key, one column = one degree (I to VII).","**MAJOR** / **MINOR**: the 3-note chords of the key.","**7TH**: the same degrees as 4-note chords.","Each mode has its own stars."]]}),
  prog:uaTxEn({nm:"Progressions one by one", one:"progression", ones:"progressions", r1:"3 right chords", go:"play it",
    see:"See the progression again", demo:"Watch and listen to the chords of the progression, one by one.", turn:"Your turn: play it again. Nothing is scored here.",
    pkTr:"I show you the chords of the progression one by one, then you play them back with the keys lit. Nothing is scored, take your time.", pkEv:"You play the progression without help. No mistake: 3 stars.",
    trTu:"I show you the progression, then you play it back with the keys lit and the fingering.", evTu:"you play it on your own, with no help, to win stars.",
    seg:["Basics or further",["One row = one key, one column = one progression.","**BASICS**: the chord changes of the best-known songs.","**FURTHER**: jazz, blues, canon…","Each mode has its own stars."]]}),
  ear:uaTxEn({nm:"Ear, sound by sound", one:"sound", ones:"sounds", r1:"3 right answers", go:"practise recognising it",
    see:"Hear the sounds again", demo:"Listen to each sound and remember its name.", turn:"Your turn: which sound do you hear? Nothing is scored here.",
    pkTr:"I play you the sound and its neighbours, each with its name, then you guess at your own pace. Nothing is scored.", pkEv:"6 listens without help: recognise the sound among its neighbours. No mistake: 3 stars.",
    trTu:"I play you the sound and its neighbours, then you guess.", evTu:"6 listens with no help, to win stars.",
    seg:["Intervals, chords, scales",["**INTERVALS**: the gap between two notes.","**CHORDS**: major, minor, 7th…","**SCALES**: major, minor, pentatonic…","Each mode has its own stars."]]})}};
Object.assign(TXT.fr,{uaCfg:"Configurer mon cours", uaCfgS:"Configurer", uaCfgA:"Configurer mon cours : choisir les types, les tonalités, le chrono et les aides, comme avant"});
Object.assign(TXT.en,{uaCfg:"Set up my lesson", uaCfgS:"Set up", uaCfgA:"Set up my lesson: choose the types, keys, timer and helps, as before"});
TXT.fr.sc1Tu.cfg=UA_TU_CFG.fr; TXT.en.sc1Tu.cfg=UA_TU_CFG.en;
// the scales' own texts are kept aside, and put back when the scales are shown again
const UA_TXB={fr:{}, en:{}};
["fr","en"].forEach(L=>Object.values(UA_TX[L]).forEach(o=>Object.keys(o).forEach(k=>{ if(!(k in UA_TXB[L])) UA_TXB[L][k]=TXT[L][k]; })));
let uaTxOn="scales";
function uaTx(sec){ if(uaTxOn===sec) return; uaTxOn=sec; ["fr","en"].forEach(L=>{ const o=UA_TX[L][sec]||{}; Object.keys(UA_TXB[L]).forEach(k=>{ TXT[L][k] = k in o ? o[k] : UA_TXB[L][k]; }); }); }
{ const o=uaUse; uaUse=function(sec){ const r=o.apply(this,arguments); uaTx(UA.cur); return r; }; }

// ---- LEARN : les tuiles des matières ouvrent leur page « une à une » ----
function uaOpen(sec){ if(!UA_DEF[sec]) return; uaUse(sec); openPage("sc1"); }
const uaAll = sec => UA_DEF[sec].modes.reduce((a,m)=>[a[0]+sc1Total(m.v), a[1]+sc1Max(m.v)],[0,0]);
function uaTiles(){ const box=$("learnTiles"); if(!box) return; const L=t("learnTiles");
  [...box.children].forEach((el,i)=>{ const row=L[i]; if(!row || !UA_DEF[row[0]]) return; const sec=row[0], [n,m]=uaAll(sec);
    const c=tile({color:TILE_COL[sec],obj:sec,kick:"Learn",title:row[1],desc:row[2],btn:t("rnPlay"),rec:"★ "+fmtN(n)+" / "+fmtN(m),onOpen:()=>uaOpen(sec)});
    c.dataset.id=sec; c.classList.add("ua-tile"); if(sec==="scales") c.classList.add("sc1-tile"); el.replaceWith(c); }); }
{ const o=renderLearn; renderLearn=function(){ const r=o.apply(this,arguments); try{ uaTiles(); }catch(e){ console.warn(e); } return r; }; }
if(page==="learn") renderLearn();

// ---- « Configurer mon cours » : l'ancien écran de départ de la matière ----
function uaCfg(){ const sec=UA.cur, b=$("secTabs").querySelector('[data-v="'+sec+'"]'); if(!b) return; sc1TipHide();
  if(!game && phase!=="idle") phase="idle"; // the start screen shows when nothing runs
  b.click(); }
{ const o=sc1Render; sc1Render=function(){ const r=o.apply(this,arguments); try{ const P=$("sc1Panel"), hd=$("sc1Help")||P.querySelector(".sc1-h"); if(!hd) return r;
    const b=document.createElement("button"); b.type="button"; b.id="uaCfg"; b.className="btn ua-cfg"; b.setAttribute("aria-label",t("uaCfgA"));
    b.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12M20 18h0"/><circle cx="16" cy="6" r="2"/><circle cx="10" cy="12" r="2"/><circle cx="18" cy="18" r="2"/></svg><span class="lg">'+esc(t("uaCfg"))+'</span><span class="sh" aria-hidden="true">'+esc(t("uaCfgS"))+'</span>';
    b.onclick=uaCfg; hd.after(b); }catch(e){ console.warn(e); } return r; }; }
{ const o=sc1TourSteps; sc1TourSteps=function(){ const r=o.apply(this,arguments), T=t("sc1Tu"); if(T && T.cfg && $("uaCfg")) r.push(["#uaCfg","",T.cfg]); return r; }; }

// ---- Oreille : les réponses d'une écoute = le son et ses voisins ; démonstration ; entraînement ----
const UAE={dm:-1};
{ const o=renderAnswers; renderAnswers=function(){ if(!(cur && cur.sec==="ear" && Array.isArray(cur.uaSet))) return o.apply(this,arguments);
    const box=$("answers"); box.innerHTML=""; const demo=!!(SC1.demo && sc1Tr());
    cur.uaSet.forEach((id,i)=>{ const b=document.createElement("button"); b.type="button"; b.textContent=earLabel(cur.tid,id);
      if(demo){ b.disabled=true; if(i===UAE.dm) b.classList.add("ua-dm"); }
      else if(phase!=="listening"){ b.disabled=true; if(id===cur.k) b.classList.add("right"); else if(id===earPick) b.classList.add("wrong"); }
      b.onclick=()=>earAnswer(id); box.appendChild(b); }); }; }
function uaEarSound(cat,ms){ if(cat==="int"){ tone(ms[0],0,.9,.22); tone(ms[1],.6,.9,.22); }
  else if(cat==="chord") ms.forEach(m=>tone(m,0,1.3,.16));
  else ms.forEach((m,i)=>tone(m,i*.2,.3,.2)); }
const uaEarStep = cat => cat==="scale" ? 2.9 : 2.1;
// the demo of a listen: each sound of the set, named, then « your turn »
{ const o=sc1Demo; sc1Demo=function(){ if(!(sc1Tr() && cur && cur.sec==="ear" && Array.isArray(cur.uaSet))) return o.apply(this,arguments);
    const g=game, set=cur.uaSet, cat=cur.tid, root=cur.root!=null?cur.root:(cat==="scale"?52:55);
    clearTimeout(advanceTimer); clearPlayTimers(); autoHelpHide(); cancelAnimationFrame(raf);
    phase="revealed"; SC1.demo=true; UAE.dm=-1; earPick=null; render();
    const step=uaEarStep(cat);
    set.forEach((id,i)=>playTimers.push(setTimeout(()=>{ if(game!==g || !SC1.demo || phase!=="revealed") return; UAE.dm=i; renderAnswers();
      uaEarSound(cat, earMidis({tid:cat,k:id,root})); }, (.3+i*step)*1000)));
    playTimers.push(setTimeout(()=>{ if(game===g && SC1.demo && phase==="revealed"){ UAE.dm=-1; sc1Turn(); } }, (.3+set.length*step+.4)*1000)); }; }
// « À toi » / « Rejouer » : Oreille = une nouvelle écoute ; renversements = la case depuis le début
{ const o=sc1Turn; sc1Turn=function(){ if(!sc1Tr() || !cur) return o.apply(this,arguments); const s=game.sc1;
    if(cur.sec==="ear" && Array.isArray(cur.uaSet)){ SC1.demo=false; UAE.dm=-1; clearPlayTimers(); const set=cur.uaSet;
      startRound({...cur, k:set[Math.floor(Math.random()*set.length)], root:null}, true); return; }
    if(phase==="success" && s && s.multi){ sc1Play(s.tid,s.k,s.mode,"train"); return; }
    return o.apply(this,arguments); }; }
// a wrong answer while training (Oreille): the right one is shown and heard, nothing more
{ const o=earAnswer; earAnswer=function(id){ if(!(sc1Tr() && phase==="listening" && cur && cur.sec==="ear") || id===cur.k) return o.apply(this,arguments);
    earPick=id; errors=1; phase="revealed"; SC1.demo=false; render(); try{ showEarKeys(); playScale(0); }catch(e){} }; }
// renversements en entraînement : chaque position réussie passe à la suivante (démonstration, puis à toi) ; « Bien joué » à la fin
{ const o=success; success=function(){ if(!(sc1Tr() && game.sc1.multi && cur && cur.sec!=="ear" && game.i<game.total-1)) return o.apply(this,arguments);
    const g=game; phase="success"; SC1.demo=false; cancelAnimationFrame(raf); clearTimeout(advanceTimer);
    try{ const root=48+(seqMidis()[0]%12); [0,4,7].forEach((iv,i)=>tone(root+iv+24,i*.07,.4,.14)); }catch(e){}
    render(); playTimers.push(setTimeout(()=>{ if(game===g && phase==="success" && sc1Tr()){ startRound(); sc1Demo(); } },900)); }; }
// the actions of that short pause: nothing to press
{ const o=renderActions; renderActions=function(){ const r=o.apply(this,arguments); try{ if(sc1Tr() && phase==="success" && game.sc1.multi && cur && cur.sec!=="ear" && game.i<game.total-1) $("actions").innerHTML="";
      else if(sc1Tr() && phase==="listening" && cur && cur.sec==="ear"){ const a=$("actions"), b=document.createElement("button"); b.type="button"; b.className="btn primary"; b.id="uaReplay"; b.textContent=tx("replay"); b.onclick=()=>playScale(0); a.appendChild(b); } }catch(e){} return r; }; }

// ---- fusion entre appareils : étoiles (max par case), tutoriels vus (OU) ----
{ const o=mergeState; mergeState=function(local, cloud){ const r=o.apply(this,arguments); try{
      const a=uaIsO(local)&&uaIsO(local.uaStars)?local.uaStars:{}, b=uaIsO(cloud)&&uaIsO(cloud.uaStars)?cloud.uaStars:{};
      if(Object.keys(a).length || Object.keys(b).length){ const m={};
        UA_SUBJ.filter(s=>s!=="scales").forEach(sec=>UA_DEF[sec].modes.forEach(({v})=>{ const x={};
          [a[sec],b[sec]].forEach(o2=>{ const z=uaIsO(o2)&&uaIsO(o2[v])?o2[v]:null; if(z) Object.entries(z).forEach(([k,n])=>{ n=Math.max(0,Math.min(3,Math.floor(+n)||0)); if(n && /^[A-Za-z#]+-[A-Za-z0-9#]+$/.test(k)) x[k]=Math.max(x[k]||0,n); }); });
          if(Object.keys(x).length){ (m[sec]=m[sec]||{})[v]=x; } }));
        r.merged.uaStars=m; }
      const ta=local&&local.settings&&local.settings.uaTour, tb=cloud&&cloud.settings&&cloud.settings.uaTour;
      if(r.merged && r.merged.settings && (uaIsO(ta)||uaIsO(tb))){ const u={}; [ta,tb].forEach(x=>{ if(uaIsO(x)) Object.keys(x).forEach(k=>{ if(UA_DEF[k] && x[k]) u[k]=1; }); }); r.merged.settings.uaTour=u; }
      r.changed=!syncSame(r.merged,local); }catch(e){ console.warn(e); } return r; }; }
/* ==== fin Matières une à une ==== */
