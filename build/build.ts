import { readdirSync, statSync } from "node:fs";
import { resolve } from "node:path";
import { makeEntryPointPlugin } from "./hmr/lib/plugins/make-entry-point-plugin.js";
import env, { IS_DEV, IS_PROD } from "./env";
import { watchPublicPlugin } from "./hmr/lib/plugins/watch-public-plugin.js";
import { watchRebuildPlugin } from "./hmr/lib/plugins/watch-rebuild-plugin.js";
import makeManifestPlugin from "./plugins/make-manifest-plugin";
import react from "@vitejs/plugin-react-swc";
import { build } from "vite";
import { nodePolyfills } from "vite-plugin-node-polyfills";

const rootDir = resolve(import.meta.dirname, "..");
const appDir = resolve(rootDir, "app");
const outDir = resolve(rootDir, "dist");

const watchOption = IS_DEV
  ? {
      chokidar: {
        awaitWriteFinish: true,
      },
    }
  : undefined;

/**
 * Get content script entry points from app/content/matches/
 */
const getContentScriptEntries = (matchesDir: string) => {
  const entryPoints: Record<string, string> = {};
  const entries = readdirSync(matchesDir);

  entries.forEach((folder: string) => {
    const filePath = resolve(matchesDir, folder);
    const isFolder = statSync(filePath).isDirectory();
    const haveIndexTsFile = readdirSync(filePath).includes("index.ts");
    const haveIndexTsxFile = readdirSync(filePath).includes("index.tsx");

    if (isFolder && !(haveIndexTsFile || haveIndexTsxFile)) {
      throw new Error(`${folder} in \`matches\` doesn't have index.ts or index.tsx file`);
    } else {
      entryPoints[folder] = resolve(filePath, haveIndexTsFile ? "index.ts" : "index.tsx");
    }
  });

  return entryPoints;
};

/**
 * Build content scripts (IIFE format, one per matches/ subfolder)
 */
const buildContentScripts = async () => {
  const matchesDir = resolve(appDir, "content", "matches");
  const entries = getContentScriptEntries(matchesDir);

  const contentOutDir = resolve(outDir, "content");
  const entryList = Object.entries(entries);

  // Build sequentially to avoid race conditions with emptyOutDir
  for (let i = 0; i < entryList.length; i++) {
    const [name, entry] = entryList[i];
    await build({
      configFile: false,
      define: {
        "process.env": env,
      },
      base: "",
      resolve: {
        alias: {
          "@app": appDir,
        },
      },
      plugins: [IS_DEV && watchRebuildPlugin({ refresh: true }), IS_DEV && makeEntryPointPlugin(), nodePolyfills()],
      publicDir: false,
      build: {
        lib: {
          name: name,
          formats: ["iife" as const],
          entry,
          fileName: name,
        },
        outDir: contentOutDir,
        sourcemap: IS_DEV,
        minify: IS_PROD,
        reportCompressedSize: IS_PROD,
        emptyOutDir: i === 0 && IS_PROD,
        watch: watchOption,
        rollupOptions: {
          external: ["chrome"],
        },
      },
    });
  }
};

/**
 * Build background service worker (ES module, library mode)
 */
const buildBackground = async () => {
  await build({
    configFile: false,
    define: {
      "process.env": env,
    },
    resolve: {
      alias: {
        "@app": appDir,
      },
    },
    plugins: [IS_DEV && watchRebuildPlugin({ reload: true, id: "chrome-extension-hmr" }), nodePolyfills()],
    publicDir: resolve(rootDir, "public"),
    build: {
      lib: {
        name: "BackgroundScript",
        fileName: "background",
        formats: ["es"],
        entry: resolve(appDir, "background", "index.ts"),
      },
      outDir,
      emptyOutDir: false,
      sourcemap: IS_DEV,
      minify: IS_PROD,
      reportCompressedSize: IS_PROD,
      watch: watchOption,
      rollupOptions: {
        external: ["chrome"],
      },
    },
  });
};

/**
 * Build side panel (React app with manifest generation)
 */
const buildSidePanel = async () => {
  await build({
    root: resolve(appDir, "panel"),
    configFile: false,
    define: {
      "process.env": env,
    },
    base: "",
    resolve: {
      alias: {
        "@app": appDir,
      },
    },
    plugins: [
      react(),
      IS_DEV && watchRebuildPlugin({ refresh: true }),
      watchPublicPlugin(),
      makeManifestPlugin({ outDir }),
      nodePolyfills(),
    ],
    publicDir: resolve(rootDir, "public", "panel"),
    build: {
      outDir: resolve(outDir, "side-panel"),
      sourcemap: IS_DEV,
      minify: IS_PROD,
      reportCompressedSize: IS_PROD,
      emptyOutDir: IS_PROD,
      watch: watchOption,
      rollupOptions: {
        external: ["chrome"],
      },
    },
  });
};

// Start HMR reload server in dev mode (before builds so plugins can connect)
let broadcastReload: ((id: string) => void) | undefined;
if (IS_DEV) {
  const server = await import("./hmr/lib/initializers/init-reload-server.js");
  broadcastReload = server.broadcastReload;
}

// Run all builds sequentially to ensure proper ordering
await buildContentScripts();
await buildBackground();
await buildSidePanel();

// Dev mode: listen for keyboard shortcuts
if (IS_DEV && process.stdin.isTTY) {
  console.log("\n  Shortcuts:");
  console.log("  r  \u2192  reload extension");
  console.log("  q  \u2192  quit\n");

  process.stdin.setRawMode(true);
  process.stdin.resume();
  process.stdin.setEncoding("utf8");

  process.stdin.on("data", (key: string) => {
    if (key === "r") {
      broadcastReload?.("chrome-extension-hmr");
      console.log("[HMR] Manual reload triggered");
    }
    if (key === "q" || key === "\u0003") {
      process.exit(0);
    }
  });
}
