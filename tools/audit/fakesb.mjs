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

// faux SDK Supabase du back office (admin/index.html), servi à la place de /assets/js/supabase-2.116.0.js.
// window.__ADM : {aal, enrolled, notAdmin, role, log:[actions], calls:[rpc]} ; mot de passe « bad » = refusé, code « 123456 » = bon.
// Sans aal2, toute fonction admin_* répond 42501 (comme is_admin côté serveur).
export const FAKE_ADMIN = `(()=>{ const A=window.__ADM=Object.assign({aal:null, enrolled:false, notAdmin:false, role:'owner', log:[], calls:[], leagues:false}, window.__ADM||{});
  const ss=()=>{ try{ return JSON.parse(sessionStorage.getItem('fake-adm')||'null'); }catch(e){ return null; } }, put=v=>sessionStorage.setItem('fake-adm', JSON.stringify(v));
  if(ss()){ const s=ss(); A.aal=s.aal; A.enrolled=s.enrolled; }
  const day=n=>{ const d=new Date(); d.setDate(d.getDate()-n); return d.toISOString().slice(0,10); };
  const series=Array.from({length:30},(_,i)=>({day:day(29-i), actors:40+Math.round(25*Math.sin(i/4))+i, events:400+i*9}));
  const users=Array.from({length:8},(_,i)=>({id:'00000000-0000-0000-0000-00000000000'+i, name:['Antoine','Léa','<img src=x onerror=window.__pwn=1>','Sam','Noor','Ana','Jo','Max'][i], avatar:i, email:'joueur'+i+'@example.com', created_at:new Date(Date.now()-i*864e5*9).toISOString(), last_sign_in:new Date(Date.now()-i*3600e3).toISOString(), xp:5000-i*500, level:20-i, streak:i*3, banned:i===5, prem_until:i===2?new Date(Date.now()+20*864e5).toISOString():null}));
  const D={
    admin_me:()=>({role:A.role, email:'antoine@example.com'}),
    admin_dashboard:()=>({active_day:57,active_7:212,active_30:640,guests_30:410,accounts:233,new_accounts_7:18,new_accounts_30:61,new_devices_7:74,play:{sec_7:183400,sessions_7:1290},
      retention:{d1:{cohort:300,back:126},d7:{cohort:250,back:61},d30:{cohort:80,back:9}}, alerts:[{lvl:'warning',k:'feedback',n:3},{lvl:'serious',k:'errors',n:27}], series:series.map(x=>({day:x.day,actors:x.actors}))}),
    admin_stats:()=>({events:12034,actors:640,funnel:[500,410,260,140,61],pp:Array.from({length:6},(_,i)=>({id:'p0'+(i+1),n:300-i*40,stars:2.6-i*.1})),inputs:{midi:220,screen:300,mic:60,none:60},
      keyboards:[{name:'Roland FP-30X',n:40},{name:'Yamaha P-125',n:31},{name:'LUMI Keys',n:12},{name:'Arturia KeyLab Essential 61 mk3 très long nom',n:4}],
      activities:[{name:'learn_end',what:'chords',n:900,actors:200},{name:'game_end',what:'runner',n:600,actors:150},{name:'quiz_end',what:'',n:200,actors:80},{name:'duel_end',what:'speed',n:120,actors:50},{name:'pp_lesson_done',what:'',n:700,actors:300}],
      devices:{'phone·web':200,'tablet·ios':150,'desktop·web':290},langs:{fr:500,en:140},quiz:{n:200,players:1.6,ok_rate:.71,online:30},
      duels:{n:120,win:60,loss:50,draw:10,bot:70,online:40,friend:10,elo_avg:912,by_game:{runner:50,speed:40,memory:30}},elo:[{b:600,n:10},{b:800,n:30},{b:1000,n:12}],
      goal:{n:300,actors:120,by:{'min 10':200,'xp 50':100}},badges:[{id:'first-chord',n:200},{id:'streak-7',n:40}],streaks:{'0':80,'1-2':60,'3-6':50,'7-29':30,'30+':13},series}),
    admin_users:a=>{ const q=(a.p_q||'').toLowerCase(); const r=users.filter(u=>!q||u.name.toLowerCase().includes(q)||u.email.includes(q)); return {total:users.length, rows:r.map(u=>({...u, email:A.role==='lecture'?null:u.email}))}; },
    admin_user:a=>{ const u=users.find(x=>x.id===a.p_id)||users[0]; return {id:u.id,email:A.role==='lecture'?null:u.email,created_at:u.created_at,last_sign_in:u.last_sign_in,providers:['email'],banned_until:u.banned?new Date(Date.now()+1e9).toISOString():null,
      profile:{name:u.name,level:u.level,xp:u.xp,streak:u.streak},progress:{lang:'fr',input:'midi',pp:{p01:{},p02:{}},size:5120,updated_at:new Date().toISOString()},
      xp_days:Array.from({length:12},(_,i)=>({day:day(i),xp:30+i*7})),events:[{at:new Date().toISOString(),name:'learn_end',props:{what:'chords',n:'10'}}],feedback:[{id:1,at:new Date().toISOString(),kind:'bug',msg:'Le son craque',status:'new'}],prem_until:u.prem_until,admin_role:null}; },
    admin_user_rename:a=>(A.log.push('user.rename'),{ok:true}), admin_user_premium:a=>(A.log.push('user.premium'),{ok:true}), admin_user_reset:a=>(A.log.push('user.reset'),{ok:true}),
    admin_user_export:a=>(A.log.push('user.export'),{exported_at:new Date().toISOString(),account:{id:a.p_id}}),
    admin_config_list:()=>(A.cfg||[{key:'flags',value:{paywall:false,analytics:true,errSample:.25},updated_at:new Date().toISOString()}]),
    admin_config_set:a=>{ A.log.push('config.set:'+a.p_key); A.cfg=(A.cfg||D.admin_config_list()).filter(x=>x.key!==a.p_key).concat(a.p_value==null?[]:[{key:a.p_key,value:a.p_value,updated_at:new Date().toISOString()}]); return {ok:true}; },
    admin_notifs:()=>({by_kind:{streak:40,weekly:120,news:233},recent:[{title:'Nouveau : le quiz',body:'Joue à 4',kind:'news',at:new Date().toISOString(),n:233}],prefs:{n:200,weekly:180,streak:150},
      jobs:[{name:'pc-streak',schedule:'0 17 * * *',active:true,last:{at:new Date().toISOString(),status:'succeeded'}},{name:'pc-admin-nightly',schedule:'10 2 * * *',active:true,last:null}]}),
    admin_notify_count:a=>({all:233,active7:120,inactive14:60,fr:180,en:53})[a.p_group]||0,
    admin_leagues:()=>A.leagues?{installed:true,week:day(3),groups:[{tier:0,grp:0,n:20,closed:false},{tier:0,grp:1,n:18,closed:false},{tier:2,grp:0,n:12,closed:false}],weeks:[{week:day(3),formed_at:new Date().toISOString(),closed_at:null}]}:{installed:false},
    admin_league_action:a=>(A.log.push('league.'+a.p_action),{ok:true,rows:5}),
    admin_feedback:a=>[{id:1,at:new Date().toISOString(),kind:'bug',msg:'Le son craque sur iPad quand je joue vite.',contact:'lea@example.com',ctx:{ver:'2026-10-25',dev:'tablet',plat:'ios',inp:'midi'},status:'new',note:null,user_id:users[1].id,name:'Léa'},{id:2,at:new Date().toISOString(),kind:'idea',msg:'Un mode duo ?',contact:null,ctx:{},status:'new',note:null,user_id:null,name:null}].filter(f=>!a.p_status||f.status===a.p_status),
    admin_feedback_set:a=>(A.log.push('feedback.set'),{ok:true}),
    admin_system:()=>({versions:[{ver:'2026-10-25T10:00Z',plat:'web',n:300,last:new Date().toISOString()},{ver:'2026-10-24T14:39Z',plat:'ios',n:120,last:new Date().toISOString()}],errors:[{msg:'TypeError: x is null',src:'/index.html',line:120,n:12,devices:5,last:new Date().toISOString(),ver:'2026-10-25'}],errors_24h:12,events_total:123456,stats_day:day(1)}),
    admin_log_list:()=>A.log.map((a,i)=>({at:new Date().toISOString(),who:'antoine@example.com',action:a,target:'x',detail:{}})),
  };
  const RANK={owner:3,support:2,lecture:1}, NEED={admin_user_reset:'owner',admin_config_set:'owner',admin_league_action:'owner',admin_user_rename:'support',admin_user_premium:'support',admin_user_export:'support',admin_feedback:'support',admin_feedback_set:'support',admin_log_list:'support',admin_notify_count:'support'};
  const listeners=[]; const sess=()=>A.aal?{access_token:'tok-'+A.aal, user:{id:'adm', email:'antoine@example.com'}}:null;
  const client={
    auth:{
      getSession:async()=>({data:{session:sess()},error:null}),
      onAuthStateChange(cb){ listeners.push(cb); return {data:{subscription:{unsubscribe(){}}}}; },
      signInWithPassword:async({email,password})=>{ if(password==='bad') return {data:null,error:{message:'Invalid login credentials'}}; A.aal='aal1'; put({aal:A.aal,enrolled:A.enrolled}); return {data:{session:sess()},error:null}; },
      signOut:async()=>{ A.aal=null; sessionStorage.removeItem('fake-adm'); listeners.forEach(cb=>cb('SIGNED_OUT',null)); return {error:null}; },
      mfa:{
        getAuthenticatorAssuranceLevel:async()=>({data:{currentLevel:A.aal, nextLevel:A.enrolled?'aal2':'aal1'},error:null}),
        listFactors:async()=>({data:{totp:A.enrolled?[{id:'f1',status:'verified',factor_type:'totp'}]:[], all:A.enrolled?[{id:'f1',status:'verified',factor_type:'totp'}]:[]},error:null}),
        enroll:async()=>({data:{id:'f1',type:'totp',totp:{qr_code:'data:image/svg+xml;utf8,'+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><rect width="10" height="10" fill="#fff"/><rect x="1" y="1" width="3" height="3"/><rect x="6" y="1" width="3" height="3"/><rect x="1" y="6" width="3" height="3"/></svg>'),secret:'JBSWY3DPEHPK3PXP',uri:'otpauth://totp/x'}},error:null}),
        unenroll:async()=>({data:{},error:null}),
        challenge:async()=>({data:{id:'c1'},error:null}),
        verify:async({code})=>{ if(code!=='123456') return {data:null,error:{message:'Invalid TOTP code entered'}}; A.aal='aal2'; A.enrolled=true; put({aal:A.aal,enrolled:true}); return {data:{},error:null}; },
      },
    },
    rpc:async(name,args)=>{ A.calls.push(name); await new Promise(r=>setTimeout(r,20));
      if(A.aal!=='aal2' || A.notAdmin) return {data:null,error:{code:'42501',message:'forbidden'}};
      if(NEED[name] && RANK[A.role]<RANK[NEED[name]]) return {data:null,error:{code:'42501',message:'forbidden'}};
      if(!D[name]) return {data:null,error:{code:'PGRST202',message:'Could not find the function public.'+name}};
      return {data:JSON.parse(JSON.stringify(D[name](args||{}))),error:null}; },
    functions:{ invoke:async(fn,{body})=>{ if(A.aal!=='aal2') return {data:null,error:{message:'aal2 required'}}; A.log.push('edge.'+body.action); return {data:{ok:true,sent:233},error:null}; } },
  };
  window.supabase={ createClient:()=>client };
})();`;

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
