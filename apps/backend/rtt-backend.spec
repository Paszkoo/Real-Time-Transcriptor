# -*- mode: python ; coding: utf-8 -*-
"""PyInstaller spec for the Real-Time Transcriptor backend server."""

from __future__ import annotations

from pathlib import Path

block_cipher = None
backend_root = Path(SPECPATH)
shared_root = backend_root / "../../packages/shared/python"

hidden_imports = [
    "uvicorn.logging",
    "uvicorn.loops",
    "uvicorn.loops.auto",
    "uvicorn.protocols",
    "uvicorn.protocols.http",
    "uvicorn.protocols.http.auto",
    "uvicorn.protocols.websockets",
    "uvicorn.protocols.websockets.auto",
    "uvicorn.lifespan.on",
    "uvicorn.lifespan.off",
    "fastapi",
    "starlette.routing",
    "sqlalchemy.dialects.sqlite",
    "alembic",
    "httpx",
    "tqdm",
    "numpy",
    "sounddevice",
    "reportlab",
    "docx",
    "rtt_shared",
    "rtt_shared.sessions",
    "rtt_shared.settings",
    "faster_whisper",
    "ctranslate2",
]

a = Analysis(
    ["scripts/backend_entry.py"],
    pathex=[str(backend_root), str(shared_root.resolve())],
    binaries=[],
    datas=[
        (str(backend_root / "alembic"), "alembic"),
        (str(backend_root / "alembic.ini"), "."),
    ],
    hiddenimports=hidden_imports,
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=[],
    win_no_prefer_redirects=False,
    win_private_assemblies=False,
    cipher=block_cipher,
    noarchive=False,
)

pyz = PYZ(a.pure, a.zipped_data, cipher=block_cipher)

exe = EXE(
    pyz,
    a.scripts,
    [],
    exclude_binaries=True,
    name="rtt-backend",
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    console=True,
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
)

coll = COLLECT(
    exe,
    a.binaries,
    a.zipfiles,
    a.datas,
    strip=False,
    upx=True,
    upx_exclude=[],
    name="rtt-backend",
)
