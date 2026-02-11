/**
 * Theme definitions for shadcn/ui
 * Themes are based on tweakcn.com themes
 *
 * Themes are applied via CSS class injection:
 * - A <style id="syrnia-themes"> element is injected with all theme classes
 * - Active theme is set by toggling classes on <html> (e.g. "perpetuity dark")
 * - Default theme uses :root/.dark from global.css (no extra class needed)
 */

import type { CustomTheme } from "@app/utils/storage/types";

interface ThemeColors {
  background: string;
  foreground: string;
  card: string;
  "card-foreground": string;
  popover: string;
  "popover-foreground": string;
  primary: string;
  "primary-foreground": string;
  secondary: string;
  "secondary-foreground": string;
  muted: string;
  "muted-foreground": string;
  accent: string;
  "accent-foreground": string;
  destructive: string;
  "destructive-foreground": string;
  border: string;
  input: string;
  ring: string;
}

interface Theme {
  name: string;
  displayName: string;
  colors: {
    light: ThemeColors;
    dark: ThemeColors;
  };
}

const perpetuityTheme: Theme = {
  name: "perpetuity",
  displayName: "Perpetuity",
  colors: {
    light: {
      background: "hsl(196.36 52.38% 8.24%)",
      foreground: "hsl(180 77.11% 60.59%)",
      card: "hsl(192 51.02% 9.61%)",
      "card-foreground": "hsl(180 77.11% 60.59%)",
      popover: "hsl(196.36 52.38% 8.24%)",
      "popover-foreground": "hsl(180 77.11% 60.59%)",
      primary: "hsl(180 77.11% 60.59%)",
      "primary-foreground": "hsl(196.36 52.38% 8.24%)",
      secondary: "hsl(192 51.02% 12%)",
      "secondary-foreground": "hsl(180 77.11% 60.59%)",
      muted: "hsl(192 51.02% 12%)",
      "muted-foreground": "hsl(180 50% 50%)",
      accent: "hsl(180 77.11% 60.59%)",
      "accent-foreground": "hsl(196.36 52.38% 8.24%)",
      destructive: "hsl(0 84.2% 60.2%)",
      "destructive-foreground": "hsl(180 77.11% 60.59%)",
      border: "hsl(192 51.02% 15%)",
      input: "hsl(192 51.02% 15%)",
      ring: "hsl(180 77.11% 60.59%)",
    },
    dark: {
      background: "hsl(196.36 52.38% 8.24%)",
      foreground: "hsl(180 77.11% 60.59%)",
      card: "hsl(192 51.02% 9.61%)",
      "card-foreground": "hsl(180 77.11% 60.59%)",
      popover: "hsl(196.36 52.38% 8.24%)",
      "popover-foreground": "hsl(180 77.11% 60.59%)",
      primary: "hsl(180 77.11% 60.59%)",
      "primary-foreground": "hsl(196.36 52.38% 8.24%)",
      secondary: "hsl(192 51.02% 12%)",
      "secondary-foreground": "hsl(180 77.11% 60.59%)",
      muted: "hsl(192 51.02% 12%)",
      "muted-foreground": "hsl(180 50% 50%)",
      accent: "hsl(180 77.11% 60.59%)",
      "accent-foreground": "hsl(196.36 52.38% 8.24%)",
      destructive: "hsl(0 62.8% 50%)",
      "destructive-foreground": "hsl(180 77.11% 60.59%)",
      border: "hsl(192 51.02% 15%)",
      input: "hsl(192 51.02% 15%)",
      ring: "hsl(180 77.11% 60.59%)",
    },
  },
};

const defaultTheme: Theme = {
  name: "default",
  displayName: "Default",
  colors: {
    light: {
      background: "hsl(0 0% 100%)",
      foreground: "hsl(222.2 84% 4.9%)",
      card: "hsl(0 0% 100%)",
      "card-foreground": "hsl(222.2 84% 4.9%)",
      popover: "hsl(0 0% 100%)",
      "popover-foreground": "hsl(222.2 84% 4.9%)",
      primary: "hsl(222.2 47.4% 11.2%)",
      "primary-foreground": "hsl(210 40% 98%)",
      secondary: "hsl(210 40% 96.1%)",
      "secondary-foreground": "hsl(222.2 47.4% 11.2%)",
      muted: "hsl(210 40% 96.1%)",
      "muted-foreground": "hsl(215.4 16.3% 46.9%)",
      accent: "hsl(210 40% 96.1%)",
      "accent-foreground": "hsl(222.2 47.4% 11.2%)",
      destructive: "hsl(0 84.2% 60.2%)",
      "destructive-foreground": "hsl(210 40% 98%)",
      border: "hsl(214.3 31.8% 91.4%)",
      input: "hsl(214.3 31.8% 91.4%)",
      ring: "hsl(222.2 84% 4.9%)",
    },
    dark: {
      background: "hsl(222.2 84% 4.9%)",
      foreground: "hsl(210 40% 98%)",
      card: "hsl(222.2 84% 4.9%)",
      "card-foreground": "hsl(210 40% 98%)",
      popover: "hsl(222.2 84% 4.9%)",
      "popover-foreground": "hsl(210 40% 98%)",
      primary: "hsl(210 40% 98%)",
      "primary-foreground": "hsl(222.2 47.4% 11.2%)",
      secondary: "hsl(217.2 32.6% 17.5%)",
      "secondary-foreground": "hsl(210 40% 98%)",
      muted: "hsl(217.2 32.6% 17.5%)",
      "muted-foreground": "hsl(215 20.2% 65.1%)",
      accent: "hsl(217.2 32.6% 17.5%)",
      "accent-foreground": "hsl(210 40% 98%)",
      destructive: "hsl(0 62.8% 30.6%)",
      "destructive-foreground": "hsl(210 40% 98%)",
      border: "hsl(217.2 32.6% 17.5%)",
      input: "hsl(217.2 32.6% 17.5%)",
      ring: "hsl(212.7 26.8% 83.9%)",
    },
  },
};

const themes: Theme[] = [defaultTheme, perpetuityTheme];

const getTheme = (name: string): Theme | undefined => themes.find(theme => theme.name === name);

const CUSTOM_PREFIX = "custom:";

const isCustomThemeName = (name: string): boolean => name.startsWith(CUSTOM_PREFIX);

const getCustomThemeId = (name: string): string => name.slice(CUSTOM_PREFIX.length);

const makeCustomThemeName = (id: string): string => `${CUSTOM_PREFIX}${id}`;

/** Sanitize a theme name to a valid CSS class: "Dark Matter" → "dark-matter" */
const toThemeClass = (name: string): string =>
  name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

const STYLE_ID = "syrnia-themes";

/** Build CSS rules from a color record */
const buildColorBlock = (selector: string, colors: Record<string, string>): string => {
  const vars = Object.entries(colors)
    .map(([key, value]) => `  --${key}: ${value};`)
    .join("\n");
  return `${selector} {\n${vars}\n}`;
};

/** Generate the full CSS string for all non-default themes */
const buildThemeStylesheet = (customThemes: CustomTheme[]): string => {
  const blocks: string[] = [];

  // Built-in themes (skip default — it uses global.css :root/.dark)
  for (const theme of themes) {
    if (theme.name === "default") continue;
    const cls = toThemeClass(theme.name);
    blocks.push(buildColorBlock(`.${cls}`, theme.colors.light));
    blocks.push(buildColorBlock(`.${cls}.dark`, theme.colors.dark));
  }

  // Custom themes
  for (const theme of customThemes) {
    const cls = toThemeClass(theme.name);
    blocks.push(buildColorBlock(`.${cls}`, theme.variables.light));
    blocks.push(buildColorBlock(`.${cls}.dark`, theme.variables.dark));
  }

  return blocks.join("\n\n");
};

const FONT_LINK_ATTR = "data-syrnia-font";

/** Inject <link> elements for Google Font URLs from custom themes */
const injectFontLinks = (customThemes: CustomTheme[]): void => {
  // Remove existing font links we manage
  document.querySelectorAll(`link[${FONT_LINK_ATTR}]`).forEach(el => el.remove());

  // Collect unique font URLs from all custom themes
  const fontUrls = new Set<string>();
  for (const theme of customThemes) {
    if (theme.variables.imports) {
      theme.variables.imports.forEach(url => fontUrls.add(url));
    }
  }

  // Inject <link> elements for each font
  fontUrls.forEach(url => {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = url;
    link.setAttribute(FONT_LINK_ATTR, "");
    document.head.appendChild(link);
  });
};

/** Create or update the <style id="syrnia-themes"> element in <head> */
const injectThemeStylesheet = (customThemes: CustomTheme[]): void => {
  const css = buildThemeStylesheet(customThemes);
  let el = document.getElementById(STYLE_ID) as HTMLStyleElement | null;
  if (!el) {
    el = document.createElement("style");
    el.id = STYLE_ID;
    document.head.appendChild(el);
  }
  el.textContent = css;
  injectFontLinks(customThemes);
};

/**
 * Map a stored theme name to its CSS class.
 * Returns null for default (no class needed — global.css handles it).
 */
const resolveThemeClass = (themeName: string, customThemes: CustomTheme[]): string | null => {
  if (themeName === "default") return null;

  if (isCustomThemeName(themeName)) {
    const id = getCustomThemeId(themeName);
    const custom = customThemes.find(t => t.id === id);
    if (!custom) return null;
    return toThemeClass(custom.name);
  }

  const theme = getTheme(themeName);
  if (!theme) return null;
  return toThemeClass(theme.name);
};

/** Set <html> className to activate the correct theme + dark mode */
const setActiveTheme = (themeName: string | undefined, isDark: boolean, customThemes: CustomTheme[]): void => {
  const themeClass = themeName ? resolveThemeClass(themeName, customThemes) : null;
  const classes: string[] = [];
  if (themeClass) classes.push(themeClass);
  if (isDark) classes.push("dark");
  document.documentElement.className = classes.join(" ");
};

export type { ThemeColors, Theme };
export {
  perpetuityTheme,
  defaultTheme,
  themes,
  getTheme,
  isCustomThemeName,
  getCustomThemeId,
  makeCustomThemeName,
  toThemeClass,
  injectThemeStylesheet,
  setActiveTheme,
};
