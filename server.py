#!/usr/bin/env python3
"""
Simple HTTP server for local Earth Explorer development.
Serves static files with proper MIME types for PWA assets.
"""

import http.server
import socketserver
import os
import sys
from pathlib import Path

PORT = int(os.environ.get('PORT', 8000))
HOST = os.environ.get('HOST', '127.0.0.1')

class EarthExplorerHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    """Custom handler with proper MIME types for PWA assets."""
    
    extensions_map = {
        '.html': 'text/html',
        '.css': 'text/css',
        '.js': 'application/javascript',
        '.mjs': 'application/javascript',
        '.json': 'application/json',
        '.geojson': 'application/json',
        '.png': 'image/png',
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.svg': 'image/svg+xml',
        '.ico': 'image/x-icon',
        '.webmanifest': 'application/manifest+json',
    }
    
    def end_headers(self):
        # Enable CORS for local development
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        # Cache control for service worker testing
        if self.path.endswith('sw.js'):
            self.send_header('Cache-Control', 'no-cache, no-store, must-revalidate')
        super().end_headers()
    
    def log_message(self, format, *args):
        # Cleaner log output
        sys.stdout.write("%s - %s\n" % (self.address_string(), format % args))

if __name__ == '__main__':
    # Change to script directory (project root)
    os.chdir(Path(__file__).parent)
    
    with socketserver.TCPServer((HOST, PORT), EarthExplorerHTTPRequestHandler) as httpd:
        print(f"🌍 Earth Explorer server running at http://{HOST}:{PORT}/")
        print(f"📁 Serving from: {os.getcwd()}")
        print(f"Press Ctrl+C to stop")
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\n👋 Server stopped")
            sys.exit(0)
