const {JSDOM,VirtualConsole}=require('jsdom');
const {indexedDB,IDBKeyRange}=require('fake-indexeddb');
const fs=require('fs');
const errors=[];let callback;const user={id:'test-user',email:'test@example.com'};
const vc=new VirtualConsole();vc.on('jsdomError',e=>{if(!/Not implemented/.test(e.message))errors.push(e.message)});
const dom=new JSDOM(fs.readFileSync(require('path').join(__dirname,'.generated/site/index.html'),'utf8'),{url:'https://losstudio.github.io/LOS-app/',runScripts:'dangerously',pretendToBeVisual:true,virtualConsole:vc,beforeParse(w){
 w.indexedDB=indexedDB;w.IDBKeyRange=IDBKeyRange;w.fetch=async()=>({ok:true});w.Headers=Headers;w.Request=Request;w.Response=Response;w.alert=m=>errors.push('Alert: '+m);w.confirm=()=>true;w.URL.createObjectURL=()=> 'blob:test';w.URL.revokeObjectURL=()=>{};w.scrollTo=()=>{};
 w.supabase={createClient(){return {auth:{onAuthStateChange(f){callback=f;return {}},getSession:async()=>({data:{session:null}}),getUser:async()=>({data:{user:w.__mockUser||user}}),signInWithPassword:async()=>({data:{session:{user}}}),signUp:async()=>({data:{session:null}}),signOut:async()=>{if(callback)callback('SIGNED_OUT');return {}},resetPasswordForEmail:async()=>({}),updateUser:async()=>({})},from(){return {select(){return this},eq(){return this},maybeSingle:async()=>({data:w.__mockCloudRow||null}),upsert:async p=>{w.__lastPush=p;return {}}}}}}};
}});
(async()=>{const w=dom.window;await new Promise(r=>setTimeout(r,200));const locked=w.document.body.classList.contains('los-auth-locked');w.document.getElementById('los-auth-email').value=user.email;w.document.getElementById('los-auth-password').value='test-password';await w.document.getElementById('los-auth-submit').onclick();await new Promise(r=>setTimeout(r,100));
 const modules=[...new Set([...w.document.querySelectorAll('.nav-btn[data-view]')].map(e=>e.dataset.view))];const results=[];
 for(const name of modules){let error=null;try{w.switchView(name)}catch(e){error=e.message}results.push({name,active:!!w.document.getElementById('view'+name)?.classList.contains('active'),error});}
 const beforePull=errors.length;w.__mockCloudRow={state:{inventory:[],orders:[],legacyOrders:[],legacyOrderHistory:[],info:{businessName:'Cloud Test'},localStorageData:{}},updated_at:new Date(Date.now()+10000).toISOString()};await w.losCloudPull();
 const pullUnlocked=!w.document.getElementById('los-auth-gate');await w.losCloudSignOut();const logoutLocked=w.document.body.classList.contains('los-auth-locked')&&!!w.document.getElementById('los-auth-gate');w.__lastPush=null;await w.losCloudPush(true);const blockedPush=w.__lastPush===null;

 // Another account must not inherit this account's local order workspace.
 w.localStorage.setItem('los_orders_workspace',JSON.stringify([{id:'private-old-order'}]));
 w.__mockUser={id:'another-account',email:'other@example.com'};w.__mockCloudRow=null;
 w.document.getElementById('los-auth-email').value='other@example.com';w.document.getElementById('los-auth-password').value='test-password';
 await w.document.getElementById('los-auth-submit').onclick();
 const accountIsolated=w.localStorage.getItem('los_orders_workspace')===null&&w.localStorage.getItem('losStudioCloudLocalOwnerV1')==='another-account';
 w.localStorage.setItem('sb-test-auth-token','private-token');
 await w.losCloudPush(true);
 const tokensExcluded=!!w.__lastPush&&!Object.keys(w.__lastPush.state.localStorageData).some(k=>k.startsWith('sb-'));
 console.log(JSON.stringify({locked,results,pullUnlocked,logoutLocked,blockedPush,accountIsolated,tokensExcluded,errors,pullErrors:errors.slice(beforePull)},null,2));dom.window.close();
 if(!accountIsolated||!tokensExcluded||errors.length||!locked||!pullUnlocked||!logoutLocked||!blockedPush||results.some(r=>r.error||!r.active))process.exitCode=1;
})().catch(e=>{console.error(e);dom.window.close();process.exitCode=1});
