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
for script in ['auth-sync.js','account-sync.js','sync-merge.js']:
    shutil.copy(root / '.github/scripts' / script, build / '.github/scripts' / script)
os.chdir(build)
exec(compile((root / '.github/scripts/prepare-orders-sync.py').read_text(), 'prepare-orders-sync.py', 'exec'))
workflow = (root / '.github/workflows/deploy-pages.yml').read_text()
code = workflow.split("          python3 - <<'PY'\n")[-1].split('\n          PY')[0]
code = '\n'.join(line[10:] for line in code.splitlines())
exec(compile(code, 'deploy-pages.yml', 'exec'))
print('Exact deployment source patches passed')
