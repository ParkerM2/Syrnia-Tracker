import type { StatRow } from '../StatTable';

/**
 * Hook for PerformanceCard component
 * Handles any card-specific logic if needed
 */
export const usePerformanceCard = (title: string, rows: StatRow[]) =>
  // Future: Add any card-specific logic here
  // For now, this is a placeholder for consistency with the pattern

  ({
    title,
    rows,
  });
