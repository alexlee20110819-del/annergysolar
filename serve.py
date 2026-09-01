#!/usr/bin/env python3
"""
Local preview server that mirrors the Vercel config: clean URLs (/services
serves services.html) and a real 404 page. Vercel does this in production —
this only exists so local testing behaves the same.

    python3 serve.py [port]
"""
import http.server
import os
import pathlib
import sys

ROOT = pathlib.Path(__file__).parent


class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def translate_path(self, path):
        local = super().translate_path(path)
        if os.path.isdir(local) and os.path.exists(os.path.join(local, "index.html")):
            return os.path.join(local, "index.html")
        if not os.path.exists(local) and not os.path.splitext(local)[1]:
            html = local.rstrip("/") + ".html"
            if os.path.exists(html):
                return html
        return local

    def end_headers(self):
        # Local preview only: never cache, so edits show up on reload.
        self.send_header("Cache-Control", "no-store, must-revalidate")
        super().end_headers()

    def send_error(self, code, message=None, explain=None):
        if code == 404 and (ROOT / "404.html").exists():
            body = (ROOT / "404.html").read_bytes()
            self.send_response(404)
            self.send_header("Content-Type", "text/html; charset=utf-8")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            if self.command != "HEAD":
                self.wfile.write(body)
            return
        super().send_error(code, message, explain)

    def log_message(self, fmt, *args):
        sys.stderr.write("%s\n" % (fmt % args))


if __name__ == "__main__":
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 4321
    print(f"Annergy Solar → http://localhost:{port}")
    http.server.ThreadingHTTPServer(("127.0.0.1", port), Handler).serve_forever()
