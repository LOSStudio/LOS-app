const fs=require('fs'),assert=require('assert'),{JSDOM}=require('jsdom');
(async()=>{
const d=new JSDOM('<body><div id="viewCloudSync"></div><p id="losAccountEmail"></p></body>',{url:'https://losstudio.github.io',runScripts:'outside-only'}),w=d.window;
w.HTMLDialogElement.prototype.showModal=function(){this.open=true};w.HTMLDialogElement.prototype.close=function(){this.open=false};
let updates=[],calls=0,allowed=false;
w.sb={auth:{getUser:async()=>({data:{user:{id:'me',email:'old@example.com'}}}),getSession:async()=>({data:{session:{access_token:'test'}}}),updateUser:async args=>{updates.push(args);return{}},signOut:async()=>({})}};
w.fetch=async()=>{calls++;return{ok:allowed,json:async()=>allowed?{deleted:true}:{error:'The current password is incorrect.'}}};
w.eval(`var __losAccountId='me',__losAccountEmail='old@example.com',__losAuthUnlocked=true,__losSyncHydrated=true,__losGeneration=0,__losPushTimer=0,__losSyncApplying=false,__losFileStores=[];var state={test:true};var __losAuthGate=document.createElement('div');function initClient(){return sb}function cfg(){return{key:'public'}}function __losMetaDB(){return Promise.reject(Error('cache unavailable'))}function __losFreshState(){return{}}function __losIsSyncableStorageKey(k){return k==='testData'}function __losCloudReset(){__losAccountId=''}function __losAuthRender(){}function __losAuthMsg(t){__losAuthGate.textContent=t}`+fs.readFileSync('.github/scripts/account-settings.js','utf8'));
const tick=()=>new Promise(r=>setTimeout(r,10)),el=id=>w.document.getElementById(id),submit=id=>el(id).dispatchEvent(new w.Event('submit',{cancelable:true}));
el('los-delete-open').click();assert(el('los-delete-dialog').open);el('los-delete-cancel').click();assert(!el('los-delete-dialog').open);assert.equal(calls,0);
el('los-new-email').value='new@example.com';submit('los-email-form');await tick();assert.deepEqual(updates,[{email:'new@example.com'}]);assert.equal(w.__losAccountId,'me');assert.deepEqual(w.state,{test:true});
el('los-delete-open').click();el('los-delete-password').value='wrong';submit('los-delete-form');await tick();assert(w.__losAuthUnlocked);assert(el('los-delete-status').textContent.includes('incorrect'));
allowed=true;w.localStorage.setItem('testData','private');el('los-delete-password').value='correct';submit('los-delete-form');await tick();assert(!w.__losAuthUnlocked);assert(w.document.body.classList.contains('los-auth-locked'));assert.equal(w.localStorage.getItem('testData'),null);assert(w.__losAuthGate.textContent.includes('deleted'));assert(!el('los-delete-dialog').open);
console.log('PASS: email keeps account/data; Cancel sends nothing; wrong password preserves login; deletion locks app and clears state even on cache failure');w.close();
})().catch(e=>{console.error(e);process.exitCode=1});
