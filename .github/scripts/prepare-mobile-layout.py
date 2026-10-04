"""Apply phone layouts to the deployed app and its embedded Orders workspace."""
from pathlib import Path
import base64
import re

p = Path('site/index.html')
s = p.read_text(encoding='utf-8')
s = s.replace('<button class="nav-btn" data-view="StudioHub">👥 Customers · Suppliers</button>',
              '<button class="nav-btn" data-view="StudioHub">👥 Studio Management</button>')
# Camera selection feeds the existing photo preview/save pipeline.
s = s.replace('<input id="invPhoto" type="file" accept="image/*" onchange="previewInventoryPhoto()">',
    '''<input id="invPhoto" type="file" accept="image/*" onchange="previewInventoryPhoto()">
          <input id="invCamera" type="file" accept="image/*" capture="environment" hidden onchange="selectInventoryCameraPhoto(this)">
          <button type="button" class="btn secondary" style="margin-top:8px" onclick="document.getElementById('invCamera').value='';document.getElementById('invCamera').click()">📷 Open camera</button>''')
s = s.replace('function previewInventoryPhoto(){', '''function selectInventoryCameraPhoto(input){
  const file=input.files&&input.files[0];
  if(!file)return;
  if(!file.type.startsWith('image/')){alert('Please take an image.');return;}
  try{
    const transfer=new DataTransfer();transfer.items.add(file);
    invPhoto.files=transfer.files;previewInventoryPhoto();
  }catch(error){alert('This device could not attach the camera photo. Please use Add image.');}
}
function previewInventoryPhoto(){''')
theme = '<style id="los-brand-theme">' + Path('.github/scripts/brand-theme.css').read_text() + '</style>'
print_script = '<script>' + Path('.github/scripts/print-window.js').read_text(encoding='utf-8') + '</script>'
print_script += '<script>' + Path('.github/scripts/download-file.js').read_text(encoding='utf-8') + '</script>'
# Install the guard after the document exists, in both host and Orders realms.
guard = '<script>' + Path('.github/scripts/deletion-guard.js').read_text(encoding='utf-8') + '</script>'
# Keep menu branding independent of the business logo used on documents.
sidebar_start = s.index("  const sidebar = document.getElementById('sidebar-logo-container');", s.index('function refreshStudioLogoDisplays(){'))
sidebar_end = s.index("  const welcome=document.getElementById('viewWelcome');", sidebar_start)
s = s[:sidebar_start] + """  const sidebar = document.getElementById('sidebar-logo-container');
  if(sidebar){
    sidebar.setAttribute('aria-label','LOS Studio app icon');
    let img=sidebar.querySelector('img');
    if(!img){img=document.createElement('img');sidebar.replaceChildren(img);}
    img.src='icon-512.png?v=transparent-2';
    img.alt='LOS Studio';
    img.loading='eager';
  }
""" + s[sidebar_end:]
host_css = '''<style id="los-phone-layout">
#sidebar-logo-container{min-height:0;padding:16px 0 10px;flex-shrink:0;}
#sidebar-logo-container img{width:144px;height:144px;max-width:100%;object-fit:contain;mix-blend-mode:normal;}
@media screen and (max-width:760px){#sidebar-logo-container{padding:12px 0 8px;}#sidebar-logo-container img{width:180px;height:180px;}}
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
legacy = legacy.replace('<body', '<body class="los-orders-theme"', 1)
legacy_end = legacy.rfind('</body>')
if legacy_end < 0: raise SystemExit('Orders body closing tag not found')
legacy = legacy[:legacy_end] + guard + legacy[legacy_end:]
legacy = legacy.replace('</head>', orders_css + theme + print_script + '</head>', 1)
s = s[:m.start(1)] + base64.b64encode(legacy.encode()).decode() + s[m.end(1):]
s = s.replace('</head>', host_css + theme + print_script + '</head>', 1)
body_end = s.rfind('</body>')
if body_end < 0:
    raise SystemExit('App body closing tag not found')
s = s[:body_end] + nav_script + guard + s[body_end:]
p.write_text(s, encoding='utf-8')
