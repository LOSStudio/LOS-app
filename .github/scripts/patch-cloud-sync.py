from pathlib import Path
import re, base64

p = Path("site/index.html")
s = p.read_text(encoding="utf-8", errors="ignore")

s = s.replace(
    "inventory:[], orders:[], orderSummaries:[], projects:[]",
    "inventory:[], orders:[], orderSummaries:[], legacyOrders:[], legacyOrderHistory:[], projects:[]",
    1
)

old_sync = """  frame.contentWindow.postMessage({
    type:'LOS_PARENT_TO_V1533',
    inventory:await buildV1533InventoryBridge(),
    packaging:buildV1533PackagingBridge(),
    packagingUsage:state.packagingUsage||[],
    info:v1533InfoBridge()
  },'*');"""
new_sync = """  frame.contentWindow.postMessage({
    type:'LOS_PARENT_TO_V1533',
    inventory:await buildV1533InventoryBridge(),
    packaging:buildV1533PackagingBridge(),
    packagingUsage:state.packagingUsage||[],
    info:v1533InfoBridge(),
    orders:Array.isArray(state.legacyOrders)?state.legacyOrders:[],
    orderHistory:Array.isArray(state.legacyOrderHistory)?state.legacyOrderHistory:[]
  },'*');"""
if old_sync not in s:
    raise SystemExit("FATAL: parent legacy order sync block not found")
s = s.replace(old_sync, new_sync, 1)

old_msg = """  if(d.type==='LOS_V1533_ORDER_SUMMARIES'){
    const upgradingOrderIds=(state.orderSummaries||[]).some(o=>!o._historyId);
    state.orderSummaries=Array.isArray(d.summaries)?d.summaries:[];
    if(upgradingOrderIds&&historyAuditBaseline)historyAuditBaseline.orderSummaries=state.orderSummaries.map(historyClean);
    try{persistHistoryState()}catch(e){console.error(e)}
    renderLegacyOrderStrip();
    renderDashboard();
  }"""
new_msg = """  if(d.type==='LOS_V1533_ORDER_SUMMARIES'){
    const upgradingOrderIds=(state.orderSummaries||[]).some(o=>!o._historyId);
    state.orderSummaries=Array.isArray(d.summaries)?d.summaries:[];
    if(Array.isArray(d.orders))state.legacyOrders=d.orders;
    if(Array.isArray(d.orderHistory))state.legacyOrderHistory=d.orderHistory;
    if(upgradingOrderIds&&historyAuditBaseline)historyAuditBaseline.orderSummaries=state.orderSummaries.map(historyClean);
    try{persistHistoryState()}catch(e){console.error(e)}
    renderLegacyOrderStrip();
    renderDashboard();
  }"""
if old_msg not in s:
    raise SystemExit("FATAL: parent order summary handler not found")
s = s.replace(old_msg, new_msg, 1)

old_serial = "  function serialisableState(){return JSON.parse(JSON.stringify(state))}"
new_serial = """  function serialisableState(){
    const out=JSON.parse(JSON.stringify(state));
    try{
      const savedOrders=localStorage.getItem('los_orders_workspace')||localStorage.getItem('los_orders');
      const savedHistory=localStorage.getItem('los_orders_history')||localStorage.getItem('los_history');
      if(savedOrders)out.legacyOrders=JSON.parse(savedOrders);
      if(savedHistory)out.legacyOrderHistory=JSON.parse(savedHistory);
      const cloudKeys=['losStudioBlueprintV1','los_business_profile','los_inventory','los_packaging','los_history','los_orders','los_orders_workspace','los_orders_history','los_db_customers','los_db_purchases','los_db_adjustments','los_hmrc_expenses_ledger'];
      out.localStorageData={};
      for(const key of cloudKeys){try{const value=localStorage.getItem(key);if(value!==null)out.localStorageData[key]=value}catch(e){}}
    }catch(e){console.warn('Legacy Orders cloud snapshot:',e)}
    return out;
  }"""
if old_serial not in s:
    raise SystemExit("FATAL: serialisableState function not found")
s = s.replace(old_serial, new_serial, 1)

old_pull = """      state={...state,...imported,info:{...state.info,...(imported.info||{})}};
      for(const k of ['inventory','orders','orderSummaries','projects'"""
new_pull = """      state={...state,...imported,info:{...state.info,...(imported.info||{})}};
      if(Array.isArray(imported.legacyOrders)){
        state.legacyOrders=imported.legacyOrders;
        try{localStorage.setItem('los_orders_workspace',JSON.stringify(imported.legacyOrders))}catch(e){}
      }
      if(Array.isArray(imported.legacyOrderHistory)){
        state.legacyOrderHistory=imported.legacyOrderHistory;
        try{localStorage.setItem('los_orders_history',JSON.stringify(imported.legacyOrderHistory))}catch(e){}
      }
      if(imported.localStorageData&&typeof imported.localStorageData==='object'){
        for(const [key,value] of Object.entries(imported.localStorageData)){
          try{localStorage.setItem(key,String(value))}catch(e){}
        }
        try{
          const raw=localStorage.getItem('losStudioBlueprintV1');
          if(raw){const parsed=JSON.parse(raw);state={...state,...parsed,info:{...state.info,...(parsed.info||{})}}}
        }catch(e){}
      }
      for(const k of ['inventory','orders','orderSummaries','legacyOrders','legacyOrderHistory','projects'"""
if old_pull not in s:
    raise SystemExit("FATAL: cloud pull state block not found")
s = s.replace(old_pull, new_pull, 1)

m = re.search(r"const LEGACY_ORDERS_HTML_B64\s*=\s*['\"]([^'\"]+)", s)
if not m:
    raise SystemExit("FATAL: embedded legacy Orders base64 not found")
legacy = base64.b64decode(m.group(1)).decode("utf-8")

old_ls = """      parent.postMessage({type:'LOS_V1533_ORDER_SUMMARIES',summaries:buildSummaries()},'*');"""
new_ls = """      parent.postMessage({
        type:'LOS_V1533_ORDER_SUMMARIES',
        summaries:buildSummaries(),
        orders:clone(orders),
        orderHistory:(function(){try{return clone(JSON.parse(localStorage.getItem('los_orders_history')||'[]'))}catch(e){return []}})()
      },'*');"""
if old_ls not in legacy:
    raise SystemExit("FATAL: embedded sendSummary block not found")
legacy = legacy.replace(old_ls, new_ls, 1)

old_lp = """      applyParentInfo(d.info||{});
      try{
        if(typeof renderMaterials==='function')renderMaterials();"""
new_lp = """      if(Array.isArray(d.orders)){
        orders=clone(d.orders);
        openIndex=Math.min(Math.max(openIndex,0),Math.max(0,orders.length-1));
        try{localStorage.setItem('los_orders_workspace',JSON.stringify(orders))}catch(e){}
        try{if(typeof loadForm==='function')loadForm();if(typeof renderOrders==='function')renderOrders()}catch(e){}
      }
      if(Array.isArray(d.orderHistory)){
        try{localStorage.setItem('los_orders_history',JSON.stringify(d.orderHistory))}catch(e){}
      }
      applyParentInfo(d.info||{});
      try{
        if(typeof renderMaterials==='function')renderMaterials();"""
if old_lp not in legacy:
    raise SystemExit("FATAL: embedded parent message block not found")
legacy = legacy.replace(old_lp, new_lp, 1)

encoded = base64.b64encode(legacy.encode("utf-8")).decode("ascii")
s = s[:m.start(1)] + encoded + s[m.end(1):]

# Make the visible Pull Cloud Data button an explicit refresh.
old_guard="""      if(cloudTime&&localTime&&cloudTime<=localTime){setStatus('Cloud copy already pulled on this device.',true);return}
"""
if old_guard in s:
    s=s.replace(old_guard,"",1)
else:
    raise SystemExit("FATAL: pull timestamp guard not found")
button_patches = [
    ('<button class="btn" onclick="losCloudSaveConfig()">Save Cloud Settings', '<button id="losCloudSaveConfigBtn" type="button" class="btn">Save Cloud Settings'),
    ('<button class="btn secondary" onclick="losCloudSignUp()">Create Cloud Account', '<button id="losCloudSignUpBtn" type="button" class="btn secondary">Create Cloud Account'),
    ('<button class="btn secondary" onclick="losCloudSignIn()">Sign In', '<button id="losCloudSignInBtn" type="button" class="btn secondary">Sign In'),
    ('<button class="btn secondary" onclick="losCloudSignOut()">Sign Out', '<button id="losCloudSignOutBtn" type="button" class="btn secondary">Sign Out'),
]
for old, new in button_patches:
    if old not in s:
        raise SystemExit("FATAL: cloud control button not found: "+old)
    s = s.replace(old, new, 1)

s += """
<script>
(function(){
  const buttons={
    losCloudSaveConfigBtn:'losCloudSaveConfig',
    losCloudSignUpBtn:'losCloudSignUp',
    losCloudSignInBtn:'losCloudSignIn',
    losCloudSignOutBtn:'losCloudSignOut'
  };
  function bind(){
    for(const [id,name] of Object.entries(buttons)){
      const b=document.getElementById(id);
      if(!b||b.dataset.losCloudBound==='1')continue;
      b.dataset.losCloudBound='1';
      b.addEventListener('click',()=>{
        const fn=window[name];
        if(typeof fn!=='function'){
          alert('LOS Studio cloud controls are still loading. Please wait a moment and try again.');
          return;
        }
        try{
          const result=fn();
          if(result&&typeof result.catch==='function')result.catch(e=>console.error(e));
        }catch(e){
          console.error(e);
          alert(e.message||String(e));
        }
      });
    }
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bind,{once:true});
  else bind();
})();
</script>
"""
s += """
<script>
(function(){
  if(!window.AndroidSupabase || typeof window.AndroidSupabase.request!=='function') return;
  const browserFetch=window.fetch.bind(window);
  const isSupabaseUrl=url=>/^https:\/\/[a-z0-9-]+\.supabase\.co\//i.test(url);
  const nativeFetch=async function(input,init){
    const source=input instanceof Request?input:null;
    const url=typeof input==='string'?input:String(input&&input.url||'');
    if(!isSupabaseUrl(url))return browserFetch(input,init);
    const opts=init||{};
    const headers=new Headers(opts.headers||(source?source.headers:undefined));
    let body=opts.body;
    if(body===undefined&&source)body=await source.clone().text();
    const payload={
      method:String(opts.method||(source?source.method:'GET')).toUpperCase(),
      headers:Object.fromEntries(headers.entries()),
      body:body==null?'':(typeof body==='string'?body:String(body))
    };
    let raw;
    try{raw=window.AndroidSupabase.request(url,JSON.stringify(payload));}
    catch(e){throw new TypeError('Native Supabase request failed: '+e.message);}
    let result;
    try{result=JSON.parse(raw);}
    catch(e){throw new TypeError('Native Supabase bridge returned invalid data');}
    if(result.error)throw new TypeError(result.error);
    return new Response(result.body||'',{
      status:Number(result.status)||200,
      statusText:result.statusText||'',
      headers:result.headers||{}
    });
  };
  function wrap(){
    if(!window.supabase || typeof window.supabase.createClient!=='function') return false;
    if(window.supabase.createClient.__losNativeWrapped) return true;
    const original=window.supabase.createClient;
    function createClient(url,key,options){
      const opts=options||{};
      const globalOpts=opts.global||{};
      return original(url,key,{...opts,global:{...globalOpts,fetch:nativeFetch}});
    }
    createClient.__losNativeWrapped=true;
    window.supabase.createClient=createClient;
    return true;
  }
  if(!wrap()){
    let tries=0;
    const timer=setInterval(()=>{if(wrap()||++tries>100)clearInterval(timer)},100);
  }
})();
</script>
"""
p.write_text(s, encoding="utf-8")
print("Cloud sync patch applied to site/index.html")
