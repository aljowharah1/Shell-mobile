#!/usr/bin/env python3
"""
Simple HTTP server to serve the dashboard and CSV data
Run this script and open http://localhost:8000 in your browser
"""

import http.server
import socketserver
import os
import urllib.parse
import json
from datetime import datetime

class CustomHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    def _set_cors_headers(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')

    def do_OPTIONS(self):
        self.send_response(204)
        self._set_cors_headers()
        self.end_headers()

    def do_GET(self):
        # Handle CSV file requests
        if self.path.startswith('/csv/'):
            # Extract the file path from the URL
            file_path = urllib.parse.unquote(self.path[5:])  # Remove '/csv/' prefix
            
            print(f"Requested CSV file: {file_path}")  # Debug output
            
            if os.path.exists(file_path):
                self.send_response(200)
                self.send_header('Content-Type', 'text/csv')
                self._set_cors_headers()
                self.end_headers()
                
                with open(file_path, 'rb') as f:
                    self.wfile.write(f.read())
                print(f"Successfully served CSV file: {file_path}")
            else:
                print(f"CSV file not found: {file_path}")
                self.send_response(404)
                self.send_header('Content-Type', 'text/plain')
                self._set_cors_headers()
                self.end_headers()
                self.wfile.write(f'File not found: {file_path}'.encode())
        else:
            # Serve regular files
            super().do_GET()

    def do_POST(self):
        # Endpoint to log telemetry from frontend into a CSV
        if self.path == '/log_telemetry':
            content_length = int(self.headers.get('Content-Length', 0))
            raw_body = self.rfile.read(content_length) if content_length > 0 else b''
            try:
                payload = json.loads(raw_body.decode('utf-8')) if raw_body else {}
            except Exception as e:
                print(f"Invalid JSON payload: {e}")
                self.send_response(400)
                self.send_header('Content-Type', 'application/json')
                self._set_cors_headers()
                self.end_headers()
                self.wfile.write(json.dumps({'ok': False, 'error': 'invalid_json'}).encode())
                return

            # Ensure logs directory/file
            log_dir = '/Users/taynamghz./Documents/JM_dashboard/2025'
            os.makedirs(log_dir, exist_ok=True)
            log_path = os.path.join(log_dir, 'telemetry_log.csv')

            # Define a stable header order
            headers = [
                'server_received_at',
                'client_timestamp',
                'voltage', 'current', 'power', 'speed', 'rpm',
                'latitude', 'longitude', 'efficiency', 'consumption', 'totalEnergy'
            ]

            # Prepare row values
            now_iso = datetime.utcnow().isoformat() + 'Z'
            row = {
                'server_received_at': now_iso,
                'client_timestamp': payload.get('timestamp')
            }
            row.update({
                'voltage': payload.get('voltage'),
                'current': payload.get('current'),
                'power': payload.get('power'),
                'speed': payload.get('speed'),
                'rpm': payload.get('rpm'),
                'latitude': payload.get('latitude') or payload.get('lat') or payload.get('gps_latitude'),
                'longitude': payload.get('longitude') or payload.get('lon') or payload.get('lng') or payload.get('gps_longitude'),
                'efficiency': payload.get('efficiency'),
                'consumption': payload.get('consumption'),
                'totalEnergy': payload.get('totalEnergy')
            })

            # Append to CSV (create with header if missing)
            file_exists = os.path.exists(log_path)
            with open(log_path, 'a', encoding='utf-8') as f:
                if not file_exists:
                    f.write(','.join(headers) + '\n')
                values = [
                    str(row.get(h, '')) if row.get(h, '') is not None else ''
                    for h in headers
                ]
                f.write(','.join(values) + '\n')

            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self._set_cors_headers()
            self.end_headers()
            self.wfile.write(json.dumps({'ok': True}).encode())
            return

        # Fallback for unknown POST paths
        self.send_response(404)
        self.send_header('Content-Type', 'application/json')
        self._set_cors_headers()
        self.end_headers()
        self.wfile.write(json.dumps({'ok': False, 'error': 'not_found'}).encode())

if __name__ == "__main__":
    PORT = 8000
    
    # Change to the dashboard directory
    os.chdir('/Users/taynamghz./Documents/JM_dashboard')
    
    with socketserver.TCPServer(("", PORT), CustomHTTPRequestHandler) as httpd:
        print(f"Server running at http://localhost:{PORT}")
        print("Open this URL in your browser to view the dashboard")
        print("Press Ctrl+C to stop the server")
        httpd.serve_forever()
