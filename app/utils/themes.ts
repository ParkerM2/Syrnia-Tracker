/**
 * Theme definitions for shadcn/ui
 * Themes are based on tweakcn.com themes
 */

export interface ThemeColors {
  background: string;
  foreground: string;
  card: string;
  'card-foreground': string;
  popover: string;
  'popover-foreground': string;
  primary: string;
  'primary-foreground': string;
  secondary: string;
  'secondary-foreground': string;
  muted: string;
  'muted-foreground': string;
  accent: string;
  'accent-foreground': string;
  destructive: string;
  'destructive-foreground': string;
  border: string;
  input: string;
  ring: string;
}

export interface Theme {
  name: string;
  displayName: string;
  colors: {
    light: ThemeColors;
    dark: ThemeColors;
  };
}

/**
 * Perpetuity theme from tweakcn.com
 * Source: https://tweakcn.com/editor/theme?theme=perpetuity
 * A dark teal/cyan theme with deep blue backgrounds
 */
export const perpetuityTheme: Theme = {
  name: 'perpetuity',
  displayName: 'Perpetuity',
  colors: {
    light: {
      background: '196.36 52.38% 8.24%',
      foreground: '180 77.11% 60.59%',
      card: '192 51.02% 9.61%',
      'card-foreground': '180 77.11% 60.59%',
      popover: '196.36 52.38% 8.24%',
      'popover-foreground': '180 77.11% 60.59%',
      primary: '180 77.11% 60.59%',
      'primary-foreground': '196.36 52.38% 8.24%',
      secondary: '192 51.02% 12%',
      'secondary-foreground': '180 77.11% 60.59%',
      muted: '192 51.02% 12%',
      'muted-foreground': '180 50% 50%',
      accent: '180 77.11% 60.59%',
      'accent-foreground': '196.36 52.38% 8.24%',
      destructive: '0 84.2% 60.2%',
      'destructive-foreground': '180 77.11% 60.59%',
      border: '192 51.02% 15%',
      input: '192 51.02% 15%',
      ring: '180 77.11% 60.59%',
    },
    dark: {
      background: '196.36 52.38% 8.24%',
      foreground: '180 77.11% 60.59%',
      card: '192 51.02% 9.61%',
      'card-foreground': '180 77.11% 60.59%',
      popover: '196.36 52.38% 8.24%',
      'popover-foreground': '180 77.11% 60.59%',
      primary: '180 77.11% 60.59%',
      'primary-foreground': '196.36 52.38% 8.24%',
      secondary: '192 51.02% 12%',
      'secondary-foreground': '180 77.11% 60.59%',
      muted: '192 51.02% 12%',
      'muted-foreground': '180 50% 50%',
      accent: '180 77.11% 60.59%',
      'accent-foreground': '196.36 52.38% 8.24%',
      destructive: '0 62.8% 50%',
      'destructive-foreground': '180 77.11% 60.59%',
      border: '192 51.02% 15%',
      input: '192 51.02% 15%',
      ring: '180 77.11% 60.59%',
    },
  },
};

/**
 * Default theme (shadcn default)
 */
export const defaultTheme: Theme = {
  name: 'default',
  displayName: 'Default',
  colors: {
    light: {
      background: '0 0% 100%',
      foreground: '222.2 84% 4.9%',
      card: '0 0% 100%',
      'card-foreground': '222.2 84% 4.9%',
      popover: '0 0% 100%',
      'popover-foreground': '222.2 84% 4.9%',
      primary: '222.2 47.4% 11.2%',
      'primary-foreground': '210 40% 98%',
      secondary: '210 40% 96.1%',
      'secondary-foreground': '222.2 47.4% 11.2%',
      muted: '210 40% 96.1%',
      'muted-foreground': '215.4 16.3% 46.9%',
      accent: '210 40% 96.1%',
      'accent-foreground': '222.2 47.4% 11.2%',
      destructive: '0 84.2% 60.2%',
      'destructive-foreground': '210 40% 98%',
      border: '214.3 31.8% 91.4%',
      input: '214.3 31.8% 91.4%',
      ring: '222.2 84% 4.9%',
    },
    dark: {
      background: '222.2 84% 4.9%',
      foreground: '210 40% 98%',
      card: '222.2 84% 4.9%',
      'card-foreground': '210 40% 98%',
      popover: '222.2 84% 4.9%',
      'popover-foreground': '210 40% 98%',
      primary: '210 40% 98%',
      'primary-foreground': '222.2 47.4% 11.2%',
      secondary: '217.2 32.6% 17.5%',
      'secondary-foreground': '210 40% 98%',
      muted: '217.2 32.6% 17.5%',
      'muted-foreground': '215 20.2% 65.1%',
      accent: '217.2 32.6% 17.5%',
      'accent-foreground': '210 40% 98%',
      destructive: '0 62.8% 30.6%',
      'destructive-foreground': '210 40% 98%',
      border: '217.2 32.6% 17.5%',
      input: '217.2 32.6% 17.5%',
      ring: '212.7 26.8% 83.9%',
    },
  },
};

/**
 * All available themes
 */
export const themes: Theme[] = [defaultTheme, perpetuityTheme];

/**
 * Get theme by name
 */
export const getTheme = (name: string): Theme | undefined => themes.find(theme => theme.name === name);

/**
 * Apply theme colors to document root
 */
export const applyTheme = (theme: Theme, isDark: boolean): void => {
  const root = document.documentElement;
  const colors = isDark ? theme.colors.dark : theme.colors.light;

  Object.entries(colors).forEach(([key, value]) => {
    const cssVar = `--${key}`;
    root.style.setProperty(cssVar, value);
  });
};
