import { config } from '@dotenvx/dotenvx';
import { resolve } from 'node:path';

const rootDir = resolve(import.meta.dirname, '..');
export const baseEnv = config({ path: resolve(rootDir, '.env') }).parsed ?? {};
export const IS_DEV = process.env['CLI_CEB_DEV'] === 'true';
export const IS_PROD = !IS_DEV;
export const IS_FIREFOX = process.env['CLI_CEB_FIREFOX'] === 'true';
export const IS_CI = process.env['CEB_CI'] === 'true';

export const dynamicEnvValues = {
  CEB_NODE_ENV: IS_DEV ? 'development' : 'production',
} as const;

export default { ...baseEnv, ...dynamicEnvValues } as Record<string, string>;
