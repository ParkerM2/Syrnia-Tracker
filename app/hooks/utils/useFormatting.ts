import { formatExp, formatTime, parseDrops, parseDropAmount } from "../../utils/formatting";
import { useMemo } from "react";

/**
 * Hook providing formatting utilities
 * Memoized for performance
 */
export const useFormatting = () =>
  useMemo(
    () => ({
      formatExp,
      formatTime,
      parseDrops,
      parseDropAmount,
    }),
    [],
  );
