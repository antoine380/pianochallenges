(function(){
  var BLACK=[1,3,6,8,10];
  /* Hero: a 3-octave keyboard that plays a C major scale with lit keys */
  var svg=document.getElementById("heroKb"); if(svg){
    var n=36, ww=980/21, h="", wi=0, i;
    for(i=0;i<n;i++){ if(BLACK.indexOf(i%12)<0){ h+='<rect class="w" data-i="'+i+'" x="'+(wi*ww).toFixed(1)+'" y="0" width="'+(ww-3).toFixed(1)+'" height="150" rx="4"/>'; wi++; } }
    wi=0; for(i=0;i<n;i++){ if(BLACK.indexOf(i%12)>=0) h+='<rect class="b" data-i="'+i+'" x="'+(wi*ww-ww*0.3).toFixed(1)+'" y="0" width="'+(ww*0.6).toFixed(1)+'" height="92" rx="3"/>'; else wi++; }
    svg.innerHTML=h;
    var key=function(i){return svg.querySelector('[data-i="'+i+'"]')};
    var clear=function(){svg.querySelectorAll(".lit").forEach(function(e){e.classList.remove("lit")})};
    [12,16,19].forEach(function(i){key(i).classList.add("lit")});
    if(!matchMedia("(prefers-reduced-motion: reduce)").matches){
      var tune=[12,14,16,17,19,21,23,24,23,21,19,17,16,14], k=0;
      setTimeout(function(){ setInterval(function(){ clear(); key(tune[k++%tune.length]).classList.add("lit"); },420); },2200);
    }
  }
  /* Filters: OR inside a group, AND across groups */
  var grid=document.getElementById("grid"), cards=[].slice.call(grid.querySelectorAll(".card"));
  var state={}, sortSel=document.getElementById("sort"), KEY="pc-keyboard-guide";
  var chips=[].slice.call(document.querySelectorAll(".chip"));
  chips.forEach(function(c){ state[c.dataset.g]=state[c.dataset.g]||[]; });
  function match(card,g,vals){ if(!vals.length) return true; var v=card.dataset[g]||"";
    return vals.some(function(x){ return g==="extra" ? v.split(" ").indexOf(x)>=0 : v===x; }); }
  function render(){
    var k=sortSel.value, shown=0;
    cards.sort(function(a,b){ var A=a.dataset,B=b.dataset;
      return (k==="price"? A.tier-B.tier : k==="auto"? B.auto-A.auto : k==="keys"? B.keys-A.keys : 0) || A.rank-B.rank; });
    cards.forEach(function(c){ var ok=Object.keys(state).every(function(g){return match(c,g,state[g])}); c.hidden=!ok; if(ok) shown++; grid.appendChild(c); });
    document.getElementById("count").textContent=shown;
    document.getElementById("empty").hidden=shown>0;
  }
  function save(){ try{ localStorage.setItem(KEY, JSON.stringify({s:state,sort:sortSel.value})); }catch(e){} }
  document.getElementById("frow").addEventListener("click",function(e){
    var b=e.target.closest(".chip"); if(!b) return; var s=state[b.dataset.g], v=b.dataset.v, i=s.indexOf(v);
    if(i>=0) s.splice(i,1); else s.push(v); b.setAttribute("aria-pressed", i<0); render(); save(); });
  document.getElementById("reset").addEventListener("click",function(){
    Object.keys(state).forEach(function(g){state[g]=[]}); chips.forEach(function(c){c.setAttribute("aria-pressed","false")}); render(); save(); });
  sortSel.addEventListener("change",function(){render();save();});
  var ft=document.getElementById("ftoggle"), fbox=document.getElementById("filters");
  ft.addEventListener("click",function(){ var c=fbox.classList.toggle("collapsed"); ft.textContent=c?ft.dataset.show:ft.dataset.hide; ft.setAttribute("aria-expanded",!c); });
  try{ var d=JSON.parse(localStorage.getItem(KEY)||"null");
    if(d){ Object.keys(d.s||{}).forEach(function(g){ if(state[g]) (d.s[g]||[]).forEach(function(v){ state[g].push(v);
        var b=document.querySelector('.chip[data-g="'+g+'"][data-v="'+v+'"]'); if(b) b.setAttribute("aria-pressed","true"); }); });
      if(d.sort) sortSel.value=d.sort; } }catch(e){}
  render();
})();
