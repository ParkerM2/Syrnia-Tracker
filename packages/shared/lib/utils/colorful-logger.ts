import type { ColorType } from './types.js';

/**
 * Logging utility (no-op in production)
 * Maintains API compatibility but produces no console output
 */
export const colorfulLog = (_message: string, _type: ColorType): void => {
  // No-op: all console logging removed for production
  void _message;
  void _type;
};
