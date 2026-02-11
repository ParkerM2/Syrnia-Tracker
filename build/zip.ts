import { zipSync } from "fflate";
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { join, posix, relative, resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const distDir = join(root, "dist");
const outDir = join(root, "dist-zip");

if (!existsSync(distDir)) {
  console.error("dist/ not found. Run `pnpm build` first.");
  process.exit(1);
}

const { version } = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
const archiveName = `syrnia-tracker-v${version}.zip`;

mkdirSync(outDir, { recursive: true });

const collectFiles = (dir: string): string[] => {
  const entries = readdirSync(dir, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...collectFiles(full));
    } else if (!entry.name.endsWith(".map")) {
      files.push(full);
    }
  }
  return files;
};

const files = collectFiles(distDir);
const zipData: Record<string, Uint8Array> = {};

for (const file of files) {
  // Use forward slashes for zip paths
  const relPath = relative(distDir, file).split("\\").join(posix.sep);
  zipData[relPath] = readFileSync(file);
  console.log(`  ${relPath}`);
}

const zipped = zipSync(zipData, { level: 9 });
const outPath = join(outDir, archiveName);
writeFileSync(outPath, zipped);

const sizeMB = (statSync(outPath).size / 1024).toFixed(1);
console.log(`\nCreated: dist-zip/${archiveName} (${sizeMB} KB)`);
