import uiConfig from '../tailwind.config';
import deepmerge from 'deepmerge';
import type { Config } from 'tailwindcss';

export const withUI = (tailwindConfig: Config): Config =>
  deepmerge(deepmerge(tailwindConfig, uiConfig as Config), {
    content: ['../../packages/ui/lib/**/*.tsx'],
  });
