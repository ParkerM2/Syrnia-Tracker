/**
 * Parse CSS variable blocks from theme CSS (e.g. from tweakcn.com)
 * Supports :root { ... } and .dark { ... } blocks
 * Stores values as-is — supports any color format (hsl, hex, oklch, rgb, etc.)
 */

interface ParsedTheme {
  light: Record<string, string>;
  dark: Record<string, string>;
}

const REQUIRED_VARS = ['background', 'foreground', 'primary'];

/**
 * Extract CSS variable declarations from a block body string.
 * Matches lines like: --key: value;
 */
const extractVariables = (blockBody: string): Record<string, string> => {
  const vars: Record<string, string> = {};
  const varRegex = /--([a-zA-Z0-9-]+)\s*:\s*([^;]+);/g;
  let match: RegExpExecArray | null;

  while ((match = varRegex.exec(blockBody)) !== null) {
    const key = match[1].trim();
    const value = match[2].trim();
    vars[key] = value;
  }

  return vars;
};

/**
 * Parse theme CSS string containing :root { ... } and .dark { ... } blocks.
 * Returns light (from :root) and dark variable maps.
 */
const parseThemeCss = (css: string): ParsedTheme => {
  const result: ParsedTheme = { light: {}, dark: {} };

  // Match :root { ... } block
  const rootMatch = css.match(/:root\s*\{([^}]*(?:\{[^}]*\}[^}]*)*)\}/);
  if (rootMatch) {
    result.light = extractVariables(rootMatch[1]);
  }

  // Match .dark { ... } block
  const darkMatch = css.match(/\.dark\s*\{([^}]*(?:\{[^}]*\}[^}]*)*)\}/);
  if (darkMatch) {
    result.dark = extractVariables(darkMatch[1]);
  }

  return result;
};

/**
 * Validate that a parsed theme contains the minimum required variables.
 * Returns null if valid, or an error message if invalid.
 */
const validateParsedTheme = (parsed: ParsedTheme): string | null => {
  const hasLight = Object.keys(parsed.light).length > 0;
  const hasDark = Object.keys(parsed.dark).length > 0;

  if (!hasLight && !hasDark) {
    return 'No CSS variables found. Paste a CSS block containing :root { ... } and/or .dark { ... } sections.';
  }

  // Check for required variables in whichever mode has vars
  const varsToCheck = hasLight ? parsed.light : parsed.dark;
  const missing = REQUIRED_VARS.filter(v => !varsToCheck[v]);

  if (missing.length > 0) {
    return `Missing required variables: ${missing.map(v => `--${v}`).join(', ')}`;
  }

  return null;
};

/**
 * Reconstruct CSS text from a parsed theme's variables (for edit mode).
 */
const reconstructCss = (variables: ParsedTheme): string => {
  const lines: string[] = [];

  if (Object.keys(variables.light).length > 0) {
    lines.push(':root {');
    Object.entries(variables.light).forEach(([key, value]) => {
      lines.push(`  --${key}: ${value};`);
    });
    lines.push('}');
  }

  if (Object.keys(variables.dark).length > 0) {
    if (lines.length > 0) lines.push('');
    lines.push('.dark {');
    Object.entries(variables.dark).forEach(([key, value]) => {
      lines.push(`  --${key}: ${value};`);
    });
    lines.push('}');
  }

  return lines.join('\n');
};

export type { ParsedTheme };
export { parseThemeCss, validateParsedTheme, reconstructCss };
