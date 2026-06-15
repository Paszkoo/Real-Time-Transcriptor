import { cpSync, existsSync, mkdirSync, rmSync } from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

import { backendDir, ensureBackendVenvPython } from "./resolve-venv-python.mjs";

const distRoot = path.join(backendDir, "dist");
const bundleRoot = path.join(distRoot, "bundle");

function runPyInstaller(specName) {
  const pythonExecutable = ensureBackendVenvPython();
  const specPath = path.join(backendDir, specName);

  console.log(`Building ${specName}…`);
  const result = spawnSync(pythonExecutable, ["-m", "PyInstaller", "--noconfirm", specPath], {
    cwd: backendDir,
    stdio: "inherit",
  });

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

function mergeBundle(sourceDir, targetDir) {
  if (!existsSync(sourceDir)) {
    console.error(`Missing PyInstaller output: ${sourceDir}`);
    process.exit(1);
  }

  cpSync(sourceDir, targetDir, { recursive: true });
}

if (existsSync(bundleRoot)) {
  rmSync(bundleRoot, { recursive: true, force: true });
}
mkdirSync(bundleRoot, { recursive: true });

runPyInstaller("rtt-backend.spec");
runPyInstaller("rtt-setup.spec");

mergeBundle(path.join(distRoot, "rtt-backend"), bundleRoot);
mergeBundle(path.join(distRoot, "rtt-setup"), path.join(bundleRoot, "setup"));

const setupExecutable =
  process.platform === "win32"
    ? path.join(bundleRoot, "setup", "rtt-setup.exe")
    : path.join(bundleRoot, "setup", "rtt-setup");

if (!existsSync(setupExecutable)) {
  console.error(`Missing setup bundle: ${setupExecutable}`);
  process.exit(1);
}

console.log(`Backend bundle ready at ${bundleRoot}`);
