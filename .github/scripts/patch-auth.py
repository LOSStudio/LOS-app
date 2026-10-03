"""Harden the generated static app without changing the V75 source archive."""
from pathlib import Path
p = Path('site/index.html')
s = p.read_text()
def replace(old, new):
    global s
    if old not in s:
        raise SystemExit('Auth patch target missing: ' + old[:100])
    s = s.replace(old, new, 1)
# Lock before body content paints, including the printable view.
replace('<head>', '<head><style id="los-auth-first-paint">html:not(.los-auth-ready) body>*:not(#los-auth-gate){visibility:hidden!important}</style>')
replace("async function user(){const sb=initClient();", "async function user(){if(!__losAuthUnlocked)throw new Error('Sign in to access cloud data.');const sb=initClient();")
replace("window.switchView=function(name){oldSwitch(name);if(name==='CloudSync')loadConfig()}", "window.switchView=function(name){if(!__losAuthUnlocked)return;oldSwitch(name);if(name==='CloudSync')loadConfig()}")
# Gate unlock follows server validation, not a locally cached session.
replace("__losAuthUnlocked=true;document.body.classList.remove('los-auth-locked');", "await __losUnlock();",)
replace("__losAuthUnlocked=true;document.body.classList.remove('los-auth-locked');", "await __losUnlock();",)
replace("__losAuthClient.auth.onAuthStateChange((event)=>{", "__losAuthClient.auth.onAuthStateChange((event,session)=>{if(event==='SIGNED_OUT'||(event==='TOKEN_REFRESHED'&&!session)){__losLock();setTimeout(()=>location.reload(),0);return;}")
replace("let __losAuthUnlocked=false;", """let __losAuthUnlocked=false;
          function __losLock(){__losAuthUnlocked=false;document.documentElement.classList.remove('los-auth-ready');document.body.classList.add('los-auth-locked');clearTimeout(__losPushTimer);clearTimeout(syncTimer);}
          async function __losUnlock(){const {data,error}=await initClient().auth.getUser();if(error||!data.user)throw error||new Error('Please sign in again.');document.getElementById('los-auth-password').value='';__losAuthConfirm.value='';__losAuthUnlocked=true;document.documentElement.classList.add('los-auth-ready');document.body.classList.remove('los-auth-locked');}
          window.losCloudSignOut=async function(){__losLock();try{const {error}=await initClient().auth.signOut();if(error)throw error;}catch(e){alert('Sign-out failed. Please reconnect and try again.');}finally{location.reload();}};
          """)
# Every publicly served HTML entry uses the same auth gate.
p.write_text(s)
Path('site/LOS_Studio_Acode_v75.html').write_text(s)
