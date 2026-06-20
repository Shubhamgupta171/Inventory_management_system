import sys
import os

# Add the 'backend' folder to path so python can resolve 'app' module
sys.path.append(os.path.join(os.path.dirname(__file__), '..', 'backend'))

from app.main import app

# ASGI middleware to strip '/api' prefix from requests when hosted on Vercel
class VercelPathMiddleware:
    def __init__(self, app):
        self.app = app

    async def __call__(self, scope, receive, send):
        if scope["type"] in ("http", "websocket"):
            path = scope.get("path", "")
            if path.startswith("/api"):
                scope["path"] = path[4:] or "/"
                
            raw_path = scope.get("raw_path", b"")
            if raw_path.startswith(b"/api"):
                scope["raw_path"] = raw_path[4:] or b"/"
                
        await self.app(scope, receive, send)

# Wrap the original FastAPI app
app = VercelPathMiddleware(app)

