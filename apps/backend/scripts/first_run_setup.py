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

from app.config import settings

SETUP_MARKER = Path(settings.whisper_model_dir) / ".setup-complete"
OLLAMA_PROGRESS = re.compile(r"(\d+)%")


def print_step(message: str) -> None:
    print(f"\n==> {message}")


def fail(message: str) -> None:
    print(f"ERROR: {message}", file=sys.stderr)
    sys.exit(1)


def is_setup_complete() -> bool:
    return SETUP_MARKER.is_file()


def mark_setup_complete() -> None:
    SETUP_MARKER.parent.mkdir(parents=True, exist_ok=True)
    SETUP_MARKER.write_text("ok\n", encoding="utf-8")


def ensure_ollama_installed() -> None:
    print_step("Checking Ollama installation")
    if shutil.which("ollama") is None:
        fail(
            "Ollama is not installed. Install it from https://ollama.com/download "
            "and run this script again.",
        )
    print("Ollama CLI found.")


def fetch_ollama_tags() -> dict:
    response = httpx.get(f"{settings.ollama_host}/api/tags", timeout=5.0)
    response.raise_for_status()
    return response.json()


def ensure_ollama_running() -> dict:
    print_step("Checking Ollama service")
    try:
        tags = fetch_ollama_tags()
    except httpx.HTTPError as exc:
        fail(
            f"Ollama is not reachable at {settings.ollama_host}. "
            f"Start Ollama and retry. Details: {exc}",
        )
    print("Ollama service is reachable.")
    return tags


def is_ollama_model_available(model_name: str, tags: dict) -> bool:
    available = {model.get("name", "") for model in tags.get("models", [])}
    return model_name in available or f"{model_name}:latest" in available


def pull_ollama_model(tags: dict) -> None:
    print_step(f"Ensuring Ollama model '{settings.ollama_model}' is available")
    if is_ollama_model_available(settings.ollama_model, tags):
        print(f"Model '{settings.ollama_model}' already present.")
        return

    print(f"Pulling '{settings.ollama_model}' (this may take a while)…")
    pull = subprocess.Popen(
        ["ollama", "pull", settings.ollama_model],
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
    )
    assert pull.stdout is not None

    with tqdm(total=100, desc="Ollama pull", unit="%") as progress:
        last_value = 0
        for line in pull.stdout:
            stripped = line.rstrip()
            print(stripped)
            match = OLLAMA_PROGRESS.search(stripped)
            if match:
                value = int(match.group(1))
                progress.update(max(0, value - last_value))
                last_value = value

        if last_value < 100:
            progress.update(100 - last_value)

    if pull.wait() != 0:
        fail(f"Failed to pull Ollama model '{settings.ollama_model}'.")


def download_whisper_model() -> None:
    print_step(f"Ensuring Whisper model '{settings.whisper_model_name}' is cached")
    model_dir = Path(settings.whisper_model_dir)
    model_dir.mkdir(parents=True, exist_ok=True)

    try:
        import whisper
    except ImportError as exc:
        fail(
            "openai-whisper is not installed. "
            'Run `pip install -e ".[models]"` first. '
            f"Details: {exc}",
        )

    print("Downloading Whisper weights if missing…")
    with tqdm(total=100, desc="Whisper setup", unit="%") as progress:
        progress.set_description("Whisper setup — preparing")
        progress.update(15)
        whisper.load_model(settings.whisper_model_name, download_root=str(model_dir))
        progress.set_description("Whisper setup — complete")
        progress.update(85)

    print(f"Whisper model ready in {model_dir.resolve()}.")


def main() -> None:
    if is_setup_complete():
        print("Model setup already completed — skipping.")
        return

    print("Real-Time Transcriptor — first-run model setup")
    ensure_ollama_installed()
    tags = ensure_ollama_running()
    pull_ollama_model(tags)
    download_whisper_model()
    mark_setup_complete()
    print("\nSetup complete.")


if __name__ == "__main__":
    main()
