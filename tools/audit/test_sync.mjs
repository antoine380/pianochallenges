// Non-régression synchronisation (#10 fusion champ par champ, #11 ownerId, #12 add_xp avec repli). PORT=8767 par défaut. Sort en code 1 si échec.
// Aucun Supabase réel : un faux client (fakesb.mjs) est injecté dans la page.
import { launch, newPage, baseState, closeModals, goPractice, press } from './harness.mjs';
import { FAKE_SB } from './fakesb.mjs';
const browser = await launch(); const bad=[];
const CM=[60,62,64,65,67,69,71,72];
const reattach=async(page,uid,opts={})=>{ await page.evaluate(FAKE_SB); await page.evaluate(([uid,o])=>{ const T=window.__T; Object.assign(window.__db,o); window.__db.uid=uid; T.sb=window.__mkSb(); T.user={id:uid,email:uid+'@test'}; },[uid,opts]); };
const waitBoot=async page=>{ try{ await page.waitForFunction(()=>!!window.__T,null,{timeout:6000}); }catch(e){} };

// #10 fusion champ par champ
try{
  const cloud={ xp:300, xpDays:{'2026-10-19':100,'2026-10-20':5}, mastery:{'major:C':3,'major:G':2}, srs:{'major:C':{it:{sec:'scales',tid:'major',k:'C'},box:3,due:'2026-10-25'}}, streak:{days:4,last:'2026-10-19'}, secStats:{scales:{ok:10,perfect:5,revealed:1,errors:3}}, gameBest:{speed:12}, runnerBest:900, settings:{lang:'en',notation:'en',delay:10}, seenTypes:['major','minor','pmaj'], profileName:'Cloudy' };
  const local={ xp:120, xpDays:{'2026-10-20':40}, mastery:{'major:C':1,'major:F':2}, srs:{'major:C':{it:{sec:'scales',tid:'major',k:'C'},box:1,due:'2026-10-21'},'major:F':{it:{sec:'scales',tid:'major',k:'F'},box:2,due:'2026-10-22'}}, streak:{days:1,last:'2026-10-20'}, secStats:{scales:{ok:3,perfect:1,revealed:0,errors:7}}, gameBest:{speed:5,memory:4}, runnerBest:100 };
  const { page, ctx } = await newPage(browser, { state: baseState({lang:'fr',notation:'fr',delay:5, extra:local}) }); await closeModals(page);
  const r=await page.evaluate(cloud=>window.__T.mergeState(window.__T.S, cloud), cloud); const m=r.merged;
  const checks={ xp:m.xp===300, xpDays:m.xpDays['2026-10-19']===100&&m.xpDays['2026-10-20']===40, mastery:m.mastery['major:C']===3&&m.mastery['major:G']===2&&m.mastery['major:F']===2,
    srs:m.srs['major:C'].due==='2026-10-25'&&m.srs['major:F'].due==='2026-10-22', streak:m.streak.days===1&&m.streak.last==='2026-10-20',
    secStats:m.secStats.scales.ok===10&&m.secStats.scales.errors===7, gameBest:m.gameBest.speed===12&&m.gameBest.memory===4, runnerBest:m.runnerBest===900,
    settingsLocaux:m.settings.lang==='fr'&&m.settings.delay===5, seenTypes:m.seenTypes.includes('pmaj'), profileName:m.profileName==='Cloudy', changed:r.changed===true };
  const ko=Object.entries(checks).filter(([,v])=>!v).map(([k])=>k);
  console.log('#10 mergeState :', ko.length?'KO '+ko.join(','):'tous les champs fusionnés ✓'); if(ko.length) bad.push('#10 fusion '+ko.join(','));
  // pull hors exercice : état fusionné écrit puis page rechargée
  await reattach(page,'u1',{progress:{u1:cloud}});
  await page.evaluate(()=>{ window.__T.cloudPull(); }); await page.waitForTimeout(800); await waitBoot(page);
  const after=await page.evaluate(()=>({xp:window.__T.S.xp, ls:JSON.parse(localStorage.getItem('memo-gammes-v1')).xp, lang:window.__T.S.settings.lang}));
  console.log('#10 après pull (hors exercice) :', JSON.stringify(after)); if(!(after.xp===300&&after.ls===300&&after.lang==='fr')) bad.push('#10 pull');
  // pull en plein exercice : appliqué en mémoire, pas de rechargement, l'exercice continue
  await goPractice(page,'scales');
  await reattach(page,'u1',{progress:{u1:{...JSON.parse(await page.evaluate(()=>localStorage.getItem('memo-gammes-v1'))), xp:999}}});
  await page.evaluate(()=>window.__T.startRound({sec:'scales',tid:'major',k:'C'})); await press(page,60);
  await page.evaluate(()=>window.__T.cloudPull()); await page.waitForTimeout(500);
  const mid=await page.evaluate(()=>({xp:window.__T.S.xp, phase:window.__T.phase, idx:window.__T.idx, pushed:window.__db.progress.u1.xp}));
  console.log('#10 pull en plein exercice :', JSON.stringify(mid)); if(!(mid.xp===999&&mid.phase==='listening'&&mid.idx===1&&mid.pushed===999)) bad.push('#10 pull en exercice');
  // visibilitychange : pas de nouveau pull sous 60 s
  const p0=await page.evaluate(()=>window.__T.lastPull); await page.evaluate(()=>document.dispatchEvent(new Event('visibilitychange'))); await page.waitForTimeout(200);
  if((await page.evaluate(()=>window.__T.lastPull))!==p0) bad.push('#10 pull répété < 60 s');
  await ctx.close();
}catch(e){ bad.push('#10 exception : '+e.message.split('\n')[0]); }
// pull pendant une partie d'Accompagnement (page acc) : appliqué en mémoire, pas de rechargement
try{
  const { page, ctx } = await newPage(browser, { state: baseState({lang:'fr',notation:'fr'}) }); await closeModals(page);
  if(await page.evaluate(()=>typeof window.__T.accStart==='function')){
    await page.evaluate(()=>{ window.__T.accOpen(); window.__T.accStart(); window.__noReload=1; }); await page.waitForTimeout(400);
    await reattach(page,'u1',{progress:{u1:{...JSON.parse(await page.evaluate(()=>localStorage.getItem('memo-gammes-v1'))), xp:777}}});
    await page.evaluate(()=>window.__T.cloudPull()); await page.waitForTimeout(800);
    const a=await page.evaluate(()=>({kept:window.__noReload===1, xp:window.__T.S.xp, page:window.__T.page, view:window.__T.ACC&&window.__T.ACC.view}));
    console.log('pull pendant l’Accompagnement :', JSON.stringify(a)); if(!(a.kept&&a.xp===777&&a.page==='acc'&&a.view==='play')) bad.push('pull en Accompagnement');
  }
  await ctx.close();
}catch(e){ bad.push('acc exception : '+e.message.split('\n')[0]); }
// #11 ownerId
try{
  const { page, ctx } = await newPage(browser, { state: baseState({extra:{xp:120, mastery:{'major:F':2}}}) }); await closeModals(page);
  await reattach(page,'u1',{progress:{u1:{xp:50, mastery:{'major:C':1}, settings:{lang:'en'}}}});
  await page.evaluate(()=>{ window.__T.setUser({id:'u1',email:'u1@test'}); }); await page.waitForTimeout(800); await waitBoot(page);
  await reattach(page,'u1',{}); await page.evaluate(async()=>{ await window.__T.setUser({id:'u1',email:'u1@test'}); }); await page.waitForTimeout(300);
  const g=await page.evaluate(()=>({xp:window.__T.S.xp, mC:window.__T.S.mastery['major:C'], mF:window.__T.S.mastery['major:F'], owner:window.__T.S.ownerId}));
  console.log('#11 invité qui se connecte (fusion + ownerId) :', JSON.stringify(g)); if(!(g.xp===120&&g.mC===1&&g.mF===2&&g.owner==='u1')) bad.push('#11 invité');
  await page.evaluate(async()=>{ await window.__T.setUser(null); });
  const lo=await page.evaluate(()=>({xp:window.__T.S.xp, owner:window.__T.S.ownerId}));
  console.log('#11 déconnexion (progression gardée, ownerId gardé) :', JSON.stringify(lo)); if(!(lo.xp===120&&lo.owner==='u1')) bad.push('#11 déconnexion');
  await page.evaluate(()=>{ window.__T.S.settings.delay=7; window.__T.save(); });
  await page.evaluate(()=>{ window.__db.uid='u2'; window.__T.sb=window.__mkSb(); });
  await page.evaluate(()=>{ window.__T.setUser({id:'u2',email:'u2@test'}); }); await page.waitForTimeout(800); await waitBoot(page);
  const sw=await page.evaluate(()=>({xp:window.__T.S.xp, mF:window.__T.S.mastery['major:F'], owner:window.__T.S.ownerId, delay:window.__T.S.settings.delay, lang:window.__T.S.settings.lang, u1:window.__db.progress.u1&&window.__db.progress.u1.xp}));
  console.log('#11 autre compte sur le même appareil (repart de zéro, réglages gardés) :', JSON.stringify(sw));
  if(!(sw.xp===0&&sw.mF==null&&sw.owner==='u2'&&sw.delay===7&&sw.lang==='fr'&&sw.u1===120)) bad.push('#11 changement de compte');
  await ctx.close();
}catch(e){ bad.push('#11 exception : '+e.message.split('\n')[0]); }
// #12 add_xp (delta) et repli sur l'upsert
for(const noRpc of [false,true]) try{
  const { page, ctx } = await newPage(browser, { state: baseState() }); await closeModals(page); await goPractice(page,'scales');
  await reattach(page,'u1',{noRpc});
  await page.evaluate(()=>window.__T.startRound({sec:'scales',tid:'major',k:'C'})); for(const n of CM) await press(page,n);
  await page.evaluate(()=>window.__T.cloudPushNow()); await page.evaluate(()=>window.__T.cloudPushNow());
  const r=await page.evaluate(()=>({xp:window.__T.S.xp, log:Object.values(window.__db.xp_log)[0], rpc:window.__db.rpcCalls.length, ok:!!window.__T.lastPushOk}));
  console.log('#12', noRpc?'sans add_xp (repli upsert) :':'avec add_xp (2 pushes, 1 seul crédit) :', JSON.stringify(r));
  if(!(r.log===r.xp && r.ok)) bad.push('#12 '+(noRpc?'repli':'rpc'));
  await page.evaluate(()=>{ window.__db.fail=true; });
  const e=await page.evaluate(async()=>{ try{ await window.__T.cloudPushNow(); }catch(x){} return {err:!!window.__T.lastPushErr, txt:window.__T.syncText()}; });
  if(!e.err) bad.push('#35 lastPushErr'); else if(noRpc) console.log('#35 état affiché après échec réseau :', e.txt);
  await ctx.close();
}catch(e){ bad.push('#12 exception : '+e.message.split('\n')[0]); }
// Revue UI 25/10 : aller-retour réel avec le serveur (il renvoie exactement ce que l'app a poussé, sérialisé en JSON), puis second pull : rien ne doit avoir changé.
// Avant : xpPushed (jours de plus de 7 j élagués au push mais rendus par la fusion), ordre des clés, objets vides ajoutés par les fusions → `changed` à chaque pull.
try{
  const d=n=>{const x=new Date(); x.setDate(x.getDate()-n); return x.toISOString().slice(0,10);};
  const xpDays={}; for(let i=0;i<20;i++) xpDays[d(i)]=40+i;
  const rich=(name,xp)=>({ xp, xpDays, xpPushed:{...xpDays}, mastery:{'major:C':3,'maj:G':2}, streak:{days:12,last:d(0)}, secStats:{chords:{ok:40,perfect:20,revealed:2,errors:5}},
    gameBest:{speed:22,memory:9}, runnerBest:1500, elo:{'runner-chords':{r:950,n:12,w:7,d:1,l:4}}, notifs:{list:[{id:'b',t:5,ti:'y'},{id:'a',t:1,ti:'x'}],keys:{a:1,b:1}},
    goal:{kind:'min',v:10,at:5,asked:1,done:d(1)}, freeze:{n:1,used:[d(30),d(10)],at:3}, seenTypes:['major'], profileName:name, introSeen:{scales:1,chords:1},
    pp:{v:1,done:{p01:{at:1,stars:3}}}, route:{done:{'s1.1':1}}, cnt:{notes:500}, badges:{first:'2026-10-01'}, midi:{hw:{name:name+' kb'},seenAt:1} });
  const A=await newPage(browser,{state:baseState({extra:rich('A',4200)})}), B=await newPage(browser,{state:baseState({extra:{...rich('B',5100), introSeen:{chords:1,ear:1}, notifs:{list:[{id:'c',t:9,ti:'z'}],keys:{c:1,b:1}}}})});
  for(const P of [A,B]){ await closeModals(P.page); await P.page.waitForTimeout(1500); await reattach(P.page,'u1'); await P.page.evaluate(()=>{ sessionStorage.setItem('pc-pull-reload',String(Date.now())); }); }
  const db=P=>P.page.evaluate(()=>JSON.parse(JSON.stringify(window.__db.progress.u1||null)));
  const setDb=(P,row)=>P.page.evaluate(r=>{ window.__db.progress.u1=JSON.parse(JSON.stringify(r)); },row);
  const pull=P=>P.page.evaluate(async()=>{ sessionStorage.setItem('pc-pull-reload',String(Date.now())); await window.__T.cloudPull(); });
  const chk=P=>P.page.evaluate(()=>{ const c=JSON.parse(JSON.stringify(window.__db.progress.u1)); const r=window.__T.mergeState(window.__T.S,c); const keys=Object.keys(r.merged).filter(k=>!window.__T.syncSame(r.merged[k],window.__T.S[k])); return {changed:r.changed, keys}; });
  // un appareil : push, pull (aller-retour), second pull
  await A.page.evaluate(()=>window.__T.cloudPushNow()); await pull(A); const one=await chk(A);
  console.log('aller-retour, second pull (un appareil) :', JSON.stringify(one)); if(one.changed) bad.push('second pull changed ('+one.keys.join(',')+')');
  // deux appareils : B pousse, A fusionne et repousse, B fusionne et repousse, puis plus rien ne change ni d'un côté ni de l'autre
  await B.page.evaluate(()=>window.__T.cloudPushNow()); await setDb(A, await db(B)); await pull(A); await setDb(B, await db(A)); await pull(B); await setDb(A, await db(B));
  const a2=await chk(A), b2=await chk(B);
  const ok2=await A.page.evaluate(()=>({xp:window.__T.S.xp, midi:window.__T.S.midi&&window.__T.S.midi.hw.name}));
  console.log('deux appareils après échange :', JSON.stringify({A:a2,B:b2,...ok2})); if(a2.changed||b2.changed) bad.push('deux appareils : changed ('+a2.keys.concat(b2.keys).join(',')+')');
  if(!(ok2.xp===5100 && ok2.midi==='A kb')) bad.push('deux appareils : fusion (xp '+ok2.xp+', midi '+ok2.midi+')');
  await A.ctx.close(); await B.ctx.close();
}catch(e){ bad.push('aller-retour exception : '+e.message.split('\n')[0]); }
await browser.close();
console.log(bad.length ? 'ECHEC : '+bad.join(' ; ') : 'OK test_sync');
process.exit(bad.length?1:0);
