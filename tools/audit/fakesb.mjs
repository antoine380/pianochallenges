// faux client Supabase injecté dans la page : window.__db contient les tables
export const FAKE_SB = `
window.__db = window.__db || {progress:{}, profiles:{}, xp_log:{}, rpcCalls:[], noRpc:false, fail:false};
window.__mkSb = function(){
  const db=window.__db;
  const err=()=>db.fail?{message:'TypeError: Failed to fetch'}:null;
  return {
    auth:{ signOut:async()=>({error:null}), getSession:async()=>({data:{session:null}}), onAuthStateChange(){ return {data:{subscription:{unsubscribe(){}}}}; } },
    from(table){
      return {
        select(){ return { eq(k,v){ return { maybeSingle:async()=>{ if(db.fail) return {data:null,error:err()}; const row=db.progress[v]; return {data: row?{data:JSON.parse(JSON.stringify(row))}:null, error:null}; } }; } }; },
        upsert:async(rows)=>{ if(db.fail) return {error:err()}; const arr=Array.isArray(rows)?rows:[rows];
          for(const r of arr){ if(table==='progress') db.progress[r.user_id]=JSON.parse(JSON.stringify(r.data)); else if(table==='profiles') db.profiles[r.id]={...r}; else if(table==='xp_log') db.xp_log[r.user_id+'|'+r.day]=r.xp; }
          return {error:null}; }
      };
    },
    rpc:async(name,args)=>{ db.rpcCalls.push({name,args}); if(db.noRpc) return {data:null,error:{message:'Could not find the function public.'+name+' in the schema cache', code:'PGRST202'}}; if(db.fail) return {data:null,error:err()};
      if(name==='add_xp'){ if(!(args.delta>=0&&args.delta<=3000)) return {data:null,error:{message:'bad delta'}}; const k=db.uid+'|'+args.day; db.xp_log[k]=Math.min(3000,(db.xp_log[k]||0)+args.delta); const tot=Object.entries(db.xp_log).filter(([kk])=>kk.startsWith(db.uid+'|')).reduce((a,[,v])=>a+v,0); db.profiles[db.uid]={...(db.profiles[db.uid]||{}), xp:tot, streak:args.streak, solved:args.solved}; return {data:tot,error:null}; } return {data:null,error:{message:'unknown rpc'}}; }
  };
};`;

// faux SDK complet (servi à la place de assets/js/supabase-*.js) : session selon window.__FAKE.user,
// leaderboard / my_rank / my_league selon window.__FAKE (leaderboard, myRank, league).
// league absent = fonction my_league pas encore installée (PGRST202) ; league:'fail' = réseau coupé.
// window.__FAKE.calls garde les appels RPC. Utilisé par r28_ligues.mjs.
export const FAKE_SDK = `(()=>{ const F=()=>window.__FAKE||{}; const log=n=>{ const f=F(); (f.calls=f.calls||[]).push(n); };
  const qb=t=>{ const b={ select(){return b;}, eq(){return b;}, gte(){return b;}, order(){return b;}, limit(){return b;}, upsert(){return b;}, insert(){return b;}, update(){return b;},
    maybeSingle:async()=>({data:null,error:null}), single:async()=>({data:null,error:null}), then(ok,ko){ return Promise.resolve(t==='profiles'?{data:F().leaderboard||[],error:null}:{data:null,error:null}).then(ok,ko); } }; return b; };
  const ch=()=>{ const c={ on(){return c;}, subscribe(cb){ setTimeout(()=>cb&&cb('SUBSCRIBED'),10); return c; }, track:async()=>'ok', untrack:async()=>'ok', send:async()=>'ok', presenceState(){ return {}; } }; return c; };
  const miss=n=>({data:null,error:{message:'Could not find the function public.'+n+' without parameters in the schema cache',code:'PGRST202'}});
  const client={ auth:{ getSession:async()=>({data:{session:F().user?{user:F().user,access_token:'x'}:null}}), onAuthStateChange(){ return {data:{subscription:{unsubscribe(){}}}}; }, signOut:async()=>({error:null}) },
    from:qb, channel:ch, removeChannel(){},
    rpc:async(n)=>{ const f=F(); log(n); if(n==='leaderboard') return {data:f.leaderboard||[],error:null}; if(n==='add_xp') return {data:0,error:null};
      if(n==='my_rank') return f.myRank===undefined?miss(n):{data:f.myRank,error:null};
      if(n==='my_league'){ if(f.league===undefined) return miss(n); if(f.league==='fail') return {data:null,error:{message:'TypeError: Failed to fetch'}}; return {data:f.user?f.league:[],error:null}; }
      return {data:null,error:null}; } };
  window.supabase={ createClient:()=>client }; })();`;
