if(window.AndroidSupabase&&typeof window.AndroidSupabase.request==='function'&&!window.__losNativeFetchInstalled){window.__losNativeFetchInstalled=true;const __losBrowserFetch=window.fetch.bind(window);window.fetch=async function(input,init={}){try{const req=input instanceof Request?input:null;const url=typeof input==='string'?input:(req?req.url:String(input));if(!/^https:\/\/[a-z0-9-]+\.supabase\.co(?:\/|$)/i.test(url))return __losBrowserFetch(input,init);const headers={};const src=(init&&init.headers)||(req&&req.headers);if(src&&typeof src.forEach==='function')src.forEach((v,k)=>headers[k]=v);else if(src&&typeof src==='object')Object.keys(src).forEach(k=>headers[k]=src[k]);const method=(init&&init.method)||(req&&req.method)||'GET';let body=init&&Object.prototype.hasOwnProperty.call(init,'body')?init.body:null;if(body===null&&req&&method!=='GET'&&method!=='HEAD')body=await req.text();const raw=window.AndroidSupabase.request(url,JSON.stringify({method,headers,body:body==null?'':String(body)}));const res=typeof raw==='string'?JSON.parse(raw):raw;if(!res||res.error)throw new TypeError(res&&res.error||'Native Supabase request failed');return new Response(res.body||'',{status:Number(res.status)||200,statusText:res.statusText||'',headers:res.headers||{}})}catch(e){throw e}}}document.body.classList.add('los-auth-locked');try{const __losKey=atob('c2JfcHVibGlzaGFibGVfWkdsSjdEWmc1aXBHOFFFbzVNaUt1Z181Q283c2NiRg=='),__losCfg={url:'https://nydbklqskvctwxemzoyf.supabase.co',key:__losKey,projectUrl:'https://nydbklqskvctwxemzoyf.supabase.co',publishableKey:__losKey,supabaseUrl:'https://nydbklqskvctwxemzoyf.supabase.co',supabaseKey:__losKey};window.losStudioCloudConfigV1=__losCfg;window.SUPABASE_URL=__losCfg.url;window.SUPABASE_PUBLISHABLE_KEY=__losKey;localStorage.setItem('losStudioCloudConfigV1',JSON.stringify(__losCfg));sessionStorage.setItem('losStudioCloudConfigV1',JSON.stringify(__losCfg))}catch(e){}const __losAuthCss=document.createElement('style');__losAuthCss.textContent='body.los-auth-locked>*:not(#los-auth-gate){visibility:hidden!important}#los-auth-gate{position:fixed;inset:0;z-index:2147483647;background:#fff;display:flex;align-items:center;justify-content:center;font-family:Arial,sans-serif}#los-auth-card{width:min(92vw,420px);padding:28px;border:1px solid #ddd;border-radius:16px;box-shadow:0 8px 30px rgba(0,0,0,.12);box-sizing:border-box}#los-auth-card h2{margin:0 0 8px}#los-auth-card p{color:#666;margin:0 0 18px}#los-auth-card input{width:100%;box-sizing:border-box;padding:12px;margin:6px 0;border:1px solid #ccc;border-radius:8px;font-size:16px}#los-auth-card button{width:100%;padding:12px;margin-top:10px;border:0;border-radius:8px;font-size:16px}#los-auth-status{min-height:22px;margin-top:12px;font-size:14px}#los-auth-toggle,#los-auth-forgot{background:transparent;color:#555;text-decoration:underline}#los-auth-forgot{margin-top:4px}';document.head.appendChild(__losAuthCss);const __losAuthGate=document.createElement('div');__losAuthGate.id='los-auth-gate';__losAuthGate.innerHTML='<div id="los-auth-card"><h2>LOS Studio</h2><p>Sign in to your LOS Studio account to access your data on any device.</p><input id="los-auth-email" type="email" autocomplete="email" placeholder="Email"><input id="los-auth-password" type="password" autocomplete="current-password" placeholder="Password"><button id="los-auth-submit">Log in</button><button id="los-auth-toggle">Create account</button><button id="los-auth-forgot">Forgot password?</button><input id="los-auth-confirm" type="password" autocomplete="new-password" placeholder="Confirm new password" style="display:none"><div id="los-auth-status"></div></div>';document.body.appendChild(__losAuthGate);/* Require an explicit login on each app launch. */let __losAuthSignup=false,__losAuthRecovery=false,__losAuthConfirmed=(new URLSearchParams(location.hash.replace(/^#/,'')).get('type')==='signup');const __losAuthStatus=document.getElementById('los-auth-status'),__losAuthSubmit=document.getElementById('los-auth-submit'),__losAuthToggle=document.getElementById('los-auth-toggle'),__losAuthForgot=document.getElementById('los-auth-forgot'),__losAuthConfirm=document.getElementById('los-auth-confirm');const __losAuthDesc=__losAuthGate.querySelector('p');function __losAuthMsg(m,ok){__losAuthStatus.textContent=m;__losAuthStatus.style.color=ok?'#167c2a':'#b00020'}function __losAuthRender(){if(__losAuthConfirmed){__losAuthDesc.textContent='Email confirmed successfully. Your LOS Studio account is ready. Return to the app and log in.';__losAuthSubmit.textContent='Return to log in';__losAuthToggle.style.display='none';__losAuthForgot.style.display='none';__losAuthConfirm.style.display='none';document.getElementById('los-auth-password').value='';document.getElementById('los-auth-password').placeholder='Password';__losAuthMsg('Your email address is confirmed.',true);return}if(__losAuthRecovery){__losAuthDesc.textContent='Choose a new password for your LOS Studio account.';__losAuthSubmit.textContent='Set new password';__losAuthToggle.style.display='none';__losAuthForgot.style.display='none';__losAuthConfirm.style.display='block';document.getElementById('los-auth-password').placeholder='New password';document.getElementById('los-auth-password').autocomplete='new-password';return}__losAuthDesc.textContent='Sign in to your LOS Studio account to access your data on any device.';__losAuthSubmit.textContent=__losAuthSignup?'Create account':'Log in';__losAuthToggle.textContent=__losAuthSignup?'Back to log in':'Create account';__losAuthToggle.style.display='block';__losAuthForgot.style.display=__losAuthSignup?'none':'block';__losAuthConfirm.style.display='none';document.getElementById('los-auth-password').placeholder='Password';document.getElementById('los-auth-password').autocomplete='current-password';__losAuthMsg('',true)}__losAuthToggle.onclick=()=>{__losAuthSignup=!__losAuthSignup;__losAuthRender()};__losAuthForgot.onclick=async()=>{const email=document.getElementById('los-auth-email').value.trim();if(!email){__losAuthMsg('Enter your email first.');return}__losAuthForgot.disabled=true;__losAuthMsg('Sending password reset email…',true);try{const sb=initClient();const redirectTo=location.origin+location.pathname;const {error}=await sb.auth.resetPasswordForEmail(email,{redirectTo});if(error)throw error;__losAuthMsg('If an account uses that email, a password reset link has been sent.',true)}catch(e){console.error('LOS password reset:',e);__losAuthMsg(e?.message||'Password reset failed.')}finally{__losAuthForgot.disabled=false}};try{const __losAuthClient=initClient();if(__losAuthConfirmed){__losAuthClient.auth.signOut().catch(()=>{});history.replaceState(null,'',location.pathname+'#email-confirmed')}__losAuthClient.auth.onAuthStateChange((event)=>{if(event==='SIGNED_OUT'){__losAuthUnlocked=false;__losSyncHydrated=false;document.body.classList.add('los-auth-locked');if(!__losAuthGate.isConnected)document.body.appendChild(__losAuthGate);document.getElementById('los-auth-password').value='';__losAuthConfirm.value='';__losAuthRecovery=false;__losAuthSignup=false;__losAuthRender();}if(event==='PASSWORD_RECOVERY'&&!__losAuthConfirmed){__losAuthRecovery=true;__losAuthRender();__losAuthMsg('Enter and confirm your new password.',true)}})}catch(e){console.warn('LOS auth recovery listener:',e)}__losAuthSubmit.onclick=async()=>{if(__losAuthConfirmed){history.replaceState(null,'',location.pathname);location.reload();return}const email=document.getElementById('los-auth-email').value.trim(),password=document.getElementById('los-auth-password').value,confirmPassword=__losAuthConfirm.value;if(__losAuthRecovery){if(password.length<6){__losAuthMsg('Password must be at least 6 characters.');return}if(password!==confirmPassword){__losAuthMsg('The passwords do not match.');return}}else if(!email||!password){__losAuthMsg('Enter your email and password.');return}__losAuthSubmit.disabled=true;__losAuthMsg(__losAuthRecovery?'Updating password…':(__losAuthSignup?'Creating account…':'Signing in…'),true);try{const sb=initClient();if(__losAuthRecovery){const {error}=await sb.auth.updateUser({password});if(error)throw error;document.getElementById('los-auth-password').value='';__losAuthConfirm.value='';__losAuthUnlocked=true;if(typeof __losCloudReconcile==='function')await __losCloudReconcile();if(!__losSyncHydrated)throw new Error('Your account data could not be loaded. Check your connection and try again.');document.body.classList.remove('los-auth-locked');__losAuthGate.remove();return}const r=__losAuthSignup?await sb.auth.signUp({email,password,options:{emailRedirectTo:'https://losstudio.github.io/LOS-app/'}}):await sb.auth.signInWithPassword({email,password});if(r.error)throw r.error;if(__losAuthSignup&&!r.data?.session){__losAuthMsg('Account created. Check your email to confirm your account.',true);return}document.getElementById('los-auth-password').value='';__losAuthConfirm.value='';__losAuthUnlocked=true;if(typeof __losCloudReconcile==='function')await __losCloudReconcile();if(!__losSyncHydrated)throw new Error('Your account data could not be loaded. Check your connection and try again.');document.body.classList.remove('los-auth-locked');__losAuthGate.remove()}catch(e){console.error('LOS authentication:',e);__losAuthMsg(e?.message||'Authentication failed.')}finally{__losAuthSubmit.disabled=false}};__losAuthRender();const oldSwitch=window.switchView; if(oldSwitch){window.switchView=function(name){oldSwitch(name);if(name==='CloudSync')loadConfig()}}
          const __losSyncMetaKeys=new Set(['losStudioCloudLocalOwnerV1','losStudioCloudConfigV1','losStudioCloudDeviceV1','losStudioCloudAutoSyncV1','losStudioCloudLastPullV1','losStudioCloudLastPushV1','losStudioCloudLocalChangeV1']);
          function __losIsAuthStorageKey(k){const x=String(k||'').toLowerCase();return x.startsWith('sb-')||x.includes('auth-token')||x.includes('supabase.auth')}
          function __losIsSyncableStorageKey(k){return !!k&&k!=='losStudioBlueprintV1'&&!__losSyncMetaKeys.has(k)&&!__losIsAuthStorageKey(k)}
          function __losCollectLocalStorage(){const out={};for(let i=0;i<localStorage.length;i++){const k=localStorage.key(i);if(__losIsSyncableStorageKey(k)){const v=localStorage.getItem(k);if(v!==null)out[k]=v}}return out}
          let __losSyncApplying=false,__losPushTimer=null,__losSyncHydrated=false,__losSyncBusy=false;let __losAuthUnlocked=false;
          function __losMarkLocalChange(){if(__losSyncApplying)return;try{localStorage.setItem('losStudioCloudLocalChangeV1',new Date().toISOString())}catch(e){}clearTimeout(__losPushTimer);__losPushTimer=setTimeout(()=>{try{if(typeof window.losCloudPush==='function')window.losCloudPush(true)}catch(e){}},1500)}
          function __losPatchSyncRealm(w){try{if(!w||w.__losSyncRealmPatched)return;const st=w.localStorage,proto=w.Storage&&w.Storage.prototype;if(!st||!proto)return;w.__losSyncRealmPatched=true;const set=proto.setItem,remove=proto.removeItem,clear=proto.clear;proto.setItem=function(k,v){const r=set.call(this,k,v);if(!__losSyncApplying&&this===st&&__losIsSyncableStorageKey(k))__losMarkLocalChange();return r};proto.removeItem=function(k){const r=remove.call(this,k);if(!__losSyncApplying&&this===st&&__losIsSyncableStorageKey(k))__losMarkLocalChange();return r};proto.clear=function(){const r=clear.call(this);if(!__losSyncApplying&&this===st)__losMarkLocalChange();return r}}catch(e){}}
          __losPatchSyncRealm(window);
          function __losHookSyncIframes(){document.querySelectorAll('iframe').forEach(f=>{try{if(!f.__losSyncLoadHooked){f.__losSyncLoadHooked=true;f.addEventListener('load',()=>__losPatchSyncRealm(f.contentWindow))}if(f.contentDocument)__losPatchSyncRealm(f.contentWindow)}catch(e){}})}
          __losHookSyncIframes();
          new MutationObserver(__losHookSyncIframes).observe(document.documentElement,{childList:true,subtree:true});
          const __losOriginalSaveState=window.saveState;
          if(__losOriginalSaveState){window.saveState=function(){const r=__losOriginalSaveState.apply(this,arguments);__losMarkLocalChange();return r}}
          const __losOriginalPersist=window.persistHistoryState;
          if(__losOriginalPersist){window.persistHistoryState=function(){const r=__losOriginalPersist.apply(this,arguments);__losMarkLocalChange();return r}}
          function __losApplyCloudSnapshot(row){
            const imported=row?.state;
            if(!imported||typeof imported!=='object')throw new Error('Cloud record is empty or invalid.');
            __losSyncApplying=true;
            try{
              state={...state,...imported,info:{...state.info,...(imported.info||{})}};
              const cloudLS=(imported.localStorageData&&typeof imported.localStorageData==='object')?imported.localStorageData:{};
              const keep=[];
              for(let i=0;i<localStorage.length;i++){const k=localStorage.key(i);if(__losIsSyncableStorageKey(k))keep.push(k)}
              keep.forEach(k=>{if(!Object.prototype.hasOwnProperty.call(cloudLS,k))try{localStorage.removeItem(k)}catch(e){}});
              Object.keys(cloudLS).forEach(k=>{if(__losIsSyncableStorageKey(k))try{localStorage.setItem(k,String(cloudLS[k]))}catch(e){}});
              if(Array.isArray(imported.legacyOrders))localStorage.setItem('los_orders_workspace',JSON.stringify(imported.legacyOrders));
              if(Array.isArray(imported.legacyOrderHistory))localStorage.setItem('los_orders_history',JSON.stringify(imported.legacyOrderHistory));
              if(Array.isArray(imported._syncOrdersWorkspace))localStorage.setItem('los_orders_workspace',JSON.stringify(imported._syncOrdersWorkspace));
              if(Array.isArray(imported._syncOrdersHistory))localStorage.setItem('los_orders_history',JSON.stringify(imported._syncOrdersHistory));
              normaliseMachines();normalisePlanner();normaliseBusinessInfo(state.info||{},state.hmrcSettings||{});
              origPersist(false);
              localStorage.setItem('losStudioCloudLastPullV1',row.updated_at||new Date().toISOString());
              localStorage.setItem('losStudioCloudLocalChangeV1',row.updated_at||new Date().toISOString());
            }finally{__losSyncApplying=false}
          }
          async function __losPullNewest(row,interactive){
            if(!row)return false;
            const cloudTime=new Date(row.updated_at||0).getTime(),lastPull=new Date(localStorage.getItem('losStudioCloudLastPullV1')||0).getTime();
            if(!cloudTime||cloudTime<=lastPull)return false;
            if(interactive&&!confirm('Pull the cloud copy onto this device? It will replace the current local LOS Studio data.'))return false;
            __losApplyCloudSnapshot(row);
            __losRefreshCloudViews();
            return true;
          }
          const __losOriginalPull=window.losCloudPull;
          window.losCloudPull=async function(){
            try{const row=await cloudRow();if(!row){setStatus('No cloud copy exists yet. Upload this device first.',true);return}
              await __losPullNewest(row,true);
            }catch(e){console.error(e);setStatus('Download failed: '+e.message);alert('Cloud download failed: '+e.message)}
          };
          const __losOriginalSyncNow=window.losCloudSyncNow;
          window.losCloudSyncNow=async function(){
            try{const row=await cloudRow();if(!row){await window.losCloudPush(false);return}
              const cloudTime=new Date(row.updated_at||0).getTime(),localChange=new Date(localStorage.getItem('losStudioCloudLocalChangeV1')||0).getTime(),lastPull=new Date(localStorage.getItem('losStudioCloudLastPullV1')||0).getTime();
              if(cloudTime>lastPull+250&&localChange<=lastPull+250){await __losPullNewest(row,false);return}
              await window.losCloudPush(false);
            }catch(e){console.error(e);setStatus('Sync failed: '+e.message);alert('Sync failed: '+e.message)}
          };
          async function __losCloudReconcile(){
            if(!__losAuthUnlocked)return;
            if(__losSyncApplying||__losSyncBusy||typeof window.losCloudPush!=='function')return;
            __losSyncBusy=true;
            try{const c=cfg();if(!c.url||!c.key)return;const row=await cloudRow();
              if(!__losSyncHydrated){
                const account=await user(),oldOwner=localStorage.getItem('losStudioCloudLocalOwnerV1');
                const changedOwner=!!oldOwner&&oldOwner!==account.id;
                const localChange=new Date(localStorage.getItem('losStudioCloudLocalChangeV1')||0).getTime();
                const lastSaved=Math.max(new Date(localStorage.getItem('losStudioCloudLastPullV1')||0).getTime(),new Date(localStorage.getItem('losStudioCloudLastPushV1')||0).getTime());
                if(!changedOwner&&row&&localChange>lastSaved+250){
                  if(!confirm('This device has changes that have not been uploaded. OK downloads the cloud copy and replaces those changes. Cancel keeps this device and uploads its copy to the cloud.')){
                    localStorage.setItem('losStudioCloudLocalOwnerV1',account.id);__losSyncHydrated=true;await window.losCloudPush(false);return;
                  }
                }
                if(changedOwner){
                  __losSyncApplying=true;
                  try{
                    const emptyArrays=Object.fromEntries(Object.entries(state).filter(([,v])=>Array.isArray(v)).map(([k])=>[k,[]]));
                    state={...emptyArrays,...JSON.parse(JSON.stringify(__losEmptyAccountState))};
                    normaliseStudioModules();normaliseMachines();normalisePlanner();normaliseProjectStockLinks();normaliseAccountLinks();
                    const keys=[];for(let i=0;i<localStorage.length;i++){const k=localStorage.key(i);if(__losIsSyncableStorageKey(k))keys.push(k)}
                    keys.forEach(k=>localStorage.removeItem(k));
                    localStorage.removeItem('losStudioBlueprintV1');
                    for(const k of ['losStudioCloudLastPullV1','losStudioCloudLastPushV1','losStudioCloudLocalChangeV1'])localStorage.removeItem(k);
                    currentOrderId=null;currentProjectId=null;currentPackageId=null;
                  }finally{__losSyncApplying=false}
                }
                localStorage.setItem('losStudioCloudLocalOwnerV1',account.id);
                if(row){__losApplyCloudSnapshot(row);__losSyncHydrated=true;__losRefreshCloudViews();return}
                __losSyncHydrated=true;__losRefreshCloudViews();await window.losCloudPush(true);return
              }
              if(!row)return;
              const cloudTime=new Date(row.updated_at||0).getTime(),localChange=new Date(localStorage.getItem('losStudioCloudLocalChangeV1')||0).getTime(),lastPull=new Date(localStorage.getItem('losStudioCloudLastPullV1')||0).getTime();
              if(localChange>lastPull+250&&localChange>cloudTime+250){await window.losCloudPush(true);return}
              if(cloudTime>lastPull+250&&localChange<=lastPull+250){await __losPullNewest(row,false)}
            }catch(e){console.warn('LOS automatic cloud sync:',e.message)}finally{__losSyncBusy=false}
          }

          function __losRefreshCloudViews(){
            renderAll();
            if(typeof window.v75RenderAll==='function')window.v75RenderAll();
            const frame=document.getElementById('legacyOrdersFrame');
            if(frame&&frame.contentWindow&&typeof syncLegacyOrdersFrame==='function')syncLegacyOrdersFrame();
          }
          const __losBasePush=window.losCloudPush;
          window.losCloudPush=async function(silent=false){
            if(!__losAuthUnlocked||!__losSyncHydrated||document.body.classList.contains('los-auth-locked')){
              if(!silent)setStatus('Sign in before uploading cloud data.');
              return;
            }
            return __losBasePush(silent);
          };
          setInterval(__losCloudReconcile,5000);
          setTimeout(__losCloudReconcile,1500);
