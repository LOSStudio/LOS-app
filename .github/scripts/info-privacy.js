// Display privacy for LOS Info. Saved values and print data are never rewritten.
(function(){
const view=document.getElementById('viewInfo');if(!view)return;
let attempt=0,busy=false,timer=null;
const panel=document.createElement('div');panel.id='los-info-privacy';panel.className='panel pink';
panel.innerHTML='<h2>Private studio information</h2><p id="los-info-privacy-description">Your LOS Info details are hidden for recordings. Stop recording before revealing them. Printed documents still use your saved details.</p><form id="los-info-unlock-form"><label for="los-info-password">Your account password</label><input id="los-info-password" type="password" autocomplete="current-password" required style="padding:12px;border:1px solid #bedfec;border-radius:12px;max-width:100%;box-sizing:border-box;font-size:16px"><button type="submit" class="btn secondary" id="los-info-unlock">Reveal LOS Info</button></form><button type="button" class="btn pink" id="los-info-lock" hidden>Hide LOS Info now</button><p id="los-info-privacy-status" role="status"></p>';
view.prepend(panel);const el=id=>document.getElementById(id);
function lock(){attempt++;clearTimeout(timer);view.classList.remove('los-info-unlocked');el('los-info-password').value='';el('los-info-unlock-form').hidden=false;el('los-info-lock').hidden=true;el('los-info-privacy-status').textContent='';el('los-info-privacy-description').textContent='Your LOS Info details are hidden for recordings. Stop recording before revealing them. Printed documents still use your saved details.';}
window.losLockInfo=lock;
el('los-info-lock').onclick=lock;
const previousSwitch=window.switchView;window.switchView=function(name){if(name!=='Info')lock();return previousSwitch.apply(this,arguments)};
const previousReset=__losCloudReset;__losCloudReset=function(){lock();return previousReset.apply(this,arguments)};
window.addEventListener('blur',lock);window.addEventListener('pagehide',lock);document.addEventListener('visibilitychange',()=>{if(document.hidden)lock()});
el('los-info-unlock-form').onsubmit=async event=>{
 event.preventDefault();if(busy)return;const password=el('los-info-password').value;el('los-info-password').value='';if(!password)return;
 const token=++attempt,g=__losGeneration,account=__losAccountId;busy=true;el('los-info-unlock').disabled=true;el('los-info-privacy-status').textContent='Checking your password…';let temporary=null,signedIn=false;
 try{
  if(!account||!__losAuthUnlocked||!view.classList.contains('active'))throw Error('Sign in to your account first.');
  const verified=await initClient().auth.getUser();if(verified.error||verified.data?.user?.id!==account)throw Error('Please sign in again.');
  if(g!==__losGeneration||token!==attempt||account!==__losAccountId)return;
  const config=cfg();temporary=window.supabase.createClient(config.url,config.key,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false,storageKey:'los-info-password-check'}});
  const result=await temporary.auth.signInWithPassword({email:verified.data.user.email,password});signedIn=!!result.data?.session;
  if(g!==__losGeneration||token!==attempt||account!==__losAccountId||!__losAuthUnlocked||!view.classList.contains('active')||document.hidden)return;
  if(result.error||result.data?.user?.id!==account)throw Error('Password could not be verified. Check it and your internet connection.');
  view.classList.add('los-info-unlocked');el('los-info-unlock-form').hidden=true;el('los-info-lock').hidden=false;el('los-info-privacy-status').textContent='Details visible. They hide when you leave, minimise the app, or after five minutes.';el('los-info-privacy-description').textContent='LOS Info is visible. Hide it before recording.';timer=setTimeout(lock,5*60*1000);
 }catch(error){if(g===__losGeneration&&token===attempt)el('los-info-privacy-status').textContent=error.message||'Could not verify your password. Details remain hidden.';}
 finally{if(signedIn)await temporary.auth.signOut({scope:'local'}).catch(()=>{});busy=false;el('los-info-unlock').disabled=false;}
};lock();
})();
