import { spawnSync } from "node:child_process";
import { backendDir, ensureBackendVenvPython } from "./resolve-venv-python.mjs";

const pythonExecutable = ensureBackendVenvPython();

const result = spawnSync(pythonExecutable, ["setup.py"], {
  cwd: backendDir,
  stdio: "inherit",
});

process.exit(result.status ?? 1);
