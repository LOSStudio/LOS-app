"""Exercise the deployment's exact source patches without deploying."""
from pathlib import Path
import os, re, shutil, zipfile
root = Path(__file__).resolve().parents[1]
build = root / 'tests/.generated'
(build / 'site').mkdir(parents=True, exist_ok=True)
with zipfile.ZipFile(root / 'LOS_Studio_V75_icon_fixed.zip') as archive:
    name = next(n for n in archive.namelist() if n.endswith('LOS_Studio_Acode_v75.html'))
    (build / 'site/index.html').write_bytes(archive.read(name))
(build / '.github/scripts').mkdir(parents=True, exist_ok=True)
for script in ['auth-sync.js','account-sync.js','sync-merge.js','print-window.js','auth-resume.js','download-file.js','startup-screen.html','heart-scroll.js','account-settings.js','brand-theme.css','app-readiness.js','deletion-guard.js','info-privacy.js']:
    shutil.copy(root / '.github/scripts' / script, build / '.github/scripts' / script)
os.chdir(build)
exec(compile((root / '.github/scripts/prepare-orders-sync.py').read_text(), 'prepare-orders-sync.py', 'exec'))
exec(compile((root / '.github/scripts/prepare-mobile-layout.py').read_text(), 'prepare-mobile-layout.py', 'exec'))
workflow = (root / '.github/workflows/deploy-pages.yml').read_text()
code = workflow.split("          python3 - <<'PY'\n")[-1].split('\n          PY')[0]
code = '\n'.join(line[10:] for line in code.splitlines())
exec(compile(code, 'deploy-pages.yml', 'exec'), {})
html = (build / 'site/index.html').read_text()
assert re.search(r'(?m)^<body class="los-auth-locked"', html), 'App must start locked before scripts run'
assert '/<body class="los-auth-locked"' not in html, 'Do not modify the print helper body pattern'
print('Exact deployment source patches passed')
