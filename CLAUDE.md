# CLAUDE.md

## Project Overview

Syrnia Tracker - A Chrome extension (Manifest V3) that tracks game stats for Syrnia. Built with React, TypeScript, Tailwind CSS, and Vite.

## Commands

- `pnpm build` - Build the extension (content scripts + background + side panel)
- `pnpm dev` - Dev build with HMR
- `pnpm lint` - ESLint check
- `pnpm lint:fix` - Auto-fix lint errors
- `pnpm format` - Format with Prettier
- `pnpm type-check` - TypeScript type checking

## After Every Code Change

1. **Lint check**: Run `pnpm lint` to check for lint errors. Fix all errors before considering the task complete.
2. **Format**: Run `pnpm format` to format all modified files with Prettier.
3. **Verify**: Run `pnpm lint` once more to confirm zero errors remain.

## Project Structure

```
app/                    # All application source code
  background/           # Chrome service worker (background.js)
  content/              # Content scripts injected into web pages
    matches/            # Build entry points (all/, stats/)
  panel/                # React side panel UI
    components/         # Page-level components (Dashboard, Profile, etc.)
    hooks/              # Panel-specific hooks (useGlobalDataSync)
    providers/          # React Query provider
    constants/          # Panel constants (Tabs, FightingLocations)
  components/           # Shared React components
    ui/                 # Radix UI primitives (Button, Card, Dialog, etc.)
  hooks/                # All React hooks
  utils/                # All utility functions
    storage/            # Chrome storage abstraction
  hoc/                  # Higher-order components (withSuspense, withErrorBoundary)
  types/                # Shared TypeScript types
  constants/            # App-wide constants (message types, skills)
  styles/               # Global CSS
  assets/               # Icons and images
build/                  # Build tooling (NOT app code)
  build.ts              # Orchestrates content + background builds
  env.ts                # Environment variable handling
  plugins/              # Vite plugins (make-manifest)
  hmr/                  # Hot module reload (dev only)
  dev-utils/            # Manifest parser
  zipper/               # Extension packaging
public/                 # Static assets copied to dist/
```

## Import Alias

Use `@app/*` to import from the `app/` directory:

```ts
import { useStorage } from '@app/hooks';
import { cn } from '@app/utils/cn';
import { Card, CardContent } from '@app/components';
import type { CSVRow } from '@app/types';
```

## Conventions

- **Functional components only** - Use `const Component = memo(() => { ... })` pattern
- **Presentational hooks** - All logic in hooks, components are presentational
- **Arrow functions** - `func-style` rule enforces expression-style functions
- **Prefer const** - No `var`, prefer `const` over `let`
- **Consistent type imports** - Use `import type { ... }` for type-only imports
- **Barrel exports** - Each directory has an `index.ts` re-exporting its contents
- **No `_` prefixed unused vars** - Use parameterless `catch {}` blocks
- **Import order** - Strict alphabetical ordering enforced by eslint. Auto-fixable with `--fix`

## Build System

Three separate Vite builds orchestrated by `build/build.ts`:

1. **Content scripts** (IIFE) - `app/content/matches/*/index.ts` -> `dist/content/*.iife.js`
2. **Background** (ES module) - `app/background/index.ts` -> `dist/background.js`
3. **Side panel** (HTML app) - `app/panel/` -> `dist/side-panel/`

The manifest is defined in `manifest.js` (root) and compiled to `dist/manifest.json` by the make-manifest plugin.
