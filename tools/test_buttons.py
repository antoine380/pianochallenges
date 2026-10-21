# Clicks every button of every window and of the Settings page (web, then with a mocked native iOS bridge) and reports JS errors.
# Needs: python3 -m http.server 8767 (repo root) running, and Playwright. PORT=8773 python3 tools/test_buttons.py to use another port.
import asyncio, os, sys
from playwright.async_api import async_playwright
PORT=os.environ.get("PORT","8767")
mock="""window.webkit={messageHandlers:{bridge:{postMessage(){}}}}; window.__cb={};
window.Capacitor={nativePromise:(p,m,o)=>{ window.__calls=(window.__calls||[]).concat(p+'.'+m); return Promise.resolve(m==='start'||m==='listInputs'?{inputs:[{id:'1',name:'Keystation 49 MK3'}]}:{}); }, nativeCallback:(p,m,o,cb)=>{ window.__cb[o.eventName]=cb; return 'id'; }};"""
LEARN="document.querySelector('#modeNav [data-mode=learn]').click(); document.querySelector('#learnTiles .ptile').click()"
# window or page id -> how to open it (the Help of a topic, #howPk, needs a topic page first)
OPENERS={"settingsPage":"document.getElementById('setBtn').click()","charModal":"document.getElementById('charMore').click()",
 "midiModal":"document.getElementById('midiCfg').click()","introModal":LEARN+"; document.getElementById('howPk').click()",
 "inputModal":"document.getElementById('inChip').click()","helpModal":"document.getElementById('helpBtn').click()",
 "dailyCfgModal":"document.getElementById('dailyCard').click(); document.getElementById('dpCfg').click()"}
async def run(native):
  async with async_playwright() as p:
    b=await p.chromium.launch(); pg=await b.new_page(viewport={"width":1180,"height":820}); errs=[]; pg.on("pageerror",lambda e:errs.append(str(e)))
    if native: await pg.add_init_script(mock)
    await pg.goto(f"http://localhost:{PORT}/"); await pg.wait_for_timeout(2300)
    # start screen (sign-in), onboarding questions and tour: continue as a guest and skip
    for sel in ("#fnSkip","#gateGuest","#onbSkip","#tourX"):
      if await pg.is_visible(sel): await pg.click(sel); await pg.wait_for_timeout(700)
    for _ in range(3): await pg.keyboard.press("Escape"); await pg.wait_for_timeout(150)
    # first visit: pick the play mode once (MIDI with the mocked bridge, the screen keyboard on the web)
    if await pg.is_visible("#inputModal"): await pg.click(".inp-opt:nth-child(2)" if native else ".inp-opt:nth-child(1)"); await pg.wait_for_timeout(600)
    for _ in range(3): await pg.keyboard.press("Escape"); await pg.wait_for_timeout(150)
    print("native" if native else "web", "start page:", await pg.evaluate("document.body.dataset.page"), "| kbd size select:", await pg.evaluate("document.getElementById('kbSize').value"), "| keys on screen:", await pg.evaluate("document.querySelectorAll('#kbd .wk,#kbd .bk').length"))
    problems=[]
    for mid,op in OPENERS.items():
      await pg.evaluate(op); await pg.wait_for_timeout(400)
      if await pg.is_visible("#leaveModal"): await pg.click("#lvGo"); await pg.wait_for_timeout(250); await pg.evaluate(op); await pg.wait_for_timeout(400)
      if not await pg.is_visible("#"+mid): problems.append(("could not open",mid)); print("  could not open", mid); continue
      # an intro window ("how it works") may sit on top the first time: close it
      for _ in range(2):
        top=await pg.evaluate("[...document.querySelectorAll('.modal')].filter(m=>!m.hidden).map(m=>m.id).pop()")
        if top==mid: break
        await pg.keyboard.press("Escape"); await pg.wait_for_timeout(200)
      scope=f"#{mid}" if mid=="settingsPage" else f"#{mid} .modal-body"
      # the windows re-render after a click, so the buttons are re-numbered before each click
      mark=f"""()=>[...document.querySelectorAll('{scope} button, {scope} input[type=checkbox]')].filter(b=>b.offsetParent&&!b.disabled).map((b,i)=>(b.dataset.sw=i,i)).length"""
      n=await pg.evaluate(mark)
      clicked=0
      for i in range(n):
        await pg.evaluate(mark)
        el=await pg.query_selector(f'{scope} [data-sw="{i}"]')
        if not el or not await el.is_visible(): continue
        txt=(await el.evaluate("e=>(e.id||'')+' '+(e.textContent||e.type)")).strip()[:30]
        if "reset" in txt.lower() or "réinit" in txt.lower(): continue
        try: await el.click(timeout=1000); clicked+=1
        except Exception as ex: print("  not clickable:", mid, txt, str(ex).splitlines()[0][:160]); problems.append(("not clickable",mid,txt))
        await pg.wait_for_timeout(120)
        # "replay the tour" / "redo the questions" (Settings) open full-screen layers: close them
        for sel in ("#onbSkip","#tourX","#invX","#pwX"):
          if await pg.is_visible(sel): await pg.click(sel); await pg.wait_for_timeout(250)
        # a click may open another window (MIDI set-up, play mode, leave?): close it
        for _ in range(2):
          top=await pg.evaluate("[...document.querySelectorAll('.modal')].filter(m=>!m.hidden).map(m=>m.id).pop()")
          if not top or top==mid: break
          await pg.keyboard.press("Escape"); await pg.wait_for_timeout(150)
        # keep this window open if a click closed it
        if not await pg.is_visible("#"+mid):
          for _ in range(2): await pg.keyboard.press("Escape"); await pg.wait_for_timeout(100)
          await pg.evaluate(op); await pg.wait_for_timeout(250)
      print(" ", mid, "buttons clicked:", clicked)
      for _ in range(3): await pg.keyboard.press("Escape"); await pg.wait_for_timeout(120)
    print("  calls:", (await pg.evaluate("window.__calls||[]"))[:8], "errors:", errs)
    await b.close()
    return 1 if (problems or errs) else 0
async def main():
  return (await run(False)) | (await run(True))
sys.exit(asyncio.run(main()))
