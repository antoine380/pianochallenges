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
