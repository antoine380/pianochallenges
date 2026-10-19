# Clicks every button of every window (web and with a mocked native iOS bridge) and reports JS errors.
# Needs: python3 -m http.server 8767 (repo root) running, and Playwright.
import asyncio
from playwright.async_api import async_playwright
mock="""window.webkit={messageHandlers:{bridge:{postMessage(){}}}}; window.__cb={};
window.Capacitor={nativePromise:(p,m,o)=>{ window.__calls=(window.__calls||[]).concat(p+'.'+m); return Promise.resolve(m==='start'||m==='listInputs'?{inputs:[{id:'1',name:'Keystation 49 MK3'}]}:{}); }, nativeCallback:(p,m,o,cb)=>{ window.__cb[o.eventName]=cb; return 'id'; }};"""
OPENERS={"setModal":"openSet('settings')","charModal":"document.getElementById('charMore').click()","midiModal":"document.getElementById('midiCfg').click()",
 "introModal":"document.getElementById('howPk').click()","inputModal":"null","helpModal":"document.getElementById('helpBtn').click()"}
async def run(native):
  async with async_playwright() as p:
    b=await p.chromium.launch(); pg=await b.new_page(viewport={"width":1180,"height":820}); errs=[]; pg.on("pageerror",lambda e:errs.append(str(e)))
    if native: await pg.add_init_script(mock)
    await pg.goto("http://localhost:8767/"); await pg.wait_for_timeout(2300)
    for _ in range(3): await pg.keyboard.press("Escape"); await pg.wait_for_timeout(150)
    if await pg.is_visible("#inputModal"): await pg.click(".inp-opt:nth-child(2)"); await pg.wait_for_timeout(600)
    for _ in range(3): await pg.keyboard.press("Escape"); await pg.wait_for_timeout(150)
    print("native" if native else "web", "kbd size select:", await pg.evaluate("document.getElementById('kbSize').value"), "| keys on screen:", await pg.evaluate("document.querySelectorAll('#kbd .wk,#kbd .bk').length"))
    for mid,op in OPENERS.items():
      if op=="null": continue
      if mid=="setModal": await pg.evaluate("document.getElementById('setBtn').click()")
      else: await pg.evaluate(op)
      await pg.wait_for_timeout(300)
      if not await pg.is_visible("#"+mid): print("  could not open", mid); continue
      n=await pg.evaluate(f"""()=>[...document.querySelectorAll('#{mid} .modal-body button, #{mid} .modal-body input[type=checkbox]')].filter(b=>b.offsetParent&&!b.disabled).map((b,i)=>(b.dataset.sw=i,i)).length""")
      clicked=0
      for i in range(n):
        el=await pg.query_selector(f'#{mid} [data-sw="{i}"]')
        if not el or not await el.is_visible(): continue
        txt=(await el.evaluate("e=>(e.id||'')+' '+(e.textContent||e.type)")).strip()[:30]
        if "reset" in txt.lower() or "réinit" in txt.lower(): continue
        try: await el.click(timeout=1000); clicked+=1
        except Exception: print("  not clickable:", mid, txt)
        await pg.wait_for_timeout(120)
        # keep this window open if a click closed it
        if not await pg.is_visible("#"+mid):
          if mid=="setModal": await pg.evaluate("document.getElementById('setBtn').click()")
          else: await pg.evaluate(op)
          await pg.wait_for_timeout(200)
      print(" ", mid, "buttons clicked:", clicked)
      for _ in range(3): await pg.keyboard.press("Escape"); await pg.wait_for_timeout(120)
    print("  calls:", (await pg.evaluate("window.__calls||[]"))[:8], "errors:", errs)
    await b.close()
async def main():
  await run(False); await run(True)
asyncio.run(main())
