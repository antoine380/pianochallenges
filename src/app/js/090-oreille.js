// fragment de l'IIFE principale — ordre 090, voir src/app/README.md
// ---------- Ear training ----------
const INTS = [
  {id:"m2",s:1,lvl:3},{id:"M2",s:2,lvl:2},{id:"m3",s:3,lvl:1},{id:"M3",s:4,lvl:1},{id:"P4",s:5,lvl:2},{id:"TT",s:6,lvl:3},
  {id:"P5",s:7,lvl:1},{id:"m6",s:8,lvl:3},{id:"M6",s:9,lvl:3},{id:"m7",s:10,lvl:4},{id:"M7",s:11,lvl:4},{id:"P8",s:12,lvl:1}];
const EARCATS = [
  {id:"chord", lvl:1, fr:"Accords",     en:"Chords"},
  {id:"int",   lvl:1, fr:"Intervalles", en:"Intervals"},
  {id:"scale", lvl:2, fr:"Gammes",      en:"Scales"},
];
const EARCAT = Object.fromEntries(EARCATS.map(x=>[x.id,x]));
const earAnswers = cat => cat==="int" ? INTS : cat==="chord" ? CTYPES : TYPES;
function earLabel(cat,id,short){
  const L=S.settings.lang;
  if(cat==="int") return short ? t("intShort")[id] : t("intNames")[id];
  if(cat==="chord") return L==="fr"?CTYPE[id].fr:CTYPE[id].en;
  return L==="fr"?TYPE[id].fr:TYPE[id].en;
}
function earMidis(q){
  if(q.tid==="int"){ const s=INTS.find(x=>x.id===q.k).s; return [q.root,q.root+s]; }
  if(q.tid==="chord") return CTYPE[q.k].iv.map(v=>q.root+v);
  const sc=spellType(q.k,"C","up"); return sc.map(n=>q.root+n.pc).concat([q.root+12]);
}

