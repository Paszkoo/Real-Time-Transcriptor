import path from "node:path";

/** Relative paths from compiled main entry (apps/desktop/.vite/build). */
const REPO_ROOT_FROM_MAIN = "../../../..";
const BACKEND_DIR_FROM_MAIN = "../../../backend";

export function resolveRepoRootFromMain(mainDirname: string): string {
  return path.resolve(mainDirname, REPO_ROOT_FROM_MAIN);
}

export function resolveBackendDirFromMain(mainDirname: string): string {
  return path.resolve(mainDirname, BACKEND_DIR_FROM_MAIN);
}
