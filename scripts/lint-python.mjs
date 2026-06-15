import { spawnSync } from "node:child_process";
import { ensureBackendVenvPython, repoRoot } from "./resolve-venv-python.mjs";

const pythonExecutable = ensureBackendVenvPython();
const args = process.argv.slice(2);
const ruffArgs = args.length > 0 ? args : ["check", "apps/backend"];

const result = spawnSync(pythonExecutable, ["-m", "ruff", ...ruffArgs], {
  cwd: repoRoot,
  stdio: "inherit",
});

process.exit(result.status ?? 1);
