# Opens every window on every page and closes it in every way; checks the app never stays frozen
# (no leftover inert, a real mouse click on a Learn tile still works afterwards).
# Needs: python3 -m http.server 8767 (repo root) running, and Playwright. PORT=8773 python3 tools/test_windows.py to use another port.
import asyncio, os, sys
from playwright.async_api import async_playwright
PORT=os.environ.get("PORT","8767")
# pages reached through the current navigation: three modes (#modeNav), Learn tiles (#learnTiles), side links
PAGES={
 "hub":"document.getElementById('homeLink').click()",
 "learn":"document.querySelector('#modeNav [data-mode=learn]').click()",
 "practice":"document.querySelector('#modeNav [data-mode=learn]').click(); document.querySelector('#learnTiles .ptile').click()",
 "games":"document.querySelector('#modeNav [data-mode=games]').click()",
 "play":"document.querySelector('#modeNav [data-mode=play]').click()",
 "daily":"document.getElementById('dailyCard').click()",
 "rank":"document.getElementById('rankBtn').click()",
 "account":"document.getElementById('accountBtn').click()",
 "progress":"document.getElementById('progBtn').click()",
 "settings":"document.getElementById('setBtn').click()",
}
OPEN={"help":"document.getElementById('helpBtn').click()","levels":"document.getElementById('charMore').click()",
 "mode":"document.getElementById('inChip').click()","midi":"document.getElementById('midiCfg').click()"}
CLOSE=["escape","x","backdrop","finish"]
SEED="""(()=>{try{const S={settings:{lang:"fr",notation:"fr",input:"screen",earV2:true,diffV2:true,midiV2:true},langV2:true,
 gate:"guest",onb:{done:1},tourDone:1,introSeen:{chords:1,scales:1,harmony:1,prog:1,ear:1,games:1,daily:1,section:1},seenTypes:[],stats:{},secStats:{},xp:0,xpDays:{},streak:{days:0}};
 localStorage.setItem("memo-gammes-v1",JSON.stringify(S));}catch(e){}})();"""
async def main():
  async with async_playwright() as p:
    b=await p.chromium.launch(); c=await b.new_context(viewport={"width":1180,"height":820}); await c.add_init_script(SEED)
    pg=await c.new_page(); errs=[]; pg.on("pageerror",lambda e:errs.append(str(e)))
    await pg.goto(f"http://localhost:{PORT}/"); await pg.wait_for_timeout(800)
    for _ in range(3): await pg.keyboard.press("Escape"); await pg.wait_for_timeout(150)
    bad=[]; n=0
    for pname,go in PAGES.items():
      for oname,op in OPEN.items():
        for how in CLOSE:
          await pg.evaluate(go); await pg.wait_for_timeout(250)
          if await pg.is_visible("#leaveModal"): await pg.click("#lvGo"); await pg.wait_for_timeout(250)
          await pg.evaluate(op); await pg.wait_for_timeout(250)
          vis=await pg.evaluate("[...document.querySelectorAll('.modal')].filter(m=>!m.hidden).map(m=>m.id)")
          if not vis: bad.append((pname,oname,how,"-","did not open")); continue
          mid=vis[-1]
          if how=="escape": await pg.keyboard.press("Escape")
          elif how=="x":
            x=await pg.query_selector(f"#{mid} .modal-close")
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
          # a real click must work: Learn mode, then the Scales tile
          r=await pg.evaluate("(()=>{const r=document.querySelector('#modeNav [data-mode=learn]').getBoundingClientRect(); return [r.x+r.width/2, r.y+r.height/2]})()")
          await pg.mouse.click(*r); await pg.wait_for_timeout(250)
          if await pg.is_visible("#leaveModal"): await pg.click("#lvGo"); await pg.wait_for_timeout(250)
          r=await pg.evaluate("(()=>{const r=document.querySelector('#learnTiles .ptile:nth-child(2)').getBoundingClientRect(); return [r.x+r.width/2, r.y+r.height/2]})()")
          await pg.mouse.click(*r); await pg.wait_for_timeout(300)
          okc=await pg.evaluate("document.body.dataset.page==='practice' && document.querySelector('#secTabs [data-v=\"scales\"]').hasAttribute('aria-current')")
          if inert or not okc: bad.append((pname,oname,how,mid,"inert" if inert else "click failed"))
    print("combinations tested:", n, "| problems:", bad[:12], "| JS errors:", errs[:5])
    await b.close()
    return 1 if (bad or errs) else 0
sys.exit(asyncio.run(main()))
