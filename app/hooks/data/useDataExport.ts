/**
 * Hook for exporting data as CSV
 *
 * Provides unified CSV export functionality for all data types.
 */

import {
  downloadTrackedDataCSV,
  downloadUserStatsCSV,
  downloadWeeklyStatsCSV,
  downloadAllDataCSV,
} from "../../utils/storage-service";
import { useState } from "react";

export type ExportType = "tracked" | "userStats" | "weeklyStats" | "all";

export interface UseDataExportResult {
  exportData: (type: ExportType, saveAs?: boolean) => Promise<void>;
  isExporting: boolean;
  error: Error | null;
}

/**
 * Hook for exporting data as CSV
 */
export const useDataExport = (): UseDataExportResult => {
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const exportData = async (type: ExportType, saveAs: boolean = true) => {
    setIsExporting(true);
    setError(null);

    try {
      switch (type) {
        case "tracked":
          await downloadTrackedDataCSV(saveAs);
          break;
        case "userStats":
          await downloadUserStatsCSV(saveAs);
          break;
        case "weeklyStats":
          await downloadWeeklyStatsCSV(saveAs);
          break;
        case "all":
          await downloadAllDataCSV(saveAs);
          break;
        default:
          throw new Error(`Unknown export type: ${type}`);
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error("Failed to export data");
      setError(error);
      throw error;
    } finally {
      setIsExporting(false);
    }
  };

  return {
    exportData,
    isExporting,
    error,
  };
};
