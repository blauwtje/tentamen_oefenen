import os
import json
import re
from html import unescape

QDIR = os.path.join(os.path.dirname(__file__), '..', 'quizzes')

TAG_RE = re.compile(r'<[^>]+>')

changed_files = []
for fname in os.listdir(QDIR):
    if not fname.lower().endswith('.json'):
        continue
    path = os.path.join(QDIR, fname)
    with open(path, 'r', encoding='utf-8') as f:
        try:
            data = json.load(f)
        except Exception as e:
            print(f'Failed to parse {fname}: {e}')
            continue
    if not isinstance(data, list):
        continue
    modified = False
    for q in data:
        if not isinstance(q, dict):
            continue
        code = q.get('code')
        if isinstance(code, str) and code:
            # Unescape HTML entities then strip tags
            dec = unescape(code)
            cleaned = TAG_RE.sub('', dec)
            if cleaned != code:
                q['code'] = cleaned
                modified = True
    if modified:
        with open(path, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        changed_files.append(fname)

if changed_files:
    print('Updated files:', ', '.join(changed_files))
else:
    print('No changes needed.')
