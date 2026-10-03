const {JSDOM,VirtualConsole}=require('jsdom');
const {IDBFactory,IDBKeyRange}=require('fake-indexeddb');
const {webcrypto}=require('crypto');const fs=require('fs'),path=require('path'),assert=require('assert');
// Node's structuredClone cannot clone jsdom Blob/File; emulate browser IndexedDB cloning.
const nativeClone=global.structuredClone;global.structuredClone=function(value){if(value&&typeof value==='object'){const tag=Object.prototype.toString.call(value);if(tag==='[object Blob]'||tag==='[object File]')return value;if(Array.isArray(value))return value.map(global.structuredClone);if(tag==='[object Object]'||Object.getPrototypeOf(value)===null)return Object.fromEntries(Object.entries(value).map(([k,v])=>[k,global.structuredClone(v)]))}return nativeClone(value)};
const html=fs.readFileSync(path.join(__dirname,'.generated/site/index.html'),'utf8');
const server={rows:new Map(),files:new Map(),recovery:[],attempts:0};const windows=[];
const clone=v=>JSON.parse(JSON.stringify(v));
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
 const a=await device('device-a');a.w.eval("state.info.phone='123';state.inventory=[{id:'fabric',name:'Cotton',qty:2,unit:'m',cost:3}];saveState()");await a.w.losCloudSyncNow();
 const b=await device('device-b');assert.equal(b.w.eval('state.info.phone'),'123','Login pulls account data');assert.equal(b.w.eval('state.inventory[0].name'),'Cotton');
 // Different fields edited before either device notices the other's changes.
 a.w.eval("state.info.phone='456';saveState()");b.w.eval("state.info.email='shop@example.com';saveState()");await Promise.all([a.w.losCloudSyncNow(),b.w.losCloudSyncNow()]);await a.w.losCloudSyncNow();await b.w.losCloudSyncNow();
 assert.equal(server.rows.get('account-one').state.info.phone,'456');assert.equal(server.rows.get('account-one').state.info.email,'shop@example.com');assert.equal(a.w.eval('state.info.email'),'shop@example.com');
 // Version-race retry must preserve the save that won the race.
 a.w.__raceOnce=true;a.w.eval("state.info.address='New address';saveState()");await a.w.losCloudSyncNow();assert.equal(server.rows.get('account-one').state.info.remoteDuringRace,'preserved');
 // Deletion on A and an unrelated addition on B both survive.
 await b.w.losCloudSyncNow();a.w.eval('state.inventory=[];saveState()');b.w.eval("state.inventory.push({id:'ribbon',name:'Ribbon',qty:1,unit:'m',cost:1});saveState()");await a.w.losCloudSyncNow();await b.w.losCloudSyncNow();assert.deepEqual(server.rows.get('account-one').state.inventory.map(x=>x.id),['ribbon']);
 // Upload a PDF and a photo using existing module stores; B restores the bytes.
 a.w.eval("state.packaging.push({id:'box',name:'Gift box',hasPdf:true,pdfName:'box.pdf'});state.inventory.push({id:'photo',name:'Photo fabric',hasPhoto:true})");
 await a.w.putPackagePdf('box',new a.w.File(['test PDF bytes'],'box.pdf',{type:'application/pdf'}));
 const db=await a.w.openInventoryPhotoDB();await new Promise((resolve,reject)=>{const tx=db.transaction('inventoryPhotos','readwrite');tx.objectStore('inventoryPhotos').put({id:'photo',name:'fabric.jpg',type:'image/jpeg',dataUrl:'data:image/jpeg;base64,dGVzdA=='});tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error)});db.close();a.w.saveState();await a.w.losCloudSyncNow();await b.w.losCloudSyncNow();
 const pdf=await b.w.getPackagePdf('box');assert(pdf?.blob,'PDF should restore to another device');const text=await new Promise(resolve=>{const r=new b.w.FileReader();r.onload=()=>resolve(r.result);r.readAsText(pdf.blob)});assert.equal(text,'test PDF bytes');assert.equal((await b.w.getInventoryPhoto('photo')).dataUrl,'data:image/jpeg;base64,dGVzdA==');assert(server.files.size>=2);

 // Pattern/media/printable/machine/business files share the private attachment store.
 a.w.eval("state.patternAssets.push({id:'library-pdf',fileId:'library-pdf',title:'Pattern file',name:'pattern.pdf',type:'application/pdf'});state.projects.push({id:'project',name:'Sample project',hasPhoto:true})");
 await a.w.machineFileStore('put',{id:'library-pdf',blob:new a.w.File(['private pattern'],'pattern.pdf',{type:'application/pdf'})});
 const projectDB=await a.w.openProjectPhotoDB();await new Promise((resolve,reject)=>{const tx=projectDB.transaction('projectPhotos','readwrite');tx.objectStore('projectPhotos').put({id:'project',name:'project.jpg',type:'image/jpeg',dataUrl:'data:image/jpeg;base64,cHJvamVjdA=='});tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error)});projectDB.close();
 await a.w.losPutProjectAsset({id:'project-file',projectId:'project',name:'project.pdf',type:'application/pdf',dataUrl:'data:application/pdf;base64,cHJvamVjdC1maWxl'});
 a.w.saveState();await a.w.losCloudSyncNow();await b.w.losCloudSyncNow();
 assert((await b.w.machineFileStore('get','library-pdf'))?.blob,'Library PDF restored');assert.equal((await b.w.getProjectPhoto('project')).dataUrl,'data:image/jpeg;base64,cHJvamVjdA==');assert.equal((await b.w.losGetProjectAsset('project-file')).dataUrl,'data:application/pdf;base64,cHJvamVjdC1maWxl');
 // Full portable backups include all record collections and actual attachment bytes.
 a.w.localStorage.setItem('sb-test-auth-token','secret-token-never-export');
 const portable=await a.w.losCreateFullBackup();assert(portable.payload.files.length>=5);assert(!JSON.stringify(portable).includes('secret-token-never-export'));
 assert(portable.payload.files.some(f=>f.json.includes('dGVzdA==')),'Photo bytes included');
 assert(portable.payload.files.some(f=>f.json.includes('__blobData')),'PDF bytes included');
 await a.w.losValidateFullBackup(portable);
 const downloads=[];let downloadBlob;a.w.AndroidDownload={saveFile:(data,mime,name)=>downloads.push({data,mime,name})};a.w.URL.createObjectURL=blob=>{downloadBlob=blob;return 'blob:backup-test'};a.w.fetch=async()=>({ok:true,blob:async()=>downloadBlob});a.w.eval(fs.readFileSync('.github/scripts/download-file.js','utf8'));
 await a.w.exportBackup();await new Promise(r=>setTimeout(r,40));assert.equal(downloads.length,1);assert.equal(downloads[0].mime,'application/json');const downloaded=JSON.parse(Buffer.from(downloads[0].data,'base64').toString());assert.equal(downloaded.payload.accountId,'account-one');assert(downloaded.payload.files.length>=5);assert(!JSON.stringify(downloaded).includes('secret-token-never-export'));
 await a.w.v75RestoreBackup({files:[new a.w.File([JSON.stringify(portable)],'backup.json',{type:'application/json'})],value:'selected'});assert(a.w.document.getElementById('los-backup-dialog').open);a.w.document.getElementById('los-backup-cancel').click();assert(!a.w.document.getElementById('los-backup-dialog').open);assert.equal(a.w.eval('state.info.phone'),'456','Cancelling restore does not replace data');

 const damaged=clone(portable);damaged.payload.snapshot.info.phone='tampered';await assert.rejects(a.w.losRestoreFullBackup(damaged),/incomplete|changed/);assert.equal(a.w.eval('state.info.phone'),'456');
 const beforePhone=portable.payload.snapshot.info.phone;a.w.eval("state.info.phone='later-edit';saveState()");await a.w.losCloudSyncNow();
 await a.w.losRestoreFullBackup(portable);assert.equal(a.w.eval('state.info.phone'),beforePhone);assert.equal(server.rows.get('account-one').state.info.phone,beforePhone);assert((await a.w.getPackagePdf('box')).blob);
 a.w.__account={id:'account-one',email:'new@example.com'};await a.w.losValidateFullBackup(portable);a.w.__account={id:'account-two',email:'two@example.com'};await assert.rejects(a.w.losValidateFullBackup(portable),/account changed/i);a.w.__account={id:'account-one',email:'one@example.com'};
 const foreign=clone(portable);foreign.payload.accountId='account-two';await assert.rejects(a.w.losValidateFullBackup(foreign),/different account/);
 const missing=clone(portable);missing.payload.files=[];missing.checksum=Array.from(new Uint8Array(await webcrypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify(missing.payload)))),b=>b.toString(16).padStart(2,'0')).join('');await assert.rejects(a.w.losValidateFullBackup(missing),/missing an attached file/);
 assert(!a.w.document.getElementById('los-live-sync').hidden);assert(a.w.document.getElementById('los-live-sync').textContent.includes('All changes saved'));
 a.w.document.getElementById('los-setup-hide').click();assert(a.w.document.getElementById('los-first-use').hidden);a.w.document.getElementById('los-setup-show').click();assert(!a.w.document.getElementById('los-first-use').hidden);
 await a.w.losCloudSyncNow();
 // Actual timer-driven updates require no manual upload or pull.
 a.w.eval("state.info.website='automatic.example';saveState()");await new Promise(resolve=>setTimeout(resolve,6500));assert.equal(b.w.eval('state.info.website'),'automatic.example','An open device automatically receives the saved change');
 // Offline saves remain local, then are retried on reconnect.
 a.w.__offline=true;a.w.eval("state.info.phone='offline-change';saveState()");await a.w.losCloudSyncNow();assert.equal(a.w.eval('state.info.phone'),'offline-change');a.w.__offline=false;await a.w.losCloudSyncNow();assert.equal(server.rows.get('account-one').state.info.phone,'offline-change');
 // Sign-out locks and prevents writes. Another account must not inherit records.
 await b.w.losCloudSignOut();assert(b.w.document.body.classList.contains('los-auth-locked'));const before=server.attempts;await b.w.losCloudPush(true);assert.equal(server.attempts,before);
 b.w.__account={id:'account-two',email:'two@example.com'};await b.login();assert.equal(b.w.eval('state.inventory.length'),0);assert.equal(b.w.eval('state.packaging.length'),0);assert.equal(await b.w.getPackagePdf('box'),null,'Other account cannot read the prior account file cache');assert.equal((server.rows.get('account-two').state._cloudFiles||[]).length,0);
 // Deleting another account clears the local owner and working state.
 // Returning to the existing account must use its own checkpoint, not merge emptiness.
 await b.w.losCloudSignOut();
 b.w.eval('Object.keys(state).forEach(k=>{if(Array.isArray(state[k]))state[k]=[]});state.info={}');b.w.localStorage.removeItem('losStudioCloudLocalOwnerV1');
 b.w.__account={id:'account-one',email:'renamed@example.com'};
 await b.login();assert.equal(b.w.eval('state.info.phone'),'offline-change');assert(b.w.eval('state.inventory.length')>0);assert(b.w.eval('state.projects.length')>0);
 assert(server.rows.get('account-one').state.inventory.length>0,'Deleting a different account must not erase this cloud snapshot');
 // No local checkpoint: the server is authoritative even if a cached base exists.
 await b.w.losCloudSignOut();
 const meta=await new Promise((resolve,reject)=>{const q=b.w.indexedDB.open('LOSStudioCloudMetaV2',1);q.onsuccess=()=>resolve(q.result);q.onerror=()=>reject(q.error)});
 await new Promise(resolve=>{const tx=meta.transaction('accounts','readwrite');tx.objectStore('accounts').delete('account-one:local');tx.oncomplete=resolve});meta.close();
 b.w.eval('Object.keys(state).forEach(k=>{if(Array.isArray(state[k]))state[k]=[]});state.info={}');b.w.localStorage.removeItem('losStudioCloudLocalOwnerV1');await b.login();
 assert.equal(b.w.eval('state.info.phone'),'offline-change');assert(b.w.eval('state.inventory.length')>0,'Missing owner/checkpoint must pull, not delete, existing data');
 // Recovery can list and restore only copies owned by the current immutable ID.
 const recoveryDB=await new Promise((resolve,reject)=>{const q=b.w.indexedDB.open('LOSStudioCloudMetaV2',1);q.onsuccess=()=>resolve(q.result);q.onerror=()=>reject(q.error)});
 const recovery=clone(server.rows.get('account-one').state);recovery.info.recoveredTest='preserved';
 await new Promise(resolve=>{const tx=recoveryDB.transaction('accounts','readwrite');tx.objectStore('accounts').put({id:'account-one:recovery-test',state:recovery});tx.oncomplete=resolve});recoveryDB.close();
 const copies=await b.w.losCloudRecoveryCopies();assert(copies.some(x=>x.id==='account-one:recovery-test'));assert(copies.every(x=>x.id==='account-one'||x.id.startsWith('account-one:')));
 await assert.rejects(b.w.losCloudRestoreCopy('account-two'),/does not belong/);
 await b.w.losCloudRestoreCopy('account-one:recovery-test');assert.equal(b.w.eval('state.info.recoveredTest'),'preserved');assert.equal(server.rows.get('account-one').state.info.recoveredTest,'preserved');
 // Cloud recovery stays attached to immutable ID after the email changes.
 const cloudCopy=clone(recovery);cloudCopy.info.recoveredTest='cloud-preserved';
 server.recovery.push({user_id:'account-one',revision:42,state:cloudCopy,created_at:new Date().toISOString()});
 server.recovery.push({user_id:'account-two',revision:99,state:{orders:[{id:'foreign'}]},created_at:new Date().toISOString()});
 const cloudCopies=await b.w.losCloudRecoveryCopies();assert(cloudCopies.some(x=>x.id==='cloud:42'&&x.source==='Cloud'));assert(!cloudCopies.some(x=>x.id==='cloud:99'));
 await assert.rejects(b.w.losCloudRestoreCopy('cloud:99'));
 await b.w.losCloudRestoreCopy('cloud:42');assert.equal(b.w.eval('state.info.recoveredTest'),'cloud-preserved');assert.equal(server.rows.get('account-one').state.info.recoveredTest,'cloud-preserved');
 // All modules still open after account initialization.
 const modules=[...new Set([...a.w.document.querySelectorAll('.nav-btn[data-view]')].map(x=>x.dataset.view))];for(const n of modules){a.w.switchView(n);assert(a.w.document.getElementById('view'+n)?.classList.contains('active'),n)}
 assert.deepEqual(a.errors,[]);assert.deepEqual(b.errors,[]);
 console.log('PASS: full backup/restore and ownership, guide, visible sync, login hydration, 17 modules, two-device merges, CAS race retry, record deletion, PDF/photo transfer, offline retry, logout and account isolation');
})().catch(e=>{console.error(e);process.exitCode=1}).finally(()=>windows.forEach(d=>d.window.close()));
