"""Apply phone layouts to the deployed app and its embedded Orders workspace."""
from pathlib import Path
import base64
import re

p = Path('site/index.html')
s = p.read_text(encoding='utf-8')
host_css = '''<style id="los-phone-layout">
@media screen and (max-width:760px){
html,body{width:100%;max-width:100%;height:auto!important;min-height:100%;}
body{display:block!important;overflow:auto!important;}
.workspace{width:100%;min-width:0;padding:12px!important;overflow:visible!important;}
.nav-sidebar{display:none!important;}
body.los-menu-open .nav-sidebar{display:flex!important;position:fixed;inset:58px 0 0;width:100%!important;z-index:1000;padding:16px;overflow:auto;}
.nav-sidebar .nav-btn{font-size:16px;padding:12px;min-height:44px;}
.los-phone-bar{display:flex!important;align-items:center;justify-content:space-between;gap:12px;background:#fff;border-bottom:2px solid #bfe1f0;padding:8px 12px;}
.los-phone-bar button{font-size:16px;padding:10px 16px;border:1px solid #bfe1f0;border-radius:8px;background:#e1f0f7;color:#1e405e;min-height:44px;}
.screen,.panel,.card,.field,.two>*,.three>*,.form-grid>*{min-width:0;max-width:100%;}
.topbar{position:static!important;flex-wrap:wrap;align-items:flex-start;}
.topbar>*,.btnrow{min-width:0;max-width:100%;}
.topbar .btnrow{width:100%;}
.btnrow{flex-wrap:wrap!important;}
.btn{white-space:normal!important;overflow-wrap:anywhere;max-width:100%;min-height:44px;}
input,select,textarea{min-width:0!important;max-width:100%;font-size:16px!important;}
.legacy-orders-shell,.legacy-orders-frame{width:100%!important;min-width:0!important;max-width:100%;}
.legacy-order-strip{max-width:100%;overflow-x:auto;}
.two,.three,.form-grid{grid-template-columns:minmax(0,1fr)!important;}
}
.los-phone-bar{display:none;}
</style>'''
nav_script = '''<script id="los-phone-navigation">
(function(){
const sidebar=document.querySelector('.nav-sidebar');if(!sidebar)return;
const bar=document.createElement('div');bar.className='los-phone-bar';
const title=document.createElement('strong');title.textContent='LOS Studio';
const button=document.createElement('button');button.type='button';button.textContent='Menu';button.setAttribute('aria-expanded','false');
sidebar.id=sidebar.id||'los-navigation';button.setAttribute('aria-controls',sidebar.id);
function close(){document.body.classList.remove('los-menu-open');button.setAttribute('aria-expanded','false');button.textContent='Menu'}
button.onclick=()=>{const open=document.body.classList.toggle('los-menu-open');button.setAttribute('aria-expanded',String(open));button.textContent=open?'Close menu':'Menu'};
bar.append(title,button);document.body.prepend(bar);
sidebar.addEventListener('click',e=>{if(e.target.closest('.nav-btn'))close()});
document.addEventListener('keydown',e=>{if(e.key==='Escape')close()});
})();
</script>'''
orders_css = '''<style id="los-orders-phone-layout">
@media screen and (max-width:760px){
html,body{width:100%;max-width:100%;margin:0;}
.app{display:block!important;min-width:0!important;}
main,#ordersView{width:100%!important;max-width:100%!important;min-width:0!important;margin:0!important;padding:8px!important;}
.top,.tabs{position:static!important;flex-wrap:wrap!important;}
.tabs{flex-wrap:nowrap!important;overflow-x:auto!important;max-width:100%;scroll-behavior:auto;}
.tabs button{flex:0 0 auto;max-width:230px!important;}
.top{align-items:flex-start;}
.top h2{font-size:22px!important;}
.card,.material,.toolbox,.grid2>*,.grid3>*,.planner>*{min-width:0!important;max-width:100%;}
.card,.material{padding:12px!important;}
.grid2,.grid3,.planner,.calc,.summary{grid-template-columns:minmax(0,1fr)!important;}
input,textarea,select{width:100%!important;min-width:0!important;max-width:100%!important;font-size:16px!important;box-sizing:border-box!important;}
.btn,.tabs button,.sectionSaveBar .btn{min-width:0!important;max-width:100%!important;white-space:normal!important;overflow-wrap:anywhere;font-size:15px!important;min-height:44px;padding:10px 12px!important;}
.btnrow,.orderActions,.sectionSaveBar,.v8TemplateActions{display:flex!important;flex-wrap:wrap!important;max-width:100%;gap:8px!important;}
.btnrow>.btn,.orderActions>.btn{flex:1 1 140px;}
label{font-size:14px!important;overflow-wrap:anywhere;}
h2,h3,summary{white-space:normal!important;overflow-wrap:anywhere;}
.card h3{font-size:19px!important;}
.fabricArea{max-width:100%;overflow:auto;touch-action:pan-x pan-y;}
}
</style>'''
m = re.search(r"const LEGACY_ORDERS_HTML_B64\s*=\s*['\"]([^'\"]+)", s)
if not m:
    raise SystemExit('Embedded Orders workspace not found')
legacy = base64.b64decode(m.group(1)).decode('utf-8')
legacy = legacy.replace('</head>', orders_css + '</head>', 1)
s = s[:m.start(1)] + base64.b64encode(legacy.encode()).decode() + s[m.end(1):]
s = s.replace('</head>', host_css + '</head>', 1)
body_end = s.rfind('</body>')
if body_end < 0:
    raise SystemExit('App body closing tag not found')
s = s[:body_end] + nav_script + s[body_end:]
p.write_text(s, encoding='utf-8')
