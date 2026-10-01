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
      const savedOrders=localStorage.getItem('los_orders_workspace');
      const savedHistory=localStorage.getItem('los_orders_history');
      if(savedOrders)out.legacyOrders=JSON.parse(savedOrders);
      if(savedHistory)out.legacyOrderHistory=JSON.parse(savedHistory);
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

# Make the visible Pull Cloud Data button an explicit refresh. Do not let an old local timestamp block it.
old_guard="""      if(cloudTime<=localTime){setStatus('Cloud copy already pulled on this device.',true);return}
"""
if old_guard in s:
    s=s.replace(old_guard,"",1)
else:
    raise SystemExit("FATAL: pull timestamp guard not found in embedded site source")
p.write_text(s, encoding="utf-8")
print("Cloud sync patch applied to site/index.html")
