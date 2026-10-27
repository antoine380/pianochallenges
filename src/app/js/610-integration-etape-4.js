// fragment de l'IIFE principale — ordre 610, voir src/app/README.md
/* ==== Intégration étape 4 (Mesure × Parcours 2-3 × Ma route) ==== */
// The first launch D2–D4 (Parcours 2-3) replaces fnNote after the « Mesure » module: wrap it again so first_note is still counted.
{ const o=fnNote; fnNote=function(m, el){ const was=FN.on && !FN.done; const r=o.apply(this, arguments); try{ if(was && FN.done) track("first_note", {how:FN.how||"", level:FN.level||""}); }catch(e){} return r; }; }
// Ma route: each step done (once) and each stage finished
{ const o=rtDone; rtDone=function(id){ const r0=rtS(), fresh=!r0.done[id], p=rtPill(id); const r=o.apply(this, arguments);
  try{ if(fresh && p){ track("route_step", {id:String(id), stage:p.si+1, kind:p.k||""}); if(rtStageDone(p.si)) track("route_stage", {stage:p.si+1}); } }catch(e){} return r; }; }
/* ==== fin Intégration étape 4 ==== */

