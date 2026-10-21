// Harnais commun pour l'audit des entrées (MIDI / clavier / micro) de Piano Challenges.
// Usage : import { launch, closeOnboarding, gotoExercise, midi, state } from './lib.mjs'
import { chromium } from 'playwright';

export const URL = process.env.PC_URL || ('http://localhost:' + (process.env.PORT || '8767') + '/');

// Script injecté AVANT le chargement : faux Web MIDI + compteurs (AudioContext, timers, handlers MIDI, getUserMedia).
export const INIT = `
(() => {
  const W = window;
  W.__cnt = { ac:0, acCtx:[], handlersSet:0, intervals:new Set(), timeouts:new Set(), consoleErrors:[], midiAccessCalls:0 };
  // --- AudioContext ---
  const AC = W.AudioContext;
  if (AC) {
    const P = new Proxy(AC, { construct(t, a) { W.__cnt.ac++; const c = new t(...a); W.__cnt.acCtx.push(c); return c; } });
    W.AudioContext = P; W.webkitAudioContext = P;
    const co = AC.prototype.createOscillator; W.__cnt.osc = 0;
    AC.prototype.createOscillator = function(){ W.__cnt.osc++; return co.apply(this, arguments); };
  }
  // --- timers ---
  const _si = W.setInterval.bind(W), _ci = W.clearInterval.bind(W), _st = W.setTimeout.bind(W), _ct = W.clearTimeout.bind(W);
  W.setInterval = (fn, ms, ...r) => { const id = _si(fn, ms, ...r); W.__cnt.intervals.add(id); return id; };
  W.clearInterval = id => { W.__cnt.intervals.delete(id); return _ci(id); };
  W.setTimeout = (fn, ms, ...r) => { let id; id = _st((...x) => { W.__cnt.timeouts.delete(id); return typeof fn==='function'?fn(...x):undefined; }, ms, ...r); W.__cnt.timeouts.add(id); return id; };
  W.clearTimeout = id => { W.__cnt.timeouts.delete(id); return _ct(id); };
  // --- faux Web MIDI ---
  const mode = W.__midiMode || '${'${MODE}'}';
  function mkPort(id, name) {
    const p = { id, name, state:'connected', connection:'open', type:'input', manufacturer:'Fake', _h:null, _sets:0 };
    Object.defineProperty(p, 'onmidimessage', { get(){ return p._h; }, set(v){ p._h = v; p._sets++; W.__cnt.handlersSet++; }, enumerable:true });
    return p;
  }
  const ports = [mkPort('in-1','Fake Keyboard 61'), mkPort('in-2','Fake Keyboard 25')];
  const access = { inputs:new Map([[ports[0].id, ports[0]]]), outputs:new Map(), onstatechange:null, sysexEnabled:false, addEventListener(){}, removeEventListener(){} };
  W.__midi = {
    ports, access,
    sent:[],
    send(i, bytes){ const p = ports[i]; const ev = { data:new Uint8Array(bytes), timeStamp:performance.now(), target:p }; W.__midi.sent.push(performance.now()); if (p._h) p._h(ev); return !!p._h; },
    noteOn(n, v=100, i=0){ return W.__midi.send(i,[0x90,n,v]); },
    noteOff(n, i=0){ return W.__midi.send(i,[0x80,n,0]); },
    chord(ns, v=100, i=0){ ns.forEach(n=>W.__midi.send(i,[0x90,n,v])); },
    addSecond(){ access.inputs.set(ports[1].id, ports[1]); ports[1].state='connected'; if (access.onstatechange) access.onstatechange({port:ports[1]}); },
    disconnect(i=0){ const p=ports[i]; p.state='disconnected'; p.connection='closed'; /* Chrome garde le port dans la map */ if (access.onstatechange) access.onstatechange({port:p}); },
    remove(i=0){ const p=ports[i]; p.state='disconnected'; access.inputs.delete(p.id); if (access.onstatechange) access.onstatechange({port:p}); },
    reconnect(i=0){ const p=ports[i]; p.state='connected'; p.connection='open'; access.inputs.set(p.id,p); if (access.onstatechange) access.onstatechange({port:p}); },
    handlerCount(){ return ports.map(p=>({name:p.name, has:!!p._h, sets:p._sets})); }
  };
  if (mode === 'deny') navigator.requestMIDIAccess = async () => { W.__cnt.midiAccessCalls++; throw new DOMException('Permission denied','SecurityError'); };
  else if (mode === 'none') Object.defineProperty(navigator,'requestMIDIAccess',{value:undefined,configurable:true});
  else navigator.requestMIDIAccess = async () => { W.__cnt.midiAccessCalls++; return access; };
  // --- getUserMedia ---
  const gum = W.__gumMode || 'none';
  if (navigator.mediaDevices) {
    if (gum === 'deny') navigator.mediaDevices.getUserMedia = async () => { throw new DOMException('Permission denied','NotAllowedError'); };
    else if (gum === 'osc') navigator.mediaDevices.getUserMedia = async () => {
      const ac = new (W.AudioContext)(); W.__micAc = ac; const dst = ac.createMediaStreamDestination();
      W.__oscs = [];
      W.__setFreqs = (fs) => { W.__oscs.forEach(o=>{ try{o.stop();}catch(e){} }); W.__oscs = fs.map(f=>{ const o=ac.createOscillator(); o.type='sine'; o.frequency.value=f; const g=ac.createGain(); g.gain.value=0.5/Math.max(1,fs.length); o.connect(g); g.connect(dst); o.start(); return o; }); };
      W.__setFreqs([]);
      W.__micStream = dst.stream; return dst.stream;
    };
  }
  W.addEventListener('error', e => W.__cnt.consoleErrors.push('error: '+e.message));
  W.addEventListener('unhandledrejection', e => W.__cnt.consoleErrors.push('rejection: '+(e.reason && e.reason.message || e.reason)));
})();`;

export async function launch(opts = {}) {
  const { mode = 'ok', gum = 'none', hasTouch = false, viewport = { width: 1180, height: 820 }, lang = 'fr' } = opts;
  const browser = await chromium.launch({ executablePath: process.env.PW_CHROMIUM || undefined, args: ['--autoplay-policy=no-user-gesture-required', '--use-fake-ui-for-media-stream'] });
  const context = await browser.newContext({ viewport, hasTouch, locale: lang === 'fr' ? 'fr-FR' : 'en-GB' });
  await context.addInitScript(`window.__midiMode=${JSON.stringify(mode)}; window.__gumMode=${JSON.stringify(gum)};`);
  await context.addInitScript(INIT.replace('${MODE}', mode));
  const page = await context.newPage();
  const consoleErrors = [];
  page.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') consoleErrors.push(`[${m.type()}] ${m.text()}`); });
  page.on('pageerror', e => consoleErrors.push('[pageerror] ' + e.message));
  page.consoleErrors = consoleErrors;
  return { browser, context, page };
}

// Ferme les modales d'accueil. input = 'midi'|'screen'|'mic' pour la modale de choix d'entrée.
export async function closeOnboarding(page, input = 'midi') {
  for (let i = 0; i < 12; i++) {
    await page.waitForTimeout(400);
    // start screen, onboarding questions and tour (Oct 2026): continue as a guest and skip
    for (const sel of ['#fnSkip', '#gateGuest', '#onbSkip', '#tourX']) if (await page.isVisible(sel)) { await page.click(sel); await page.waitForTimeout(350); }
    const inVis = await page.isVisible('#inputModal');
    if (inVis) {
      const idx = { screen: 0, midi: 1, mic: 2 }[input] ?? 0;
      const btns = page.locator('#inOpts .inp-opt');
      const n = await btns.count();
      if (n > idx) await btns.nth(idx).click(); else await btns.first().click();
      continue;
    }
    for (const id of ['welcomeModal', 'helpModal', 'introModal', 'midiModal']) {
      if (await page.isVisible('#' + id)) {
        const b = page.locator(`#${id} button:visible`);
        const n = await b.count();
        if (id === 'midiModal') { if (await page.locator('#midiOk').isEnabled()) await page.click('#midiOk'); else await page.click('#midiX'); }
        else if (n) await b.last().click(); else await page.keyboard.press('Escape');
        await page.waitForTimeout(250);
      }
    }
    const any = await page.evaluate(() => ['inputModal', 'welcomeModal', 'helpModal', 'introModal', 'midiModal', 'gate', 'onb', 'tour'].some(id => { const e = document.getElementById(id); return e && !e.hidden; }));
    if (!any) break;
  }
  if (await page.isVisible('#lockPanel')) await page.click('#lockGuest');
}

// Etat utile du DOM.
export async function state(page) {
  return page.evaluate(() => {
    const kb = [...document.querySelectorAll('#kbd [data-m]')];
    const cls = c => kb.filter(k => k.classList.contains(c)).map(k => +k.dataset.m);
    const slots = [...document.querySelectorAll('#slots > *')].map(s => s.className);
    return {
      page: document.body.dataset.page,
      playing: document.body.classList.contains('playing'),
      stage: (document.getElementById('stage')?.innerText || '').replace(/\s+/g, ' ').slice(0, 200),
      prompt: document.getElementById('prompt')?.innerText || '',
      sbVal: document.getElementById('sbVal')?.innerText,
      sbDetail: document.getElementById('sbDetail')?.innerText,
      slots, nSlotsOk: slots.filter(c => /\bok\b/.test(c)).length,
      kPress: cls('k-press'), kHit: cls('k-hit'), kBad: cls('k-bad'), kOk: cls('k-ok'),
      midiTxt: document.getElementById('midiTxt')?.innerText, midiOn: document.getElementById('midiBtn')?.classList.contains('on'), midiErr: document.getElementById('midiBtn')?.classList.contains('err'),
      micTxt: document.getElementById('micTxt')?.innerText,
      notice: document.getElementById('notice')?.innerText,
      ac: window.__cnt.ac, osc: window.__cnt.osc, intervals: window.__cnt.intervals.size, timeouts: window.__cnt.timeouts.size, handlersSet: window.__cnt.handlersSet, handlers: window.__midi && window.__midi.handlerCount(),
      inert: document.getElementById('app')?.inert,
      modals: ['inputModal', 'welcomeModal', 'helpModal', 'introModal', 'midiModal', 'settingsPage', 'progressPage', 'charModal', 'endModal'].filter(id => { const e = document.getElementById(id); return e && !e.hidden; }),
      errors: window.__cnt.consoleErrors,
    };
  });
}

// Va sur Learn > Accords et ouvre une tuile (page practice, phase idle).
export async function gotoExercise(page, sec = 'chords') {
  await page.evaluate(() => document.querySelector('.mode-item[data-mode="learn"]').click());
  await page.waitForTimeout(400); await closeOnboarding(page);
  await page.locator('#learnTiles .ptile').first().click();
  await page.waitForTimeout(400);
  await closeOnboarding(page);
  // si la section n'est pas la bonne, cliquer le bouton de section
  await page.evaluate(s => { const b = document.querySelector('#secTabs [data-v="' + s + '"]'); if (b) b.click(); }, sec);
  await page.waitForTimeout(500); await closeOnboarding(page);
}

export const midi = {
  on: (page, n, v = 100, i = 0) => page.evaluate(([n, v, i]) => window.__midi.noteOn(n, v, i), [n, v, i]),
  off: (page, n, i = 0) => page.evaluate(([n, i]) => window.__midi.noteOff(n, i), [n, i]),
  send: (page, i, bytes) => page.evaluate(([i, b]) => window.__midi.send(i, b), [i, bytes]),
};

export function log(...a) { console.log(...a); }
