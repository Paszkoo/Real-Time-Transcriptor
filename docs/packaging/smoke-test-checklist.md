# Smoke test checklist — packaged install

Run on a clean VM without Node.js, Python, or preinstalled dev tooling.

## Windows 11

1. Download the Squirrel `.exe` installer from GitHub Releases.
2. Install and launch Real-Time Transcriptor.
3. If Ollama is missing, confirm the first-run wizard shows **Download Ollama** and the external link opens.
4. Install Ollama, start it, click **Retry setup**.
5. Wait for first-run setup to finish (Whisper + `qwen3:4b`).
6. Confirm **Backend online** indicator turns green.
7. Record ~30 seconds of microphone audio on **Live capture**.
8. Open the session in **History** and export **PDF**.
9. Confirm the saved PDF opens and contains transcript text.

## macOS 14

Repeat the same steps using the `.dmg` installer.

1. Mount the DMG, drag the app to Applications, launch from Launchpad.
2. If Gatekeeper warns on unsigned builds, allow the app once for MVP testing.
3. Complete steps 3–9 from the Windows checklist.

## Pass criteria

- Install completes without terminal usage.
- First-run setup completes or guides the user when Ollama is missing.
- A 30-second capture produces a session with exportable PDF content.

## Code signing notes

- **macOS production:** set `APPLE_ID`, `APPLE_APP_SPECIFIC_PASSWORD`, `APPLE_TEAM_ID`, and optionally `APPLE_SIGNING_IDENTITY` in CI secrets.
- **Windows MVP:** optional self-signed cert via `WINDOWS_CERT_FILE` and `WINDOWS_CERT_PASSWORD`; otherwise expect SmartScreen warnings during testing.
