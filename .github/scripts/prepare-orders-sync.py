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

m = re.search(r"const LEGACY_ORDERS_HTML_B64\s*=\s*['\"]([^'\"]+)", s)
if not m:
    raise SystemExit("FATAL: embedded legacy Orders base64 not found")
legacy = base64.b64decode(m.group(1)).decode("utf-8")

old_ls = """      parent.postMessage({type:'LOS_V1533_ORDER_SUMMARIES',summaries:buildSummaries()},'*');"""
new_ls = """      parent.postMessage({
        type:'LOS_V1533_ORDER_SUMMARIES',
        summaries:buildSummaries(),
        orders:JSON.parse(JSON.stringify(orders)),
        orderHistory:(function(){try{return JSON.parse(localStorage.getItem('los_orders_history')||'[]')}catch(e){return []}})()
      },'*');"""
if old_ls not in legacy:
    raise SystemExit("FATAL: embedded sendSummary block not found")
legacy = legacy.replace(old_ls, new_ls, 1)

old_lp = """      applyParentInfo(d.info||{});
      try{
        if(typeof renderMaterials==='function')renderMaterials();"""
new_lp = """      if(Array.isArray(d.orders)){
        orders=JSON.parse(JSON.stringify(d.orders));
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


# Preserve a clean initial state for switching signed-in accounts on one device.
s = s.replace("let currentOrderId = null", "const __losEmptyAccountState=JSON.parse(JSON.stringify(state));\nlet currentOrderId = null", 1)
# Record successful pushes so later logins can distinguish unsaved local changes.
s = s.replace("if(error)throw error;setStatus('Uploaded this device", "if(error)throw error;localStorage.setItem('losStudioCloudLastPushV1',payload.updated_at);setStatus('Uploaded this device", 1)
# Serve the pinned SDK with the app, independent of a floating CDN response.
s = s.replace('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2', './supabase.js', 1)
# Branding helper lives in a later script; the first render must not abort startup.
s = s.replace("  refreshStudioLogoDisplays();", "  if(typeof refreshStudioLogoDisplays==='function')refreshStudioLogoDisplays();", 1)

# Account setup is handled by the gate; normal use never needs project keys or manual pulls.
start=s.index('<section id="viewCloudSync"')
end=s.index('</section>',start)+len('</section>')
s=s[:start]+"""<section id="viewCloudSync" class="screen">
<h2 class="screen-title">Your Account &amp; Sync</h2>
<p class="screen-subtitle">Your LOS Studio workspace, available on every device.</p>
<div class="panel blue"><h3>Automatic account saving</h3><p id="losAccountEmail"></p>
<p>Sign in with the same account on each device. Saved records, photos and PDFs upload automatically, and open devices check for updates every few seconds.</p>
<p id="cloudSyncStatus" role="status">Sign in to load your account.</p><span id="cloudSyncBadge" class="badge">Waiting to sync</span>
<div class="btnrow" style="margin-top:12px"><button class="btn secondary" onclick="losCloudSyncNow()">Retry / Check Sync</button><button class="btn secondary" onclick="losCloudSignOut()">Sign Out</button></div></div>
<div class="panel pink"><h3>If your connection drops</h3><p>Changes stay on this device and retry automatically when you are back online. Wait for “All changes saved” before closing the app or switching accounts.</p><p>Updates wait while you are typing in an editor. When you save and leave the field, automatic syncing continues.</p></div>
<div hidden><input id="syncSupabaseUrl"><input id="syncSupabaseKey"><input id="syncEmail"><input id="syncPassword" type="password"><input id="cloudAutoSync" type="checkbox" checked></div>
</section>"""+s[end:]

p.write_text(s, encoding="utf-8")
