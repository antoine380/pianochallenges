// Non-régression XP (#8 réessai après révélation, #9 bonus de temps). PORT=8767 par défaut. Sort en code 1 si échec.
import { launch, newPage, baseState, closeModals, goPractice, press } from './harness.mjs';
const browser = await launch(); const bad=[];
const CM=[60,62,64,65,67,69,71,72];
const playScale=async(page,ns)=>{ for(const n of ns) await press(page,n); };
const gainOf=async(page,play)=>{ const x0=await page.evaluate(()=>window.__T.S.xp); await play(); return page.evaluate(x=>window.__T.S.xp-x,x0); };

// #9 : même gamme jouée instantanément avec 5 s / 10 s / 20 s / sans chrono → 5 s > 10 s > 20 s > sans chrono, et sans chrono ≥ 60 % du 5 s
const xp={};
for(const d of [20,10,5,0]){
  const { page, ctx } = await newPage(browser, { state: baseState({delay:d}) }); await closeModals(page); await goPractice(page,'scales');
  xp[d]=await gainOf(page, async()=>{ await page.evaluate(()=>window.__T.startRound({sec:'scales',tid:'major',k:'C'})); await playScale(page,CM); });
  await ctx.close();
}
console.log('#9 XP gamme parfaite instantanée : 5 s', xp[5], '| 10 s', xp[10], '| 20 s', xp[20], '| sans chrono', xp[0]);
if(!(xp[5]>xp[10] && xp[10]>xp[20] && xp[20]>xp[0])) bad.push('#9 ordre 5 s > 10 s > 20 s > sans chrono');
if(!(xp[0]>=xp[5]*0.6)) bad.push('#9 sans chrono pénalisé 2× ('+xp[0]+' vs '+xp[5]+')');
// bonus de temps : réponse tardive (5 s sur 10 s) < réponse instantanée
{
  const { page, ctx } = await newPage(browser, { state: baseState({delay:10}) }); await closeModals(page); await goPractice(page,'scales');
  const late=await gainOf(page, async()=>{ await page.evaluate(()=>window.__T.startRound({sec:'scales',tid:'major',k:'C'})); await page.waitForTimeout(5200); await playScale(page,CM); });
  console.log('#9 réponse après 5 s sur 10 s :', late, '(instantanée :', xp[10]+')');
  if(!(late<xp[10])) bad.push('#9 bonus de temps non proportionnel');
  await ctx.close();
}
// #8 : après une révélation, « Réessayer » puis réussite → XP du mode guidé (≈ moitié)
{
  const { page, ctx } = await newPage(browser, { state: baseState({delay:0}) }); await closeModals(page); await goPractice(page,'scales');
  await page.evaluate(()=>{ window.__T.S.settings.autoNext=false; });
  const full=await gainOf(page, async()=>{ await page.evaluate(()=>window.__T.startRound({sec:'scales',tid:'major',k:'C'})); await playScale(page,CM); });
  const after=await gainOf(page, async()=>{
    await page.evaluate(()=>{ window.__T.startRound({sec:'scales',tid:'major',k:'C'}); window.__T.reveal(false); }); await page.waitForTimeout(200);
    await page.evaluate(()=>window.__T.grade(false)); await page.waitForTimeout(100);
    const ms=await page.evaluate(()=>window.__T.seqMidis()); await playScale(page,ms); });
  console.log('#8 XP réussite normale', full, '| réussite après révélation + réessai', after);
  if(!(after<full && after<=Math.round(full/2)+1)) bad.push('#8 XP plein après révélation');
  await ctx.close();
}
await browser.close();
console.log(bad.length ? 'ECHEC : '+bad.join(' ; ') : 'OK test_xp');
process.exit(bad.length?1:0);
