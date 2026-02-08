/**
 * Theme definitions for shadcn/ui
 * Themes are based on tweakcn.com themes
 */

import type { CustomTheme } from '@app/utils/storage/types';

interface ThemeColors {
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

interface Theme {
  name: string;
  displayName: string;
  colors: {
    light: ThemeColors;
    dark: ThemeColors;
  };
}

const perpetuityTheme: Theme = {
  name: 'perpetuity',
  displayName: 'Perpetuity',
  colors: {
    light: {
      background: 'hsl(196.36 52.38% 8.24%)',
      foreground: 'hsl(180 77.11% 60.59%)',
      card: 'hsl(192 51.02% 9.61%)',
      'card-foreground': 'hsl(180 77.11% 60.59%)',
      popover: 'hsl(196.36 52.38% 8.24%)',
      'popover-foreground': 'hsl(180 77.11% 60.59%)',
      primary: 'hsl(180 77.11% 60.59%)',
      'primary-foreground': 'hsl(196.36 52.38% 8.24%)',
      secondary: 'hsl(192 51.02% 12%)',
      'secondary-foreground': 'hsl(180 77.11% 60.59%)',
      muted: 'hsl(192 51.02% 12%)',
      'muted-foreground': 'hsl(180 50% 50%)',
      accent: 'hsl(180 77.11% 60.59%)',
      'accent-foreground': 'hsl(196.36 52.38% 8.24%)',
      destructive: 'hsl(0 84.2% 60.2%)',
      'destructive-foreground': 'hsl(180 77.11% 60.59%)',
      border: 'hsl(192 51.02% 15%)',
      input: 'hsl(192 51.02% 15%)',
      ring: 'hsl(180 77.11% 60.59%)',
    },
    dark: {
      background: 'hsl(196.36 52.38% 8.24%)',
      foreground: 'hsl(180 77.11% 60.59%)',
      card: 'hsl(192 51.02% 9.61%)',
      'card-foreground': 'hsl(180 77.11% 60.59%)',
      popover: 'hsl(196.36 52.38% 8.24%)',
      'popover-foreground': 'hsl(180 77.11% 60.59%)',
      primary: 'hsl(180 77.11% 60.59%)',
      'primary-foreground': 'hsl(196.36 52.38% 8.24%)',
      secondary: 'hsl(192 51.02% 12%)',
      'secondary-foreground': 'hsl(180 77.11% 60.59%)',
      muted: 'hsl(192 51.02% 12%)',
      'muted-foreground': 'hsl(180 50% 50%)',
      accent: 'hsl(180 77.11% 60.59%)',
      'accent-foreground': 'hsl(196.36 52.38% 8.24%)',
      destructive: 'hsl(0 62.8% 50%)',
      'destructive-foreground': 'hsl(180 77.11% 60.59%)',
      border: 'hsl(192 51.02% 15%)',
      input: 'hsl(192 51.02% 15%)',
      ring: 'hsl(180 77.11% 60.59%)',
    },
  },
};

const defaultTheme: Theme = {
  name: 'default',
  displayName: 'Default',
  colors: {
    light: {
      background: 'hsl(0 0% 100%)',
      foreground: 'hsl(222.2 84% 4.9%)',
      card: 'hsl(0 0% 100%)',
      'card-foreground': 'hsl(222.2 84% 4.9%)',
      popover: 'hsl(0 0% 100%)',
      'popover-foreground': 'hsl(222.2 84% 4.9%)',
      primary: 'hsl(222.2 47.4% 11.2%)',
      'primary-foreground': 'hsl(210 40% 98%)',
      secondary: 'hsl(210 40% 96.1%)',
      'secondary-foreground': 'hsl(222.2 47.4% 11.2%)',
      muted: 'hsl(210 40% 96.1%)',
      'muted-foreground': 'hsl(215.4 16.3% 46.9%)',
      accent: 'hsl(210 40% 96.1%)',
      'accent-foreground': 'hsl(222.2 47.4% 11.2%)',
      destructive: 'hsl(0 84.2% 60.2%)',
      'destructive-foreground': 'hsl(210 40% 98%)',
      border: 'hsl(214.3 31.8% 91.4%)',
      input: 'hsl(214.3 31.8% 91.4%)',
      ring: 'hsl(222.2 84% 4.9%)',
    },
    dark: {
      background: 'hsl(222.2 84% 4.9%)',
      foreground: 'hsl(210 40% 98%)',
      card: 'hsl(222.2 84% 4.9%)',
      'card-foreground': 'hsl(210 40% 98%)',
      popover: 'hsl(222.2 84% 4.9%)',
      'popover-foreground': 'hsl(210 40% 98%)',
      primary: 'hsl(210 40% 98%)',
      'primary-foreground': 'hsl(222.2 47.4% 11.2%)',
      secondary: 'hsl(217.2 32.6% 17.5%)',
      'secondary-foreground': 'hsl(210 40% 98%)',
      muted: 'hsl(217.2 32.6% 17.5%)',
      'muted-foreground': 'hsl(215 20.2% 65.1%)',
      accent: 'hsl(217.2 32.6% 17.5%)',
      'accent-foreground': 'hsl(210 40% 98%)',
      destructive: 'hsl(0 62.8% 30.6%)',
      'destructive-foreground': 'hsl(210 40% 98%)',
      border: 'hsl(217.2 32.6% 17.5%)',
      input: 'hsl(217.2 32.6% 17.5%)',
      ring: 'hsl(212.7 26.8% 83.9%)',
    },
  },
};

const themes: Theme[] = [defaultTheme, perpetuityTheme];

const getTheme = (name: string): Theme | undefined => themes.find(theme => theme.name === name);

const CUSTOM_PREFIX = 'custom:';

const isCustomThemeName = (name: string): boolean => name.startsWith(CUSTOM_PREFIX);

const getCustomThemeId = (name: string): string => name.slice(CUSTOM_PREFIX.length);

const makeCustomThemeName = (id: string): string => `${CUSTOM_PREFIX}${id}`;

const clearThemeVariables = (element: HTMLElement): void => {
  const { style } = element;
  const propsToRemove: string[] = [];
  for (let i = 0; i < style.length; i++) {
    const prop = style[i];
    if (prop.startsWith('--')) {
      propsToRemove.push(prop);
    }
  }
  propsToRemove.forEach(prop => style.removeProperty(prop));
};

const applyTheme = (theme: Theme, isDark: boolean): void => {
  const root = document.documentElement;
  clearThemeVariables(root);
  const colors = isDark ? theme.colors.dark : theme.colors.light;

  Object.entries(colors).forEach(([key, value]) => {
    root.style.setProperty(`--${key}`, value);
  });
};

const applyCustomTheme = (theme: CustomTheme, isDark: boolean): void => {
  const root = document.documentElement;
  clearThemeVariables(root);
  const variables = isDark ? theme.variables.dark : theme.variables.light;

  Object.entries(variables).forEach(([key, value]) => {
    root.style.setProperty(`--${key}`, value);
  });
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
  clearThemeVariables,
  applyTheme,
  applyCustomTheme,
};
