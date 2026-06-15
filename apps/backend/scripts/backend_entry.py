"""PyInstaller entrypoint: run the FastAPI backend via uvicorn."""

from __future__ import annotations

import os


def main() -> None:
    import uvicorn

    from app.main import app

    host = os.environ.get("BACKEND_HOST", "127.0.0.1")
    port = int(os.environ.get("BACKEND_PORT", "8765"))
    uvicorn.run(app, host=host, port=port, log_level="info")


if __name__ == "__main__":
    main()
