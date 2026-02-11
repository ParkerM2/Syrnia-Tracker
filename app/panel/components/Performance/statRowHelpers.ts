import type { StatRow } from "./StatTable";

/**
 * Helper functions for building stat rows
 * Provides composition utilities for creating table rows
 */

export const createStatRow = (
  label: string,
  value: number | string,
  options?: {
    format?: (value: number | string) => string;
    className?: string;
    showIfZero?: boolean;
  },
): StatRow => ({
  label,
  value,
  format: options?.format,
  className: options?.className,
  showIfZero: options?.showIfZero,
});

export const createNumberStatRow = (
  label: string,
  value: number | undefined | null,
  options?: {
    round?: boolean;
    decimals?: number;
    className?: string;
    showIfZero?: boolean;
  },
): StatRow => {
  const safeValue = value ?? 0;
  const format = (val: number | string) => {
    if (typeof val === "number") {
      if (val > 0) {
        if (options?.round) {
          return Math.round(val).toLocaleString();
        }
        if (options?.decimals !== undefined) {
          return val.toFixed(options.decimals);
        }
        return val.toLocaleString();
      }
      return "—";
    }
    return val || "—";
  };

  return createStatRow(label, safeValue, {
    format,
    className: options?.className,
    showIfZero: options?.showIfZero,
  });
};

export const createDamageStatRow = (
  label: string,
  value: number | undefined | null,
  options?: {
    round?: boolean;
    showIfZero?: boolean;
  },
): StatRow => {
  const safeValue = value ?? 0;
  const className = safeValue > 0 ? "text-red-500" : "text-foreground";

  return createNumberStatRow(label, safeValue, {
    round: options?.round,
    className,
    showIfZero: options?.showIfZero,
  });
};
