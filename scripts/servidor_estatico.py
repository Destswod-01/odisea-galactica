"""Servidor existente del juego con revalidación del punto de entrada de Órbita 2.

Mantiene las rutas de las otras versiones. No se modifican sus encabezados.
"""
import argparse
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import unquote, urlsplit


class JuegoHandler(SimpleHTTPRequestHandler):
    def end_headers(self):
        path = unquote(urlsplit(self.path).path)
        if path in ("/orbita-2", "/orbita-2/", "/orbita-2/index.html", "/orbita-2/version.json"):
            self.send_header("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0")
            self.send_header("Pragma", "no-cache")
            self.send_header("Expires", "0")
        super().end_headers()


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--directory", required=True)
    parser.add_argument("--port", type=int, default=3240)
    parser.add_argument("--bind", default="127.0.0.1")
    args = parser.parse_args()
    handler = partial(JuegoHandler, directory=args.directory)
    with ThreadingHTTPServer((args.bind, args.port), handler) as server:
        server.serve_forever()
