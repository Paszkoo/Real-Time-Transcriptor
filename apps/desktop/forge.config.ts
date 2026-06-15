import { cpSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import type { ForgeConfig } from "@electron-forge/shared-types";
import { MakerDMG } from "@electron-forge/maker-dmg";
import { MakerSquirrel } from "@electron-forge/maker-squirrel";
import { MakerZIP } from "@electron-forge/maker-zip";
import { VitePlugin } from "@electron-forge/plugin-vite";

const forgeDirectory = path.dirname(fileURLToPath(import.meta.url));
const backendSource = path.join(forgeDirectory, "../backend");

function shouldCopyBackendFile(sourcePath: string): boolean {
  const normalized = sourcePath.replace(/\\/g, "/");
  return (
    !normalized.includes("/.venv/") &&
    !normalized.endsWith("/.venv") &&
    !normalized.includes("/__pycache__/") &&
    !normalized.includes("/models/") &&
    !normalized.endsWith(".pyc")
  );
}

function resolveResourcesDirectory(buildPath: string): string {
  const darwinResources = path.join(buildPath, "Resources");
  if (existsSync(darwinResources)) {
    return darwinResources;
  }

  return path.join(buildPath, "resources");
}

const config: ForgeConfig = {
  packagerConfig: {
    name: "Real-Time Transcriptor",
    executableName: "real-time-transcriptor",
  },
  rebuildConfig: {},
  makers: [
    new MakerSquirrel({}),
    new MakerDMG({ format: "ULFO" }),
    new MakerZIP({}, ["darwin"]),
  ],
  hooks: {
    packageAfterCopy: async (_forgeConfig, buildPath) => {
      const resourcesDir = resolveResourcesDirectory(buildPath);
      const backendDestination = path.join(resourcesDir, "backend");

      cpSync(backendSource, backendDestination, {
        recursive: true,
        filter: (source) => shouldCopyBackendFile(source),
      });
    },
  },
  plugins: [
    new VitePlugin({
      build: [
        {
          entry: "src/main.ts",
          config: "vite.main.config.ts",
          target: "main",
        },
        {
          entry: "src/preload.ts",
          config: "vite.preload.config.ts",
          target: "preload",
        },
      ],
      renderer: [
        {
          name: "main_window",
          config: "vite.renderer.config.ts",
        },
      ],
    }),
  ],
};

export default config;
