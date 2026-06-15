#!/usr/bin/env python3
"""First-run setup: verify Ollama, pull LLM model, download Whisper weights."""

from __future__ import annotations

import re
import shutil
import subprocess
import sys
from pathlib import Path

import httpx
from tqdm import tqdm

from app.config import resolve_whisper_model_dir, settings
from app.modules.llm.client import is_ollama_model_available
from app.modules.settings.runtime import runtime_settings
from app.modules.settings.store import load_runtime_settings
from app.modules.transcription.errors import TranscriptionError

OLLAMA_PROGRESS = re.compile(r"(\d+)%")
OLLAMA_DOWNLOAD_URL = "https://ollama.com/download"

# Keep in sync with SETUP_EXIT_* in apps/desktop/src/setup-runner.ts
EXIT_OK = 0
EXIT_GENERIC = 1
EXIT_OLLAMA_MISSING = 2
EXIT_OLLAMA_UNREACHABLE = 3


def setup_marker_path() -> Path:
    return resolve_whisper_model_dir() / ".setup-complete"


def emit_progress(percent: int, message: str) -> None:
    clamped = max(0, min(100, percent))
    print(f"PROGRESS {clamped}|{message}", flush=True)


def print_step(message: str) -> None:
    print(f"\n==> {message}", flush=True)


def fail(message: str, *, code: int = EXIT_GENERIC) -> None:
    print(f"ERROR: {message}", file=sys.stderr, flush=True)
    sys.exit(code)


def is_setup_complete() -> bool:
    return setup_marker_path().is_file()


def mark_setup_complete() -> None:
    marker = setup_marker_path()
    marker.parent.mkdir(parents=True, exist_ok=True)
    marker.write_text("ok\n", encoding="utf-8")


def ensure_ollama_installed() -> None:
    emit_progress(5, "Checking Ollama installation…")
    print_step("Checking Ollama installation")
    if shutil.which("ollama") is None:
        fail(
            f"Ollama is not installed. Install it from {OLLAMA_DOWNLOAD_URL} and run setup again.",
            code=EXIT_OLLAMA_MISSING,
        )
    emit_progress(10, "Ollama CLI found.")
    print("Ollama CLI found.", flush=True)


def fetch_ollama_tags() -> dict:
    response = httpx.get(f"{settings.ollama_host}/api/tags", timeout=5.0)
    response.raise_for_status()
    return response.json()


def ensure_ollama_running() -> dict:
    emit_progress(15, "Checking Ollama service…")
    print_step("Checking Ollama service")
    try:
        tags = fetch_ollama_tags()
    except httpx.HTTPError as exc:
        fail(
            f"Ollama is not reachable at {settings.ollama_host}. "
            f"Start Ollama and retry. Details: {exc}",
            code=EXIT_OLLAMA_UNREACHABLE,
        )
    emit_progress(20, "Ollama service is reachable.")
    print("Ollama service is reachable.", flush=True)
    return tags


def pull_ollama_model(tags: dict) -> None:
    model_name = runtime_settings.ollama_model
    emit_progress(25, f"Ensuring Ollama model '{model_name}'…")
    print_step(f"Ensuring Ollama model '{model_name}' is available")
    if is_ollama_model_available(model_name, tags):
        emit_progress(55, f"Model '{model_name}' already present.")
        print(f"Model '{model_name}' already present.", flush=True)
        return

    print(f"Pulling '{model_name}' (this may take a while)…", flush=True)
    pull = subprocess.Popen(
        ["ollama", "pull", model_name],
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
    )
    assert pull.stdout is not None

    with tqdm(total=100, desc="Ollama pull", unit="%") as progress:
        last_value = 0
        for line in pull.stdout:
            stripped = line.rstrip()
            print(stripped, flush=True)
            match = OLLAMA_PROGRESS.search(stripped)
            if match:
                value = int(match.group(1))
                progress.update(max(0, value - last_value))
                mapped = 25 + int(value * 0.3)
                emit_progress(mapped, f"Downloading {model_name}… {value}%")
                last_value = value

        if last_value < 100:
            progress.update(100 - last_value)

    if pull.wait() != 0:
        fail(f"Failed to pull Ollama model '{model_name}'.")

    emit_progress(55, f"Model '{model_name}' ready.")


def download_whisper_model() -> None:
    model_name = runtime_settings.whisper_model_name
    emit_progress(60, f"Preparing Whisper model '{model_name}'…")
    print_step(f"Ensuring Whisper model '{model_name}' is cached")
    model_dir = resolve_whisper_model_dir()
    model_dir.mkdir(parents=True, exist_ok=True)

    from app.modules.transcription.whisper_service import whisper_service

    print("Downloading Whisper weights if missing…", flush=True)
    try:
        with tqdm(total=100, desc="Whisper setup", unit="%") as progress:
            progress.set_description("Whisper setup — preparing")
            emit_progress(65, "Downloading Whisper weights…")
            progress.update(15)
            whisper_service.ensure_loaded()
            progress.set_description("Whisper setup — complete")
            progress.update(85)
            emit_progress(95, "Whisper model ready.")
    except TranscriptionError as exc:
        fail(f"Whisper setup failed: {exc.message}")

    print(f"Whisper model ready in {model_dir}.", flush=True)


def main() -> None:
    if is_setup_complete():
        emit_progress(100, "Model setup already completed.")
        print("Model setup already completed — skipping.", flush=True)
        return

    print("Real-Time Transcriptor — first-run model setup", flush=True)
    emit_progress(0, "Starting first-run model setup…")
    load_runtime_settings()
    ensure_ollama_installed()
    tags = ensure_ollama_running()
    pull_ollama_model(tags)
    download_whisper_model()
    mark_setup_complete()
    emit_progress(100, "Setup complete.")
    print("\nSetup complete.", flush=True)


if __name__ == "__main__":
    main()
