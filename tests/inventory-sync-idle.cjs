const {JSDOM,VirtualConsole}=require('jsdom');
const {IDBFactory,IDBKeyRange}=require('fake-indexeddb');
const {webcrypto}=require('crypto');const fs=require('fs'),path=require('path'),assert=require('assert');
// Node's structuredClone cannot clone jsdom Blob/File; emulate browser IndexedDB cloning.
const nativeClone=global.structuredClone;global.structuredClone=function(value){if(value&&typeof value==='object'){const tag=Object.prototype.toString.call(value);if(tag==='[object Blob]'||tag==='[object File]')return value;if(Array.isArray(value))return value.map(global.structuredClone);if(tag==='[object Object]'||Object.getPrototypeOf(value)===null)return Object.fromEntries(Object.entries(value).map(([k,v])=>[k,global.structuredClone(v)]))}return nativeClone(value)};
const html=fs.readFileSync(path.join(__dirname,'.generated/site/index.html'),'utf8');
const server={rows:new Map(),files:new Map(),recovery:[],attempts:0};const windows=[];
const canonical=v=>Array.isArray(v)?v.map(canonical):v&&typeof v==='object'?Object.fromEntries(Object.keys(v).sort((a,b)=>a.length-b.length||a.localeCompare(b)).map(k=>[k,canonical(v[k])])):v;
const clone=v=>canonical(JSON.parse(JSON.stringify(v)));
async function device(id){
 const errors=[];let callback;const account={id:'account-one',email:'one@example.com'};
 const vc=new VirtualConsole();vc.on('jsdomError',e=>{if(!/Not implemented/.test(e.message))errors.push(e.message)});
 const dom=new JSDOM(html,{url:'https://losstudio.github.io/LOS-app/',runScripts:'dangerously',pretendToBeVisual:true,virtualConsole:vc,beforeParse(w){
   w.matchMedia=()=>({matches:false});w.HTMLDialogElement.prototype.showModal=function(){this.open=true};w.HTMLDialogElement.prototype.close=function(){this.open=false};
   w.indexedDB=new IDBFactory();w.IDBKeyRange=IDBKeyRange;w.TextEncoder=TextEncoder;Object.defineProperty(w,'crypto',{value:webcrypto});w.fetch=async()=>({ok:true});w.Headers=Headers;w.Request=Request;w.Response=Response;w.alert=m=>errors.push('Alert: '+m);w.confirm=()=>true;w.URL.createObjectURL=()=> 'blob:test';w.URL.revokeObjectURL=()=>{};w.scrollTo=()=>{};
   w.localStorage.setItem('losStudioCloudDeviceV1',id);
   w.supabase={createClient(){return {
     auth:{onAuthStateChange(f){callback=f;return {}},getSession:async()=>({data:{session:null}}),getUser:async()=>({data:{user:w.__account||account}}),signInWithPassword:async()=>({data:{session:{user:w.__account||account}}}),signUp:async()=>({data:{session:null}}),signOut:async()=>{if(callback)callback('SIGNED_OUT');return {}},resetPasswordForEmail:async()=>({}),updateUser:async()=>({})},
     from(table){if(table==='los_studio_recovery'){const filters={};const rows=()=>server.recovery.filter(r=>r.user_id===(w.__account||account).id&&Object.entries(filters).every(([k,v])=>r[k]===v));return {select(){return this},eq(k,v){filters[k]=v;return this},order(){return this},limit:async()=>({data:clone(rows())}),maybeSingle:async()=>({data:clone(rows()[0]||null)})};}let uid;return {select(){return this},eq(k,v){uid=v;return this},maybeSingle:async()=>({data:clone(server.rows.get(uid)||null)})}},
     async rpc(name,args){assert.equal(name,'los_studio_commit');if(w.__offline)return {error:{message:'Network offline'}};const uid=(w.__account||account).id;const current=server.rows.get(uid);server.attempts++;if(w.__raceOnce){w.__raceOnce=false;const row=clone(current);row.state.info.remoteDuringRace='preserved';row.revision++;server.rows.set(uid,row);return {data:{accepted:false,row}}}if((current?.revision||0)!==args.expected_revision)return {data:{accepted:false,row:clone(current)}};const row={user_id:uid,state:clone(args.snapshot),revision:(current?.revision||0)+1,device_id:args.device,updated_at:new Date().toISOString()};server.rows.set(uid,row);return {data:{accepted:true,row:clone(row)}}},
     storage:{from(bucket){assert.equal(bucket,'los-studio-private-files');return {upload:async(p,json)=>{if(w.__offline)return {error:{message:'Network offline'}};assert(p.startsWith((w.__account||account).id+'/'));server.files.set(p,json);return {}},download:async p=>server.files.has(p)?{data:new w.Blob([server.files.get(p)],{type:'application/json'})}:{error:{message:'missing file'}}}}}
   }}};
 }});windows.push(dom);const w=dom.window;await new Promise(r=>setTimeout(r,100));
 const login=async()=>{w.document.getElementById('los-auth-email').value=(w.__account||account).email;w.document.getElementById('los-auth-password').value='test-password';await w.document.getElementById('los-auth-submit').onclick();assert(!w.document.getElementById('los-auth-gate'),'Login must hydrate and unlock')};await login();return {w,errors,login};
}
(async()=>{
 const a=await device('inventory-device');
 a.w.eval("state.inventory=[{id:'fabric',name:'Cotton',hasPhoto:true}];saveState()");
 const db=await a.w.openInventoryPhotoDB();await new Promise(resolve=>{const tx=db.transaction('inventoryPhotos','readwrite');tx.objectStore('inventoryPhotos').put({id:'fabric',dataUrl:'data:image/jpeg;base64,dGVzdA=='});tx.oncomplete=resolve});db.close();
 await a.w.losCloudSyncNow();
 // Run the embedded Orders scripts, sharing browser storage with the host.
 const legacy=Buffer.from(html.match(/const LEGACY_ORDERS_HTML_B64\s*=\s*['"]([^'"]+)/)[1],'base64').toString('utf8');
 const child=new JSDOM(legacy,{url:'https://losstudio.github.io/LOS-app/',runScripts:'dangerously',pretendToBeVisual:true,virtualConsole:new VirtualConsole(),beforeParse(w){
   Object.defineProperty(w,'parent',{value:a.w});Object.defineProperty(w,'localStorage',{value:a.w.localStorage});
   w.matchMedia=()=>({matches:false,addEventListener(){}});w.alert=()=>{};w.confirm=()=>true;w.scrollTo=()=>{};
 }});windows.push(child);
 const frame=a.w.document.getElementById('legacyOrdersFrame');
 Object.defineProperty(frame,'contentWindow',{value:child.window});Object.defineProperty(frame,'contentDocument',{value:child.window.document});
 await a.w.syncLegacyOrdersFrame();await new Promise(r=>setTimeout(r,1300));await a.w.losCloudSyncNow();
 const bridgeCommits=server.attempts;
 await new Promise(r=>setTimeout(r,6500));
 assert.equal(server.attempts,bridgeCommits,'Live embedded Orders must not keep saving while idle');
 assert(a.w.document.getElementById('los-live-sync').textContent.includes('All changes saved'),'Live embedded Orders must leave the badge settled');

 child.window.document.querySelector('[onclick="saveStudio()"]').click();
 await new Promise(r=>setTimeout(r,1600));await a.w.losCloudSyncNow();
 assert(server.rows.get('account-one').state.legacyOrders.length>0,'Orders Save button uploads its saved order');
 const settled=server.attempts;
 await new Promise(r=>setTimeout(r,6500));assert.equal(server.attempts,settled,'Embedded Orders and inventory photo stay idle after save');
 assert(a.w.document.getElementById('los-live-sync').textContent.includes('All changes saved'));
 console.log('PASS: real embedded Orders shares storage without idle uploads; Save Order uploads; inventory photo remains settled');
})().catch(e=>{console.error(e);process.exitCode=1}).finally(()=>windows.forEach(d=>d.window.close()));
