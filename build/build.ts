import { readdirSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import { makeEntryPointPlugin } from './hmr/dist/lib/plugins/make-entry-point-plugin.js';
import env, { IS_DEV, IS_PROD } from './env';
import { watchRebuildPlugin } from './hmr/dist/lib/plugins/watch-rebuild-plugin.js';
import { nodePolyfills } from 'vite-plugin-node-polyfills';
import { build } from 'vite';

const rootDir = resolve(import.meta.dirname, '..');
const appDir = resolve(rootDir, 'app');
const outDir = resolve(rootDir, 'dist');

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
    const haveIndexTsFile = readdirSync(filePath).includes('index.ts');
    const haveIndexTsxFile = readdirSync(filePath).includes('index.tsx');

    if (isFolder && !(haveIndexTsFile || haveIndexTsxFile)) {
      throw new Error(`${folder} in \`matches\` doesn't have index.ts or index.tsx file`);
    } else {
      entryPoints[folder] = resolve(filePath, haveIndexTsFile ? 'index.ts' : 'index.tsx');
    }
  });

  return entryPoints;
};

/**
 * Build content scripts (IIFE format, one per matches/ subfolder)
 */
const buildContentScripts = async () => {
  const matchesDir = resolve(appDir, 'content', 'matches');
  const entries = getContentScriptEntries(matchesDir);

  const contentOutDir = resolve(outDir, 'content');
  const entryList = Object.entries(entries);

  // Build sequentially to avoid race conditions with emptyOutDir
  for (let i = 0; i < entryList.length; i++) {
    const [name, entry] = entryList[i];
    await build({
      configFile: false,
      define: {
        'process.env': env,
      },
      base: '',
      resolve: {
        alias: {
          '@app': appDir,
        },
      },
      plugins: [IS_DEV && makeEntryPointPlugin(), nodePolyfills()],
      build: {
        lib: {
          name: name,
          formats: ['iife' as const],
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
          external: ['chrome'],
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
      'process.env': env,
    },
    resolve: {
      alias: {
        '@app': appDir,
      },
    },
    plugins: [IS_DEV && watchRebuildPlugin({ reload: true, id: 'chrome-extension-hmr' }), nodePolyfills()],
    publicDir: resolve(rootDir, 'public'),
    build: {
      lib: {
        name: 'BackgroundScript',
        fileName: 'background',
        formats: ['es'],
        entry: resolve(appDir, 'background', 'index.ts'),
      },
      outDir,
      emptyOutDir: false,
      sourcemap: IS_DEV,
      minify: IS_PROD,
      reportCompressedSize: IS_PROD,
      watch: watchOption,
      rollupOptions: {
        external: ['chrome'],
      },
    },
  });
};

// Run content scripts and background builds
await buildContentScripts();
await buildBackground();
