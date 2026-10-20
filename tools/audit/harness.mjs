// Harness Playwright commun aux tests d'audit (lecture seule : le HTML est patché à la volée via route(), jamais sur disque).
// Lancer d'abord `python3 -m http.server 8767` à la racine du dépôt (ou PORT=xxxx node tools/audit/<test>.mjs).
// Playwright : NODE_PATH doit pointer vers un node_modules contenant playwright ; Chromium dans /opt/pw-browsers/chromium.
import { createRequire } from 'module';
// playwright est résolu depuis NODE_PATH (ex. NODE_PATH=/home/claude/node_modules) ou depuis le node_modules le plus proche
const require = createRequire(process.env.NODE_PATH ? process.env.NODE_PATH.replace(/\/?$/,'/') : import.meta.url);
const { chromium } = require('playwright');
export const URL = 'http://localhost:'+(process.env.PORT||8767)+'/';
export const STORE = 'memo-gammes-v1';

const EXPOSE = `
window.__T = {
  get S(){return S}, set S(v){S=v}, get phase(){return phase}, get cur(){return cur}, get seq(){return seq}, get found(){return found},
  get idx(){return idx}, get errors(){return errors}, get deadline(){return deadline}, get game(){return game}, get page(){return page},
  get startT(){return startT}, get combo(){return combo}, get hintUsed(){return hintUsed}, get played(){return played}, get pStep(){return pStep},
  LOW:()=>LOW, HIGH:()=>HIGH,
  spellType, spellIv, spellChord, hChord, progSteps, scaleChordSteps, TONICS, CROOTS, TYPES, CTYPES, HTYPES, PROGS, TYPE, CTYPE, PROG,
  noteIn, midiIn, startRound, reveal, success, levelInfo, addXP, bumpStreak, dayStr, addDays, buildDaily, dailyPlan, startDaily, finishGame, save, load, record,
  revealMidis, seqMidis, openPage, switchSection, noteName, nameIn, slashSym, chordSymOf, grade, mkey, t, fold, setDelay, voiceAt, degLabel, chordToneLabel,
  itemName, scaleName, chordName, progName, earMidis, setInput, pool, poolAll, pickNext, primaryAction, dueItems, render, renderSettings, closeMod, openMod,
  anyModal, anyWin, midiStart, roundLevel, xpForLevel,
  get sb(){return sb}, set sb(v){sb=v}, get user(){return user}, set user(v){user=v},
  // présents seulement après les correctifs de l'audit (typeof : pas d'erreur sur une version antérieure)
  get lastPushOk(){return typeof lastPushOk==="undefined"?undefined:lastPushOk}, get lastPushErr(){return typeof lastPushErr==="undefined"?undefined:lastPushErr}, get lastPull(){return typeof lastPull==="undefined"?undefined:lastPull},
  cloudPull, cloudPushNow, setUser, renderAccount, toast, STORE,
  mergeState: typeof mergeState==="function"?mergeState:undefined, syncText: typeof syncText==="function"?syncText:undefined
};`;

export async function launch(opts={}){
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM||'/opt/pw-browsers/chromium', headless: true });
  return browser;
}

// Faux Web MIDI : navigator.requestMIDIAccess résout un objet avec un port ; window.__midi.send([...]) injecte un message
export const FAKE_MIDI = `
(()=>{
  const port={id:'fake1',name:'Fake Piano',onmidimessage:null,state:'connected',addEventListener(){}};
  const acc={inputs:new Map([[port.id,port]]),outputs:new Map(),onstatechange:null,addEventListener(){}};
  navigator.requestMIDIAccess=()=>Promise.resolve(acc);
  window.__midi={send(data){ if(port.onmidimessage) port.onmidimessage({data:Uint8Array.from(data)}); }, port, acc};
})();`;

export async function newPage(browser, {state=null, midi=true, tz=null, viewport={width:1280,height:800}, clock=null, raw=null}={}){
  const ctx = await browser.newContext({ viewport, timezoneId: tz||undefined, locale:'fr-FR' });
  if(clock) await ctx.clock.install({ time: clock });
  // patch à la volée : expose les fonctions internes sur window.__T
  await ctx.route(u=>u.pathname==='/'||u.pathname.endsWith('/index.html'), async route=>{
    const res = await route.fetch(); let html = await res.text();
    const marker = 'else maybeAskInput();\n})();';
    if(!html.includes(marker)) throw new Error('marker introuvable');
    html = html.replace(marker, 'else maybeAskInput();\n'+EXPOSE+'\n})();');
    await route.fulfill({ response: res, body: html, headers:{...res.headers(), 'content-type':'text/html; charset=utf-8'} });
  });
  if(midi) await ctx.addInitScript(FAKE_MIDI);
  if(raw!=null) await ctx.addInitScript(([k,v])=>{ if(!sessionStorage.getItem('seeded')){ localStorage.setItem(k,v); sessionStorage.setItem('seeded','1'); } }, [STORE, raw]);
  else if(state) await ctx.addInitScript(([k,v])=>{ if(!sessionStorage.getItem('seeded')){ localStorage.setItem(k,JSON.stringify(v)); sessionStorage.setItem('seeded','1'); } }, [STORE, state]);
  const page = await ctx.newPage();
  page.on('pageerror', e=>console.log('PAGEERROR', e.message));
  await page.goto(URL);
  try{ await page.waitForFunction(()=>!!window.__T,null,{timeout:8000}); }catch(e){ page.__boot='BOOT FAILED (pas de __T)'; }
  return { ctx, page };
}

// état de base : onboarding fait, interaction = écran (ou midi), tout débloqué si demandé
export function baseState({input='screen', unlockAll=true, delay=0, lang='fr', notation='fr', extra={}, settings={}}={}){
  return { xp:0, mastery:{}, stats:{ok:0,perfect:0,revealed:0,errors:0}, streak:{days:0,last:''}, langV2:true, secStats:{}, srs:{}, daily:{}, section:'scales', introSeen:{scales:1,chords:1,harmony:1,prog:1,ear:1,games:1,daily:1},
    settings:{ lang, notation, mode:'suite', delay, dir:'up', octave:true, labels:true, midiSound:false, midiC:true, autoNext:false, unlockAll, input,
      types:['major'], view:'major', ctypes:['maj'], cview:'maj', invs:[0], htypes:['maj'], hview:'maj', hdegs:[0,1,2,3,4,5,6], ptypes:['p145','pop'], pview:'pop', vl:false,
      etypes:['chord','int'], eview:'chord', earV2:true, diffV2:true, midiV2:true, scMode:'notes', sc7:false, gameLen:10, ...settings },
    ...extra };
}

export async function closeModals(page){
  for(let i=0;i<6;i++){
    const closed = await page.evaluate(()=>{
      let did=false;
      for(const id of ['inputModal','welcomeModal','introModal']){ const el=document.getElementById(id); if(el && !el.hidden){ const b=el.querySelector('[data-close]'); if(b) b.click(); else window.__T.closeMod(id); did=true; } }
      const h=document.getElementById('helpModal'); if(h && !h.hidden){ document.getElementById('helpX').click(); did=true; }
      const lp=document.getElementById('lockPanel'); if(lp && !lp.hidden){ document.getElementById('lockGuest').click(); did=true; }
      return did;
    });
    if(!closed) break;
    await page.waitForTimeout(150);
  }
}

export async function goPractice(page, sec){
  await page.evaluate(sec=>{ const T=window.__T; T.openPage('learn'); document.querySelector('#secTabs [data-v="'+sec+'"]').click(); }, sec);
  await page.waitForTimeout(350);
  await closeModals(page);
}

export const sendMidi = (page, note) => page.evaluate(n=>window.__midi.send([0x90,n,100]), note);
export const press = (page, note) => page.evaluate(n=>window.__T.noteIn(n), note);
export const st = (page) => page.evaluate(()=>{ const T=window.__T; return {phase:T.phase, idx:T.idx, errors:T.errors, found:T.found.slice(), xp:T.S.xp, streak:{...T.S.streak}, seqLen:T.seq.length, pStep:T.pStep, combo:T.combo}; });
