# Real-Time Transcriptor

Whisper-based desktop transcriptor (faster-whisper) with a local FastAPI backend and Electron UI.

## Prerequisites

| Tool | Version |
|------|---------|
| Node.js | 20+ |
| Python | 3.11+ |
| Git | any recent |

Optional (for first-run model setup):

- [Ollama](https://ollama.com/download) — local LLM runtime (`qwen3:4b`)

## Quick start (~15 min)

### 1. Clone and install Node dependencies

```bash
git clone <repo-url>
cd Real-Time-Transcriptor
npm install
```

### 2. Python backend environment

**Windows (PowerShell):**

```powershell
cd apps\backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -e ".[dev]"
cd ..\..
```

**macOS / Linux:**

```bash
cd apps/backend
python3 -m venv .venv
source .venv/bin/activate
pip install -e ".[dev]"
cd ../..
```

### 3. Environment configuration

```bash
cp .env.example .env
```

Adjust ports, model paths, `DEVICE` (`cpu`, `cuda`, `mps`), or `RUN_MODEL_SETUP_ON_START` if needed.

### 4. (Optional) Download AI models

Run once before transcription features are used:

```bash
npm run setup:models
```

Equivalent manual command (uses the venv Python):

```bash
cd apps/backend
python setup.py
```

This verifies Ollama, pulls `qwen3:4b`, and caches the Whisper `large-v3-turbo` model (via faster-whisper) with CLI progress bars (tqdm). Re-runs are skipped automatically via a setup marker file.

Requires model extras first: `pip install -e ".[models]"` in `apps/backend`.

To run setup automatically on first app launch with a **UI progress bar**, set in `.env`:

```env
RUN_MODEL_SETUP_ON_START=true
```

### 5. Start development

```bash
npm run dev
```

Electron opens with hot-reloaded React UI. The FastAPI backend starts automatically as a child process. When healthy, the UI shows a **green “Backend online”** indicator (polled every 2 s via `/api/health`).

## Project layout

```
apps/
  desktop/     Electron + React + Vite + Tailwind
  backend/     FastAPI + uvicorn
packages/
  shared/      Shared TS types and Python models
```

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Electron dev mode with backend |
| `npm run lint` | ESLint (TS) + Ruff (Python) |
| `npm run format` | Prettier + Ruff format |
| `npm run setup:models` | First-run Ollama + Whisper setup |

## Packaging

Production builds bundle the Python backend with PyInstaller and ship it inside the Electron app.

```bash
npm run make
```

This runs `build:backend` first, then Electron Forge `make`.

Build targets:

- **Windows** — Squirrel installer (`.exe`)
- **macOS** — DMG (+ ZIP artifact)

Packaged apps run first-run model setup automatically. Ollama must still be installed separately; the wizard links to the download page if it is missing.

Release builds are produced by GitHub Actions on tags matching `v*` (see `.github/workflows/release.yml`).

Optional signing env vars for CI/local packaging:

| Variable | Platform |
|----------|----------|
| `APPLE_ID`, `APPLE_APP_SPECIFIC_PASSWORD`, `APPLE_TEAM_ID` | macOS notarization |
| `APPLE_SIGNING_IDENTITY` | macOS signing identity override |
| `WINDOWS_CERT_BASE64`, `WINDOWS_CERT_PASSWORD` | Windows code signing (CI decodes cert to a temp `.pfx`) |
| `WINDOWS_CERT_FILE`, `WINDOWS_CERT_PASSWORD` | Windows code signing for local builds |

Smoke test checklist: `docs/packaging/smoke-test-checklist.md`.

## Pre-commit hooks

```bash
pip install pre-commit
pre-commit install
```

Runs Ruff, ESLint, and Prettier on staged files.

## Troubleshooting

**Backend stays offline**

- Ensure the Python venv exists under `apps/backend/.venv` and dependencies are installed.
- Check nothing else listens on port `8765` (or your `BACKEND_PORT`).
- Run the backend manually to inspect errors:

  ```bash
  cd apps/backend
  source .venv/bin/activate   # or .\.venv\Scripts\Activate.ps1 on Windows
  uvicorn app.main:app --host 127.0.0.1 --port 8765
  ```

**Ollama setup fails**

- Install Ollama and ensure the service is running before `npm run setup:models`.

**Whisper download is slow**

- First download caches weights under `WHISPER_MODEL_DIR` (default `./models/whisper`).
