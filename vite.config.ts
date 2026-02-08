import env, { IS_DEV, IS_PROD } from './build/env';
import { watchPublicPlugin } from './build/hmr/dist/lib/plugins/watch-public-plugin.js';
import { watchRebuildPlugin } from './build/hmr/dist/lib/plugins/watch-rebuild-plugin.js';
import makeManifestPlugin from './build/plugins/make-manifest-plugin';
import react from '@vitejs/plugin-react-swc';
import { defineConfig } from 'vite';
import { nodePolyfills } from 'vite-plugin-node-polyfills';
import { resolve } from 'node:path';

const rootDir = resolve(import.meta.dirname);
const appDir = resolve(rootDir, 'app');
const outDir = resolve(rootDir, 'dist');

const watchOption = IS_DEV
  ? {
      chokidar: {
        awaitWriteFinish: true,
      },
    }
  : undefined;

export default defineConfig({
  root: resolve(appDir, 'panel'),
  define: {
    'process.env': env,
  },
  base: '',
  resolve: {
    alias: {
      '@app': appDir,
    },
  },
  plugins: [
    react(),
    IS_DEV && watchRebuildPlugin({ refresh: true }),
    watchPublicPlugin(),
    makeManifestPlugin({ outDir }),
    nodePolyfills(),
  ],
  publicDir: resolve(rootDir, 'public', 'panel'),
  build: {
    outDir: resolve(outDir, 'side-panel'),
    sourcemap: IS_DEV,
    minify: IS_PROD,
    reportCompressedSize: IS_PROD,
    emptyOutDir: IS_PROD,
    watch: watchOption,
    rollupOptions: {
      external: ['chrome'],
    },
  },
});
