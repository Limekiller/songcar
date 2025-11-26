import http.server
import socketserver
import requests
import urllib.request
import urllib.parse
import json

PORT = 3000
httpd = None

class SongController():

    song = ''
    artist = ''
    album = ''
    url = ''


class Proxy(http.server.SimpleHTTPRequestHandler):
    def do_GET(self):
        query_params = urllib.parse.parse_qs(self.path[2:])
        if 'url' in query_params:
            url = urllib.parse.unquote(query_params['url'][0])
            self.proxy_request(url)

        elif 'metadata' in self.path:
            metadata = json.dumps({
                'song': SongController.song,
                'artist': SongController.artist,
                'album': SongController.album,
                'url': SongController.url
            })

            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.end_headers()

            self.wfile.write(str.encode(metadata))

        else:
            basepath = './dist/'
            path = 'index.html'

            if self.path and self.path != '/':
                path = self.path

            mimetype = self.determine_mime_type(path)
            self.send_response(200)
            self.send_header('Content-type', mimetype)
            self.end_headers()

            with open(basepath + path, 'rb') as file:
                self.wfile.write(file.read())

    def do_POST(self):
        query_params = urllib.parse.parse_qs(self.path[2:])
        if 'url' in query_params:
            url = urllib.parse.unquote(query_params['url'][0])
            content_length = int(self.headers['Content-Length'])
            body = None
            try:
                body = json.loads(self.rfile.read(content_length).decode('utf-8'))
            except:
                body = {}
            self.proxy_request(url, body)
            return

        if 'update' in self.path:
	print(body)
            content_length = int(self.headers['Content-Length'])
            body = json.loads(self.rfile.read(content_length).decode('utf-8'))
            SongController.song = body['song']
            SongController.artist = body['artist']
            SongController.album = body['album']
            SongController.url = body['url']

            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.end_headers()

            self.wfile.write(str.encode(json.dumps({"result": "success"})))

    def determine_mime_type(self, path):
        types = {
            "css": "text/css",
            "js": "text/javascript",
            "html": "text/html"
        }
        mimetype = 'text/html'
        if '.' in path:
            extension = path.split('.')[-1]
            mimetype = types[extension]
        return mimetype

    def proxy_request(self, url, body=None):
        headers = self.get_request_headers()
        resp = None
        if body == None:
            resp = requests.get(url, headers=headers)
        else:
            resp = requests.post(url, headers=headers, json=body)

        self.send_response(resp.status_code)
        self.send_resp_headers(resp)
        self.wfile.write(resp.content)

    def get_request_headers(self):
        headers = {}
        for header in ['Content-Type', 'Authorization']:
            if header in self.headers:
                headers[header] = self.headers[header]
        return headers

    def send_resp_headers(self, resp):
        respheaders = resp.headers
        for key in respheaders:
            if key not in ['Content-Encoding', 'Transfer-Encoding', 'content-encoding', 'transfer-encoding', 'content-length', 'Content-Length']:
                self.send_header(key, respheaders[key])
        self.send_header('Content-Length', len(resp.content))
        self.end_headers()

try:
    socketserver.TCPServer.allow_reuse_address = True
    httpd = socketserver.TCPServer(('', PORT), Proxy)
    print(f"Proxy at: http://localhost:{PORT}")
    httpd.serve_forever()
except KeyboardInterrupt:
    print("Pressed Ctrl+C")
finally:
    if httpd:
        httpd.shutdown()
