import { cpSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import type { ForgeConfig } from "@electron-forge/shared-types";
import { MakerDMG } from "@electron-forge/maker-dmg";
import { MakerSquirrel } from "@electron-forge/maker-squirrel";
import { MakerZIP } from "@electron-forge/maker-zip";
import { VitePlugin } from "@electron-forge/plugin-vite";

const forgeDirectory = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.join(forgeDirectory, "../..");
const backendBundleSource = path.join(repoRoot, "apps/backend/dist/bundle");
const backendSourceFallback = path.join(forgeDirectory, "../backend");

const githubOwner = process.env.GITHUB_REPOSITORY_OWNER ?? "Paszkoo";
const githubRepo = process.env.GITHUB_REPOSITORY_NAME ?? "Real-Time-Transcriptor";
const assetsDir = path.join(forgeDirectory, "assets");
const appIconBase = path.join(assetsDir, "icon");
const appIconIco = path.join(assetsDir, "icon.ico");
const appIconIcns = path.join(assetsDir, "icon.icns");

function shouldCopyBackendFile(sourcePath: string): boolean {
  const normalized = sourcePath.replace(/\\/g, "/");
  return (
    !normalized.includes("/.venv/") &&
    !normalized.endsWith("/.venv") &&
    !normalized.includes("/__pycache__/") &&
    !normalized.includes("/models/") &&
    !normalized.includes("/dist/") &&
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

function resolveBackendSource(): string {
  if (existsSync(backendBundleSource)) {
    return backendBundleSource;
  }

  console.warn(
    "[forge] PyInstaller bundle not found — falling back to raw backend sources. " +
      "Run `npm run build:backend` before packaging for production.",
  );
  return backendSourceFallback;
}

const osxSign = process.env.APPLE_ID
  ? {
      identity: process.env.APPLE_SIGNING_IDENTITY ?? "Developer ID Application",
      hardenedRuntime: true,
      entitlements: path.join(forgeDirectory, "entitlements.mac.plist"),
      "entitlements-inherit": path.join(forgeDirectory, "entitlements.mac.plist"),
    }
  : undefined;

const osxNotarize =
  process.env.APPLE_ID &&
  process.env.APPLE_APP_SPECIFIC_PASSWORD &&
  process.env.APPLE_TEAM_ID
    ? {
        appleId: process.env.APPLE_ID,
        appleIdPassword: process.env.APPLE_APP_SPECIFIC_PASSWORD,
        teamId: process.env.APPLE_TEAM_ID,
      }
    : undefined;

const config: ForgeConfig = {
  packagerConfig: {
    name: "Real-Time Transcriptor",
    executableName: "real-time-transcriptor",
    appBundleId: "com.realtime.transcriptor",
    asar: true,
    ...(existsSync(appIconBase) ? { icon: appIconBase } : {}),
    osxSign,
    osxNotarize,
    win32metadata: {
      CompanyName: "Real-Time Transcriptor",
      FileDescription: "Real-Time Transcriptor",
      ProductName: "Real-Time Transcriptor",
    },
    ...(process.env.WINDOWS_CERT_FILE
      ? {
          windowsSign: {
            certificateFile: process.env.WINDOWS_CERT_FILE,
            certificatePassword: process.env.WINDOWS_CERT_PASSWORD ?? "",
          },
        }
      : {}),
    publish: [
      {
        provider: "github",
        owner: githubOwner,
        repo: githubRepo,
      },
    ],
  },
  rebuildConfig: {},
  makers: [
    new MakerSquirrel({
      name: "real-time-transcriptor",
      ...(existsSync(appIconIco) ? { setupIcon: appIconIco } : {}),
    }),
    new MakerDMG({
      format: "ULFO",
      ...(existsSync(appIconIcns) ? { icon: appIconIcns } : {}),
    }),
    new MakerZIP({}, ["darwin"]),
  ],
  hooks: {
    packageAfterCopy: async (_forgeConfig, buildPath) => {
      const resourcesDir = resolveResourcesDirectory(buildPath);
      const backendDestination = path.join(resourcesDir, "backend");
      const backendSource = resolveBackendSource();

      cpSync(backendSource, backendDestination, {
        recursive: true,
        filter: (source) => {
          if (backendSource === backendBundleSource) {
            return true;
          }

          return shouldCopyBackendFile(source);
        },
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
