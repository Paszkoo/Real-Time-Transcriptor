import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptsDir = path.dirname(fileURLToPath(import.meta.url));
export const repoRoot = path.resolve(scriptsDir, "..");
export const backendDir = path.join(repoRoot, "apps/backend");

export function resolveBackendVenvPython() {
  return process.platform === "win32"
    ? path.join(backendDir, ".venv/Scripts/python.exe")
    : path.join(backendDir, ".venv/bin/python");
}

export function ensureBackendVenvPython() {
  const pythonExecutable = resolveBackendVenvPython();
  if (existsSync(pythonExecutable)) {
    return pythonExecutable;
  }

  console.error(
    "Python venv not found. Create it first:\n" +
      "  cd apps/backend\n" +
      "  python -m venv .venv\n" +
      '  pip install -e ".[dev]"',
  );
  process.exit(1);
}
