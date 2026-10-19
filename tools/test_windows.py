# Opens every window on every page and closes it in every way; checks the app never stays frozen.
# Needs: python3 -m http.server 8767 (repo root) running, and Playwright.
import asyncio
from playwright.async_api import async_playwright
PAGES={"practice":"document.querySelector('#secTabs [data-v=\"chords\"]').click()","settings":"document.getElementById('setBtn').click()","progress":"document.getElementById('progBtn').click()",
 "rank":"document.getElementById('rankBtn').click()","account":"document.getElementById('accountBtn').click()","games":"document.querySelector('#secTabs [data-v=\"games\"]').click()","daily":"document.getElementById('dailyCard').click()"}
OPEN={"help":"document.getElementById('helpBtn').click()","levels":"document.getElementById('charMore').click()","mode":"document.getElementById('inChip').click()","midi":"openMidiForTest()"}
CLOSE=["escape","x","backdrop","finish"]
async def main():
  async with async_playwright() as p:
    b=await p.chromium.launch(); pg=await b.new_page(viewport={"width":1180,"height":820}); errs=[]; pg.on("pageerror",lambda e:errs.append(str(e)))
    await pg.goto("http://localhost:8767/"); await pg.wait_for_timeout(800)
    if await pg.is_visible("#inputModal"): await pg.click(".inp-opt"); await pg.wait_for_timeout(400)
    for _ in range(3): await pg.keyboard.press("Escape"); await pg.wait_for_timeout(150)
    await pg.evaluate("document.querySelector('#lockGuest') && 0")
    bad=[]; n=0
    for pname,go in PAGES.items():
      for oname,op in OPEN.items():
        for how in CLOSE:
          await pg.evaluate(go); await pg.wait_for_timeout(250)
          if oname=="midi": await pg.evaluate("document.getElementById('inChip').click()"); await pg.wait_for_timeout(150); await pg.keyboard.press("Escape"); await pg.wait_for_timeout(100); await pg.evaluate("openMidiForTest=()=>document.getElementById('midiCfg').click()") if False else None
          if oname=="midi": await pg.evaluate("document.getElementById('midiCfg').click()")
          else: await pg.evaluate(op)
          await pg.wait_for_timeout(250)
          vis=await pg.evaluate("[...document.querySelectorAll('.modal')].filter(m=>!m.hidden).map(m=>m.id)")
          if not vis: continue
          mid=vis[-1]
          if how=="escape": await pg.keyboard.press("Escape")
          elif how=="x":
            x=await pg.query_selector(f"#{mid} .modal-close");
            if x and await x.is_visible(): await x.click()
            else: await pg.keyboard.press("Escape")
          elif how=="backdrop": await pg.mouse.click(8,8)
          elif how=="finish":
            if mid=="helpModal":
              for i in range(8):
                if not await pg.is_visible("#helpModal"): break
                await pg.click("#tutNext"); await pg.wait_for_timeout(120)
            else:
              f=await pg.query_selector(f"#{mid} .modal-foot .btn.primary:not([disabled])")
              if f: await f.click()
              else: await pg.keyboard.press("Escape")
          await pg.wait_for_timeout(300)
          for _ in range(3):
            if await pg.evaluate("[...document.querySelectorAll('.modal')].some(m=>!m.hidden)"): await pg.keyboard.press("Escape"); await pg.wait_for_timeout(150)
          n+=1
          inert=await pg.evaluate("document.getElementById('app').inert")
          # a real click must work: go to Scales through the menu
          await pg.mouse.click(*await pg.evaluate("(()=>{const r=document.querySelector('#secTabs [data-v=\"scales\"]').getBoundingClientRect(); return [r.x+r.width/2, r.y+r.height/2]})()"))
          await pg.wait_for_timeout(250)
          if await pg.is_visible("#leaveModal"): await pg.click("#lvGo"); await pg.wait_for_timeout(250)
          okc=await pg.evaluate("document.body.dataset.page==='practice' && document.querySelector('#secTabs [data-v=\"scales\"]').hasAttribute('aria-current')")
          if inert or not okc: bad.append((pname,oname,how,mid,"inert" if inert else "click failed"))
    print("combinations tested:", n, "| problems:", bad[:12], "| JS errors:", errs[:5])
    await b.close()
asyncio.run(main())
