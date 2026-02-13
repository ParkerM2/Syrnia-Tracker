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

1. **Format**: Run `pnpm format` to format all modified files with Prettier.
2. **Lint check**: Run `pnpm lint` to check for lint errors. Fix all errors before considering the task complete.
3. **Verify**: Run `pnpm lint` once more to confirm zero errors remain.
4. **Spot-check changed files**: Re-read each file you modified and verify:
   - Double quotes `"` are used for all strings (not single quotes `'`)
   - No unnecessary blank lines (max 1 consecutive empty line)
   - Lines stay within 120 characters (`printWidth: 120`)
   - Files end with a single newline
   - No trailing whitespace on any line
   - Indentation uses 2 spaces (no tabs)
   - Trailing commas are present in multi-line structures
   - **No hardcoded Tailwind colors** (e.g. `amber-500`, `green-600`, `red-500`). All colors must use theme variables (`primary`, `destructive`, `muted`, `accent`, etc.) — see "Theming & Styling" section
   - If any of the above are wrong, run `pnpm format` again or fix manually

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
- **Double quotes** - Use `"` for all strings (Prettier enforces this)
- **Consistent type imports** - Use `import type { ... }` for type-only imports
- **Barrel exports** - Each directory has an `index.ts` re-exporting its contents
- **No `_` prefixed unused vars** - Use parameterless `catch {}` blocks
- **Import order** - Strict alphabetical ordering enforced by eslint. Auto-fixable with `--fix`

## Theming & Styling (CRITICAL)

This app supports user-customizable themes via CSS variables (shadcn/ui pattern). **All colors MUST use theme variables, never hardcoded Tailwind color classes.**

### Available Theme Colors (from `tailwind.config.ts`)

These are the ONLY colors you should use in Tailwind classes and CSS-in-JS:

| Tailwind Class | CSS Variable | Usage |
|----------------|-------------|-------|
| `primary` / `primary-foreground` | `--primary` | Main brand color, primary actions, emphasis |
| `secondary` / `secondary-foreground` | `--secondary` | Secondary actions, less prominent elements |
| `destructive` / `destructive-foreground` | `--destructive` | Errors, warnings, attention indicators, costs |
| `muted` / `muted-foreground` | `--muted` | Subdued backgrounds, secondary text |
| `accent` / `accent-foreground` | `--accent` | Highlights, badges, interactive elements |
| `background` / `foreground` | `--background` | Page background and default text |
| `card` / `card-foreground` | `--card` | Card backgrounds |
| `popover` / `popover-foreground` | `--popover` | Popover/dropdown backgrounds |
| `border` / `input` / `ring` | `--border` | Borders, input outlines, focus rings |

### Rules

1. **NEVER use hardcoded Tailwind color classes** like `bg-amber-500`, `text-green-600`, `border-red-500`, etc. These break when users switch themes.
2. **ALWAYS use theme variables** via the Tailwind classes above: `bg-primary`, `text-destructive`, `border-muted`, etc.
3. **For opacity variants**, use Tailwind's `/` syntax with theme colors: `bg-primary/20`, `text-destructive/50`, `border-accent/30`.
4. **For CSS-in-JS `style` props**, use `color-mix` with CSS variables:
   ```ts
   const BADGE_STYLE: CSSProperties = {
     backgroundColor: "color-mix(in srgb, var(--primary) 20%, transparent)",
     borderColor: "color-mix(in srgb, var(--primary) 30%, transparent)",
     color: "var(--primary)",
   };
   ```
5. **Before adding any color**, check `tailwind.config.ts` and `app/styles/global.css` for available theme variables. If a needed semantic color doesn't exist, add it to the theme system rather than hardcoding.

### Known Exceptions (legacy, do not expand)

- `DataView/index.tsx` - JSON syntax highlighting uses hardcoded colors (`text-orange-400`, `text-blue-400`, etc.) because syntax colors are semantically fixed and unrelated to the UI theme.

### Pre-flight Check

Before writing any UI component or styled element, answer:
- "Am I using a color from the theme system?" If no, stop and find the right theme variable.
- "Will this look correct in a completely different color scheme?" If no, you're hardcoding.

## Formatting Rules (Prettier)

- `printWidth`: 120 (max line length)
- `tabWidth`: 2 (2-space indentation)
- `singleQuote`: false (use double quotes `"`)
- `semi`: true (always use semicolons)
- `trailingComma`: all (trailing commas everywhere)
- `arrowParens`: avoid (omit parens for single-arg arrows)
- `bracketSameLine`: true (closing `>` on same line as last prop)
- `endOfLine`: lf (Unix line endings)
- Files must end with a single newline, no trailing whitespace

## Build System

Three separate Vite builds orchestrated by `build/build.ts`:

1. **Content scripts** (IIFE) - `app/content/matches/*/index.ts` -> `dist/content/*.iife.js`
2. **Background** (ES module) - `app/background/index.ts` -> `dist/background.js`
3. **Side panel** (HTML app) - `app/panel/` -> `dist/side-panel/`

The manifest is defined in `manifest.js` (root) and compiled to `dist/manifest.json` by the make-manifest plugin.
