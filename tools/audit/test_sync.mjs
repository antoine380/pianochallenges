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
await browser.close();
console.log(bad.length ? 'ECHEC : '+bad.join(' ; ') : 'OK test_sync');
process.exit(bad.length?1:0);
