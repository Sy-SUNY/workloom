"""Export a self-contained portfolio and browser-only interactive demo."""
import json
import shutil
from pathlib import Path
from server import ROOT, ROLES, SEEDS

out = ROOT / 'dist'
out.mkdir(exist_ok=True)
for source in (ROOT / 'web').iterdir():
    if source.is_file():
        shutil.copy2(source, out / source.name)
    elif source.is_dir():
        shutil.copytree(source, out / source.name, dirs_exist_ok=True)
data = {'roles': ROLES, 'documents': [{'id': i+1, 'title': t, 'scope': s, 'owner': 'seed', 'content': text} for i, (t,s,_,text) in enumerate(SEEDS)]}
(out / 'demo-data.js').write_text('window.WORKLOOM_SEEDS = ' + json.dumps(data, ensure_ascii=False) + ';', encoding='utf-8')
print('Static export ready: dist/ (browser demo; no server-side model calls)')
