import { SKILL_COLORS, TIME_FRAME_OPTIONS } from "@app/constants";
import { useTrackedDataQuery } from "@app/hooks";
import { useMemo } from "react";
import type { CSVRow, ChartDataPoint, ChartDataResult, TimeFrame } from "@app/types";

/**
 * Get interval minutes based on timeframe
 */
const getIntervalMinutes = (timeFrame: TimeFrame): number => {
  switch (timeFrame) {
    case "6h":
      return 30; // 30 minute intervals for 6 hours (12 data points)
    case "12h":
      return 60; // 1 hour intervals for 12 hours (12 data points)
    case "24h":
      return 60; // 1 hour intervals for 24 hours (24 data points)
    case "7d":
      return 6 * 60; // 6 hour intervals for 7 days (28 data points)
    case "30d":
      return 24 * 60; // 1 day intervals for 30 days (30 data points)
    case "90d":
      return 3 * 24 * 60; // 3 day intervals for 90 days (30 data points)
    default:
      return 60; // Default to 1 hour
  }
};

interface UseChartDataParams {
  timeFrame: TimeFrame;
  selectedSkills: Set<string>;
}

export const useChartData = ({ timeFrame, selectedSkills }: UseChartDataParams): ChartDataResult => {
  const { allData } = useTrackedDataQuery();

  return useMemo(() => {
    // Only use tracked hourly data - no profile stats
    if (!allData || allData.length === 0) {
      return { chartData: [], chartConfig: {}, skillTotals: {}, allAvailableSkills: [], timeFrame };
    }

    // Filter by time frame
    // For 24h, show all available hourly data (or last 24 hours if we have more)
    const now = new Date().getTime();
    let cutoffTime: number;

    if (timeFrame === "24h") {
      // For 24h, show all available data or last 24 hours, whichever is less
      const timeFrameHours = 24;
      cutoffTime = now - timeFrameHours * 60 * 60 * 1000;
    } else {
      const timeFrameHours =
        TIME_FRAME_OPTIONS.find(opt => opt.value === timeFrame)?.hours || (timeFrame === "90d" ? 2160 : 24);
      cutoffTime = now - timeFrameHours * 60 * 60 * 1000;
    }

    const filteredData = allData.filter((row: CSVRow) => {
      const timestamp = new Date(row.timestamp).getTime();
      return timestamp >= cutoffTime;
    });

    // Deduplicate entries: one entry per timestamp+skill (keep the one with highest gainedExp or most complete data)
    // This prevents duplicate data from appearing in charts
    const uniqueEntriesMap = new Map<string, CSVRow>();
    filteredData.forEach((row: CSVRow) => {
      const skill = row.skill || "Unknown";
      const key = `${row.timestamp}-${skill}`;
      const existing = uniqueEntriesMap.get(key);

      if (!existing) {
        uniqueEntriesMap.set(key, row);
      } else {
        // Keep the one with higher gainedExp or more complete data
        const existingGainedExp = parseInt(existing.gainedExp || "0", 10) || 0;
        const currentGainedExp = parseInt(row.gainedExp || "0", 10) || 0;
        if (currentGainedExp > existingGainedExp || (currentGainedExp === existingGainedExp && row.skillLevel)) {
          uniqueEntriesMap.set(key, row);
        }
      }
    });

    // Sort by timestamp
    const sortedData = Array.from(uniqueEntriesMap.values()).sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
    );

    // Group by time intervals
    const timeIntervalMap = new Map<string, Map<string, number>>();
    const timeStamps = new Map<string, number>();

    // Get interval based on timeframe
    const intervalMinutes = getIntervalMinutes(timeFrame);

    sortedData.forEach((row: CSVRow) => {
      const timestamp = new Date(row.timestamp).getTime();
      const date = new Date(timestamp);

      // For 24h timeframe, group by exact hour (round down to hour)
      // For other timeframes, use the interval-based grouping
      let intervalKey: string;
      if (timeFrame === "24h") {
        // Round down to the exact hour
        date.setMinutes(0, 0, 0);
        intervalKey = date.toISOString();
      } else {
        // Round down to the nearest interval
        const totalMinutes = date.getHours() * 60 + date.getMinutes();
        const roundedTotalMinutes = Math.floor(totalMinutes / intervalMinutes) * intervalMinutes;
        date.setHours(Math.floor(roundedTotalMinutes / 60));
        date.setMinutes(roundedTotalMinutes % 60, 0, 0);
        intervalKey = date.toISOString();
      }

      const gainedExp = parseInt(row.gainedExp || "0", 10) || 0;
      const skill = row.skill || "Unknown";

      if (gainedExp > 0 && skill) {
        if (!timeIntervalMap.has(intervalKey)) {
          timeIntervalMap.set(intervalKey, new Map());
          timeStamps.set(intervalKey, timestamp);
        }

        const skillMap = timeIntervalMap.get(intervalKey)!;
        skillMap.set(skill, (skillMap.get(skill) || 0) + gainedExp);

        const existingTimestamp = timeStamps.get(intervalKey)!;
        if (timestamp < existingTimestamp) {
          timeStamps.set(intervalKey, timestamp);
        }
      }
    });

    // Get all unique skills from tracked data only
    const allSkills = new Set<string>();
    timeIntervalMap.forEach(skillMap => {
      skillMap.forEach((_, skill) => allSkills.add(skill));
    });

    // Filter skills based on selection
    const skillsToShow =
      selectedSkills.size > 0
        ? Array.from(allSkills).filter(skill => selectedSkills.has(skill))
        : Array.from(allSkills);

    // Convert to array and sort by timestamp
    const intervals = Array.from(timeIntervalMap.entries())
      .map(([key, skillMap]) => ({
        key,
        timestamp: timeStamps.get(key)!,
        skills: Object.fromEntries(skillMap),
      }))
      .sort((a, b) => a.timestamp - b.timestamp);

    // Calculate gained exp per interval (not cumulative)
    const chartPoints: Array<Record<string, string | number>> = [];
    const totalsBySkill = new Map<string, number>();

    // Calculate tracked totals per skill for comparison with stats URL
    const trackedTotalsBySkill = new Map<string, number>();
    intervals.forEach(interval => {
      skillsToShow.forEach(skill => {
        const expGain = interval.skills[skill] || 0;
        const currentTotal = trackedTotalsBySkill.get(skill) || 0;
        trackedTotalsBySkill.set(skill, currentTotal + expGain);
      });
    });

    // Calculate hours per interval for exp/hr calculation
    const hoursPerInterval = intervalMinutes / 60;

    intervals.forEach(interval => {
      const point: Record<string, string | number> = {
        date: new Date(interval.timestamp).toISOString(),
      };

      skillsToShow.forEach(skill => {
        const expGain = interval.skills[skill] || 0;
        // Calculate exp per hour: divide exp gained by hours in interval
        const expPerHour = hoursPerInterval > 0 ? expGain / hoursPerInterval : expGain;
        point[skill] = Math.round(expPerHour);

        // Track total for tooltip/display purposes
        const currentTotal = totalsBySkill.get(skill) || 0;
        totalsBySkill.set(skill, currentTotal + expGain);
      });

      chartPoints.push(point);
    });

    // Create chart config
    const config: Record<string, { label: string; color: string }> = {};
    const totals: Record<string, number> = {};

    skillsToShow.forEach((skill, index) => {
      const total = totalsBySkill.get(skill) || 0;
      totals[skill] = total;
      config[skill] = {
        label: skill,
        color: SKILL_COLORS[index % SKILL_COLORS.length],
      };
    });

    return {
      chartData: chartPoints as ChartDataPoint[],
      chartConfig: config,
      skillTotals: totals,
      allAvailableSkills: Array.from(allSkills).sort(),
      timeFrame,
    };
  }, [allData, timeFrame, selectedSkills]);
};
