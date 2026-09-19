#!/usr/bin/env python3
import http.server
import socketserver
import os

PORT = 8085

class Handler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate')
        super().end_headers()

if __name__ == '__main__':
    web_dir = os.path.dirname(os.path.abspath(__file__))
    os.chdir(web_dir)
    socketserver.TCPServer.allow_reuse_address = True
    try:
        with socketserver.TCPServer(("", PORT), Handler) as httpd:
            print(f"🚀 TravelPilot Web App running at http://localhost:{PORT}")
            httpd.serve_forever()
    except OSError:
        PORT = 8086
        with socketserver.TCPServer(("", PORT), Handler) as httpd:
            print(f"🚀 TravelPilot Web App running at http://localhost:{PORT}")
            httpd.serve_forever()
