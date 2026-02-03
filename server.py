#!/usr/bin/env python3
"""
Minimal static file server with a POST endpoint to save quiz results into ./results/
Run: python server.py [port]
"""
import http.server
import socketserver
import sys
import json
from urllib.parse import urlparse
import os
from datetime import datetime, timezone

PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 5173
ROOT = os.path.abspath(os.path.dirname(__file__))
RESULTS_DIR = os.path.join(ROOT, 'results')
if not os.path.isdir(RESULTS_DIR):
    os.makedirs(RESULTS_DIR, exist_ok=True)

class Handler(http.server.SimpleHTTPRequestHandler):
    def do_POST(self):
        parsed = urlparse(self.path)
        if parsed.path != '/save-result':
            self.send_response(404)
            self.end_headers()
            self.wfile.write(b'Not Found')
            return
        length = int(self.headers.get('Content-Length', '0'))
        raw = self.rfile.read(length)
        try:
            data = json.loads(raw.decode('utf-8'))
        except Exception as e:
            self.send_response(400)
            self.end_headers()
            self.wfile.write(b'Invalid JSON')
            return
        # Expecting at least { "quiz": <key>, "firstScore": <number> }
        quiz = data.get('quiz') or data.get('quizKey') or data.get('key')
        score = data.get('firstScore') if 'firstScore' in data else data.get('pct')
        try:
            score = float(score)
        except Exception:
            score = None
        if not quiz or score is None:
            self.send_response(400)
            self.end_headers()
            self.wfile.write(b'Missing quiz or score')
            return
        # prepare a filename-friendly token, strip leading ./ and trailing .json
        raw = str(quiz).lstrip('./')
        if raw.lower().endswith('.json'):
            raw = raw[:-5]
        safe_quiz = ''.join(c for c in raw if c.isalnum() or c in ('_','-','.')).strip() or 'quiz'
        fname = f"{safe_quiz}_results.json"
        fpath = os.path.join(RESULTS_DIR, fname)
        entry = {
            'quiz': quiz,
            'firstScore': score,
            'when': datetime.now(timezone.utc).isoformat()
        }
        # If file exists, append to array; otherwise create new array
        try:
            if os.path.exists(fpath):
                try:
                    with open(fpath, 'r', encoding='utf-8') as f:
                        existing = json.load(f)
                        if isinstance(existing, list):
                            arr = existing
                        else:
                            arr = [existing]
                except Exception:
                    arr = []
            else:
                arr = []

            arr.append(entry)
            # atomic write
            tmp_path = fpath + '.tmp'
            with open(tmp_path, 'w', encoding='utf-8') as f:
                json.dump(arr, f, indent=2)
            os.replace(tmp_path, fpath)
        except Exception as e:
            self.send_response(500)
            self.end_headers()
            self.wfile.write(b'Failed to write file')
            return
        self.send_response(201)
        self.end_headers()
        self.wfile.write(b'OK')

if __name__ == '__main__':
    os.chdir(ROOT)
    with socketserver.TCPServer(("", PORT), Handler) as httpd:
        print(f"Serving on port {PORT} (serving {ROOT})")
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print('\nShutting down')
            httpd.server_close()
