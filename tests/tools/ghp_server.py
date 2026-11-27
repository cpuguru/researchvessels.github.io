# Serve a folder like GitHub Pages: static files, /404.html (status 404) for missing paths, dir -> index.html.
import http.server, os, sys, functools
ROOT=os.path.abspath(sys.argv[1]); PORT=int(sys.argv[2])
class H(http.server.SimpleHTTPRequestHandler):
    def log_message(self,*a): pass
    def send_error(self, code, message=None, explain=None):
        p=os.path.join(ROOT,'404.html')
        if code==404 and os.path.exists(p):
            b=open(p,'rb').read(); self.send_response(404); self.send_header('Content-Type','text/html; charset=utf-8'); self.send_header('Content-Length',str(len(b))); self.end_headers(); self.wfile.write(b); return
        super().send_error(code,message,explain)
http.server.ThreadingHTTPServer(('127.0.0.1',PORT),functools.partial(H,directory=ROOT)).serve_forever()
