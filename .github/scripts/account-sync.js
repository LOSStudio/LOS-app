// Runs inside the original cloud-sync closure, after the authentication gate.
const __losSyncMetaKeys=new Set(['losStudioCloudLocalOwnerV1','losStudioCloudConfigV1','losStudioCloudDeviceV1','losStudioCloudAutoSyncV1','losStudioCloudLastPullV1','losStudioCloudLastPushV1','losStudioCloudLocalChangeV1']);
function __losIsAuthStorageKey(k){const x=String(k||'').toLowerCase();return x.startsWith('sb-')||x.includes('auth-token')||x.includes('supabase.auth')}
function __losIsSyncableStorageKey(k){return !!k&&!k.startsWith('losStudioFileMigrationV2:')&&k!=='losStudioBlueprintV1'&&!__losSyncMetaKeys.has(k)&&!__losIsAuthStorageKey(k)}
function __losCollectLocalStorage(){const out={};for(let i=0;i<localStorage.length;i++){const k=localStorage.key(i);if(__losIsSyncableStorageKey(k)){const v=localStorage.getItem(k);if(v!==null)out[k]=v}}return out}
let __losSyncApplying=false,__losPushTimer=null,__losSyncHydrated=false,__losSyncBusy=false,__losAuthUnlocked=false;
let __losBase=null,__losRevision=0,__losAccountId=null,__losAccountEmail='',__losGeneration=0,__losRetryNeeded=false,__losFileDirty=false;
const __losBucket='los-studio-private-files';
const __losClone=v=>JSON.parse(JSON.stringify(v));
const __losFileStores=[
  {db:'LOSStudioInventoryFilesDB',store:'inventoryPhotos',open:()=>openInventoryPhotoDB(),wanted:r=>(state.inventory||[]).some(x=>String(x.id)===String(r.id)&&x.hasPhoto)},
  {db:'LOSStudioProjectFilesDB',store:'projectPhotos',open:()=>openProjectPhotoDB(),wanted:r=>(state.projects||[]).some(x=>String(x.id)===String(r.id)&&x.hasPhoto)},
  {db:'LOSStudioFilesDB',store:'packagingPdfs',open:()=>openPackagingDB(),wanted:r=>(state.packaging||[]).some(x=>String(x.id)===String(r.id)&&x.hasPdf)},
  {db:'LOSStudioProjectAssetDB',store:'assets',open:()=>losOpenProjectAssetDB(),wanted:r=>(state.projects||[]).some(x=>String(x.id)===String(r.projectId))},
  {db:'LOS_Machine_Files',store:'files',open:()=>machineFilesDB(),wanted:r=>['machineAttachments','businessDocuments','mediaAssets','patternAssets','printableAssets'].some(k=>(state[k]||[]).some(x=>String(x.fileId||x.id)===String(r.id)))}
];
// Each account gets its own local file cache as well as its private cloud folder.
const __losOriginalDBOpen=indexedDB.open.bind(indexedDB);
indexedDB.open=function(name,version){const scoped=__losAccountId&&__losFileStores.some(x=>x.db===String(name))?String(name)+'__'+__losAccountId:name;return version===undefined?__losOriginalDBOpen(scoped):__losOriginalDBOpen(scoped,version)};
async function __losMigrateLegacyFiles(previous,g){
  const flag='losStudioFileMigrationV2:'+__losAccountId;
  if(localStorage.getItem(flag)==='1')return;
  if(!previous||previous===__losAccountId){
    for(const spec of __losFileStores){
      const db=await new Promise((resolve,reject)=>{const req=__losOriginalDBOpen(spec.db,1);req.onupgradeneeded=()=>{if(!req.result.objectStoreNames.contains(spec.store))req.result.createObjectStore(spec.store,{keyPath:'id'})};req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error)});
      const rows=await new Promise((resolve,reject)=>{const tx=db.transaction(spec.store,'readonly'),req=tx.objectStore(spec.store).getAll();req.onsuccess=()=>resolve(req.result||[]);req.onerror=()=>reject(req.error)});db.close();
      for(const row of rows){__losRequireCurrent(g);__losSyncApplying=true;try{await __losPutFile(spec,row)}finally{__losSyncApplying=false}}
    }
  }
  __losRequireCurrent(g);localStorage.setItem(flag,'1');
}
const __losStatusPill=document.createElement('div');__losStatusPill.id='los-account-save-status';__losStatusPill.setAttribute('role','status');__losStatusPill.style.cssText='padding:8px 12px;margin:10px;border-radius:12px;background:#edf7fb;font-size:12px;color:#31556b';__losStatusPill.textContent='Sign in to load your account';document.querySelector('.nav-sidebar')?.appendChild(__losStatusPill);
const __losOriginalStatus=setStatus;setStatus=function(message,saved=false){__losOriginalStatus(message,saved);__losStatusPill.textContent=saved?'All changes saved':message.startsWith('Not fully')?'Sync pending — changes kept on this device':message;const badge=document.getElementById('cloudSyncBadge');if(badge)badge.textContent=saved?'Saved':'Waiting to sync';const email=document.getElementById('losAccountEmail');if(email)email.textContent=__losAccountEmail};
function __losCloudReset(){if(__losAccountId&&__losSyncHydrated){const pending={id:__losAccountId+':local',state:__losSnapshot()};__losMeta('put',pending).catch(e=>console.warn('Unable to keep account checkpoint:',e.message))}__losGeneration++;__losBase=null;__losRevision=0;__losAccountId=null;__losSyncHydrated=false;__losAuthUnlocked=false;__losRetryNeeded=false;clearTimeout(__losPushTimer)}
function __losRequireCurrent(g){if(g!==__losGeneration||!__losAuthUnlocked)throw new Error('Account changed during sync. Please sign in again.')}
function __losMarkLocalChange(){if(__losSyncApplying)return;__losFileDirty=true;try{localStorage.setItem('losStudioCloudLocalChangeV1',new Date().toISOString())}catch(e){}__losRetryNeeded=true;clearTimeout(__losPushTimer);__losPushTimer=setTimeout(()=>__losCloudReconcile(),1200)}
function __losPatchSyncRealm(w){try{if(!w||w.__losSyncRealmPatched)return;const st=w.localStorage,proto=w.Storage&&w.Storage.prototype;if(!st||!proto)return;const set=proto.setItem,remove=proto.removeItem,clear=proto.clear;if(![set,remove,clear].every(x=>typeof x==='function'))return;w.__losSyncRealmPatched=true;proto.setItem=function(k,v){const r=set.call(this,k,v);if(!__losSyncApplying&&this===st&&__losIsSyncableStorageKey(k))__losMarkLocalChange();return r};proto.removeItem=function(k){const r=remove.call(this,k);if(!__losSyncApplying&&this===st&&__losIsSyncableStorageKey(k))__losMarkLocalChange();return r};proto.clear=function(){const r=clear.call(this);if(!__losSyncApplying&&this===st)__losMarkLocalChange();return r}}catch(e){}}
__losPatchSyncRealm(window);
function __losHookSyncIframes(){document.querySelectorAll('iframe').forEach(f=>{try{if(!f.__losSyncLoadHooked){f.__losSyncLoadHooked=true;f.addEventListener('load',()=>__losPatchSyncRealm(f.contentWindow))}if(f.contentDocument)__losPatchSyncRealm(f.contentWindow)}catch(e){}})}
__losHookSyncIframes();new MutationObserver(__losHookSyncIframes).observe(document.documentElement,{childList:true,subtree:true});
for(const name of ['saveState','persistHistoryState']){const original=window[name];if(original)window[name]=function(){const r=original.apply(this,arguments);__losMarkLocalChange();return r}}
// Watch committed file writes, including deletions and files whose metadata did not change.
if(window.IDBObjectStore){for(const method of ['put','add','delete','clear']){const original=IDBObjectStore.prototype[method];IDBObjectStore.prototype[method]=function(){const request=original.apply(this,arguments);if(__losFileStores.some(x=>(x.db===this.transaction.db.name||x.db+'__'+__losAccountId===this.transaction.db.name)&&x.store===this.name)){this.transaction.addEventListener('complete',()=>{if(!__losSyncApplying){__losFileDirty=true;__losMarkLocalChange()}},{once:true})}return request}}}
function __losMetaDB(){return new Promise((resolve,reject)=>{const req=indexedDB.open('LOSStudioCloudMetaV2',1);req.onupgradeneeded=()=>req.result.createObjectStore('accounts',{keyPath:'id'});req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error)})}
async function __losMeta(op,row){const db=await __losMetaDB();return new Promise((resolve,reject)=>{const tx=db.transaction('accounts',op==='get'?'readonly':'readwrite'),st=tx.objectStore('accounts');const req=op==='get'?st.get(row):st.put(row);let result;req.onsuccess=()=>result=req.result;tx.oncomplete=()=>{db.close();resolve(result)};tx.onerror=tx.onabort=()=>{db.close();reject(tx.error||new Error('Unable to save sync checkpoint'))}})}
async function __losRememberBase(snapshot,revision,g){__losRequireCurrent(g);const account=__losAccountId;await __losMeta('put',{id:account,state:snapshot,revision});__losRequireCurrent(g);__losBase=__losClone(snapshot);__losRevision=revision}
function __losFreshState(){const arrays=Object.fromEntries(Object.entries(state).filter(([,v])=>Array.isArray(v)).map(([k])=>[k,[]]));return {...arrays,...__losClone(__losEmptyAccountState)}}
function __losNormalise(){normaliseStudioModules();normaliseMachines();normalisePlanner();normaliseProjectStockLinks();normaliseAccountLinks();normaliseBusinessInfo(state.info||{},state.hmrcSettings||{})}
function __losRefreshCloudViews(){renderAll();if(typeof window.v75RenderAll==='function')window.v75RenderAll();const f=document.getElementById('legacyOrdersFrame');if(f&&f.contentWindow&&typeof syncLegacyOrdersFrame==='function')syncLegacyOrdersFrame()}
function __losApplyCloudSnapshot(snapshot){
  // A sync can finish after the user has focused an Orders field.
  if(__losSyncHydrated&&__losEditing()){__losRetryNeeded=true;return false}
  __losSyncApplying=true;
  try{
    state={...__losFreshState(),...__losClone(snapshot),info:{...__losEmptyAccountState.info,...(snapshot.info||{})}};
    const ls=snapshot.localStorageData||{},keys=[];for(let i=0;i<localStorage.length;i++){const k=localStorage.key(i);if(__losIsSyncableStorageKey(k))keys.push(k)}
    for(const k of keys)if(!Object.hasOwn(ls,k))localStorage.removeItem(k);
    for(const [k,v] of Object.entries(ls))if(__losIsSyncableStorageKey(k))localStorage.setItem(k,String(v));
    if(Array.isArray(state.legacyOrders))localStorage.setItem('los_orders_workspace',JSON.stringify(state.legacyOrders));
    if(Array.isArray(state.legacyOrderHistory))localStorage.setItem('los_orders_history',JSON.stringify(state.legacyOrderHistory));
    __losNormalise();origPersist(false);__losRefreshCloudViews();
  }finally{__losSyncApplying=false}
  return true;
}
function __losSnapshot(){const snapshot=serialisableState();for(const [k,out] of [['los_orders_workspace','legacyOrders'],['los_orders_history','legacyOrderHistory']]){try{const value=localStorage.getItem(k);if(value)snapshot[out]=JSON.parse(value)}catch(e){}}return snapshot}
function __losMergeSnapshots(base,local,remote){
  // Merge serialized JSON legacy stores as records, rather than replacing entire strings.
  const expand=s=>{const out=__losClone(s||{});for(const [k,v] of Object.entries(out.localStorageData||{})){try{out.localStorageData[k]={json:JSON.parse(v)}}catch(e){out.localStorageData[k]={text:v}}}return out};
  const merged=LOSSyncMerge.merge(expand(base),expand(local),expand(remote));
  for(const [k,v] of Object.entries(merged.localStorageData||{}))merged.localStorageData[k]=Object.hasOwn(v,'json')?JSON.stringify(v.json):v.text;
  // The structured Orders bridge is authoritative; keep its serialized stores consistent.
  if(Array.isArray(merged.legacyOrders))merged.localStorageData.los_orders_workspace=JSON.stringify(merged.legacyOrders);
  if(Array.isArray(merged.legacyOrderHistory))merged.localStorageData.los_orders_history=JSON.stringify(merged.legacyOrderHistory);
  return merged;
}
async function __losReadStore(spec){const db=await spec.open();return new Promise((resolve,reject)=>{const tx=db.transaction(spec.store,'readonly'),req=tx.objectStore(spec.store).getAll();let rows=[];req.onsuccess=()=>rows=req.result||[];tx.oncomplete=()=>{db.close();resolve(rows)};tx.onerror=tx.onabort=()=>{db.close();reject(tx.error)}})}
async function __losPutFile(spec,row){const db=await spec.open();return new Promise((resolve,reject)=>{const tx=db.transaction(spec.store,'readwrite');tx.objectStore(spec.store).put(row);tx.oncomplete=()=>{db.close();resolve()};tx.onerror=tx.onabort=()=>{db.close();reject(tx.error)}})}
async function __losSHA(text){const bytes=new TextEncoder().encode(text),hash=await crypto.subtle.digest('SHA-256',bytes);return Array.from(new Uint8Array(hash),b=>b.toString(16).padStart(2,'0')).join('')}
async function __losFileJSON(row){const out={...row};if(out.blob){out.__blobData=await fileToDataURL(out.blob);delete out.blob}return JSON.stringify(out)}
async function __losUploadFiles(sb,g){
  if(!__losFileDirty){state._cloudFiles=(state._cloudFiles||[]).filter(entry=>{const spec=__losFileStores.find(x=>x.db===entry.db&&x.store===entry.store);return spec&&spec.wanted({id:entry.recordId,projectId:entry.projectId})});return}
  const manifest=new Map((state._cloudFiles||[]).map(x=>[x.id,x]));
  for(const spec of __losFileStores){const rows=await __losReadStore(spec),active=new Set();
    for(const row of rows){if(!spec.wanted(row))continue;__losRequireCurrent(g);const id=spec.db+'|'+spec.store+'|'+row.id;active.add(id);const json=await __losFileJSON(row),hash=await __losSHA(json),old=manifest.get(id);if(old&&old.hash===hash)continue;
      const path=__losAccountId+'/'+spec.db+'/'+spec.store+'/'+encodeURIComponent(String(row.id))+'-'+hash+'.json';
      const {error}=await sb.storage.from(__losBucket).upload(path,json,{contentType:'application/json',upsert:true});if(error)throw new Error('File upload failed: '+(row.name||row.id)+': '+error.message);__losRequireCurrent(g);
      manifest.set(id,{id,recordId:row.id,db:spec.db,store:spec.store,path,hash,projectId:row.projectId,name:row.name||String(row.id)});
    }
    for(const [id,entry] of manifest){if(entry.db===spec.db&&entry.store===spec.store&&!active.has(id)){
      // A missing local cache must not erase a cloud file still referenced by metadata.
      if(!spec.wanted({id:entry.recordId,projectId:entry.projectId}))manifest.delete(id);
    }}
  }
  state._cloudFiles=[...manifest.values()];__losFileDirty=false;
}
async function __losDownloadFiles(sb,snapshot,g){
  for(const entry of snapshot._cloudFiles||[]){__losRequireCurrent(g);const spec=__losFileStores.find(x=>x.db===entry.db&&x.store===entry.store);if(!spec||!String(entry.path).startsWith(__losAccountId+'/'))throw new Error('Invalid account file reference');
    const rows=await __losReadStore(spec),cached=rows.find(x=>String(x.id)===String(entry.recordId));if(cached&&await __losSHA(await __losFileJSON(cached))===entry.hash)continue;
    const {data,error}=await sb.storage.from(__losBucket).download(entry.path);if(error)throw new Error('File download failed: '+entry.name+': '+error.message);__losRequireCurrent(g);
    const json=await new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(String(r.result));r.onerror=()=>reject(r.error);r.readAsText(data)});
    if(await __losSHA(json)!==entry.hash)throw new Error('Downloaded file failed verification: '+entry.name);
    const row=JSON.parse(json);if(String(row.id)!==String(entry.recordId))throw new Error('Invalid downloaded file');if(row.__blobData){row.blob=dataURLToBlob(row.__blobData);delete row.__blobData}
    __losRequireCurrent(g);__losSyncApplying=true;try{await __losPutFile(spec,row)}finally{__losSyncApplying=false}
  }
}
async function __losFetchRow(sb){const {data,error}=await sb.from('los_studio_sync').select('user_id,state,updated_at,device_id,revision').eq('user_id',__losAccountId).maybeSingle();if(error)throw error;return data}
function __losEditing(){let el=document.activeElement;try{while(el?.tagName==='IFRAME'&&el.contentDocument)el=el.contentDocument.activeElement}catch(e){}return !!(el&&['INPUT','TEXTAREA','SELECT'].includes(el.tagName)&&!el.closest('#los-auth-gate'))}
async function __losCloudReconcile(force=false){
  if(!__losAuthUnlocked||__losSyncApplying||__losSyncBusy)return;
  if(__losSyncHydrated&&!force&&__losEditing())return;
  __losSyncBusy=true;const g=__losGeneration;if(__losRetryNeeded||!__losSyncHydrated)setStatus(__losSyncHydrated?'Saving changes…':'Loading your account…');
  try{
    const sb=initClient();
    if(!__losSyncHydrated){
      const account=await user();__losRequireCurrent(g);__losAccountId=account.id;__losAccountEmail=account.email||'';
      const previous=localStorage.getItem('losStudioCloudLocalOwnerV1'),changed=previous&&previous!==account.id;
      const row=await __losFetchRow(sb),saved=await __losMeta('get',account.id),pending=await __losMeta('get',account.id+':local');__losRequireCurrent(g);
      await __losMigrateLegacyFiles(previous,g);
      if(changed){__losSyncApplying=true;try{state=__losFreshState();const keys=[];for(let i=0;i<localStorage.length;i++){const k=localStorage.key(i);if(__losIsSyncableStorageKey(k))keys.push(k)}keys.forEach(k=>localStorage.removeItem(k));localStorage.removeItem('losStudioBlueprintV1');__losNormalise()}finally{__losSyncApplying=false}}
      localStorage.setItem('losStudioCloudLocalOwnerV1',account.id);
      let snapshot=changed&&pending?pending.state:__losSnapshot();
      if(row&&!saved&&!changed)await __losMeta('put',{id:account.id+':before-cloud-upgrade',state:snapshot,revision:0});
      if(row){snapshot=saved&&(!changed||pending)?__losMergeSnapshots(saved.state,snapshot,row.state):row.state;await __losDownloadFiles(sb,snapshot,g);__losRequireCurrent(g);__losApplyCloudSnapshot(snapshot);await __losRememberBase(row.state,Number(row.revision),g)}
      else{__losBase={};__losRevision=0;__losApplyCloudSnapshot(snapshot)}
      __losSyncHydrated=true;__losFileDirty=true;
    }
    const sb2=initClient(),verified=await user();__losRequireCurrent(g);if(verified.id!==__losAccountId){__losCloudReset();throw new Error('Account changed. Sign in again before syncing.')}await __losUploadFiles(sb2,g);__losRequireCurrent(g);
    for(let attempt=0;attempt<4;attempt++){
      const row=await __losFetchRow(sb2);__losRequireCurrent(g);
      const remote=row?.state||{},revision=Number(row?.revision||0),local=__losSnapshot();
      const merged=__losMergeSnapshots(__losBase||{},local,remote);
      if(LOSSyncMerge.equal(merged,remote)&&row){
        if(!LOSSyncMerge.equal(local,remote)){await __losDownloadFiles(sb2,remote,g);__losRequireCurrent(g);const latest=__losSnapshot();if(!LOSSyncMerge.equal(latest,local)){__losRetryNeeded=true;return}if(__losApplyCloudSnapshot(remote)===false)return}
        await __losRememberBase(remote,revision,g);__losRetryNeeded=false;setStatus('All changes saved · account synced',true);return;
      }
      const {data,error}=await sb2.rpc('los_studio_commit',{expected_revision:revision,snapshot:merged,device:deviceId});if(error)throw error;__losRequireCurrent(g);
      if(!data?.accepted)continue;
      const accepted=data.row.state,nextRevision=Number(data.row.revision),latest=__losSnapshot();
      const nextLocal=__losMergeSnapshots(local,latest,accepted);
      await __losDownloadFiles(sb2,nextLocal,g);__losRequireCurrent(g);
      // Do not erase edits made while files were downloading.
      const finalLocal=__losMergeSnapshots(latest,__losSnapshot(),nextLocal);
      if(!LOSSyncMerge.equal(__losSnapshot(),finalLocal)&&__losApplyCloudSnapshot(finalLocal)===false)return;
      await __losRememberBase(accepted,nextRevision,g);__losRetryNeeded=!LOSSyncMerge.equal(finalLocal,accepted);setStatus(__losRetryNeeded?'Saving latest changes…':'All changes saved · account synced',true);return;
    }
    throw new Error('Another device is saving. Your local changes are kept and will retry.');
  }catch(e){__losRetryNeeded=true;setStatus('Not fully synced: '+e.message+'. Local changes are kept for retry.');console.warn('LOS automatic account sync:',e.message)}
  finally{__losSyncBusy=false;if(__losRetryNeeded&&__losAuthUnlocked){clearTimeout(__losPushTimer);__losPushTimer=setTimeout(()=>__losCloudReconcile(),5000)}}
}
window.losCloudSignOut=async function(){try{if(__losAccountId)await __losMeta('put',{id:__losAccountId+':local',state:__losSnapshot()});const {error}=await initClient().auth.signOut();if(error)throw error;setStatus('Signed out. Sign in to open your account.')}catch(e){setStatus('Sign-out failed: '+e.message)}};
window.losCloudPush=async function(silent=false){if(!__losAuthUnlocked){if(!silent)setStatus('Sign in to save your account data.');return}return __losCloudReconcile(true)};
window.losCloudPull=async()=>__losCloudReconcile(true);
window.losCloudSyncNow=async()=>__losCloudReconcile(true);
window.losCloudSetAutoSync=function(){localStorage.setItem(AUTO_KEY,'1');__losMarkLocalChange()};
window.losAccountSyncReady=()=>__losSyncHydrated;
window.addEventListener('online',()=>__losCloudReconcile());
window.addEventListener('focus',()=>__losCloudReconcile());
document.addEventListener('visibilitychange',()=>{if(!document.hidden)__losCloudReconcile()});
document.addEventListener('focusout',()=>setTimeout(()=>__losCloudReconcile(),150));
setInterval(()=>__losCloudReconcile(),5000);
const oldSwitch=window.switchView;if(oldSwitch)window.switchView=function(name){oldSwitch(name);if(name==='CloudSync')loadConfig()};
