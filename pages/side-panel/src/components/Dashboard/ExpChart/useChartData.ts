import { TIME_FRAME_OPTIONS, SKILL_COLORS } from './constants';
import { useTrackedDataQuery, useUserStatsQuery } from '@extension/shared';
import { useMemo } from 'react';
import type { TimeFrame, ChartDataPoint, ChartDataResult } from './types';
import type { CSVRow } from '@extension/shared';

/**
 * Get interval minutes based on timeframe
 */
const getIntervalMinutes = (timeFrame: TimeFrame): number => {
  switch (timeFrame) {
    case '6h':
      return 30; // 30 minute intervals for 6 hours (12 data points)
    case '12h':
      return 60; // 1 hour intervals for 12 hours (12 data points)
    case '24h':
      return 60; // 1 hour intervals for 24 hours (24 data points)
    case '7d':
      return 6 * 60; // 6 hour intervals for 7 days (28 data points)
    case '30d':
      return 24 * 60; // 1 day intervals for 30 days (30 data points)
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
  const { userStats } = useUserStatsQuery();

  return useMemo(() => {
    // Get weekly exp from stats URL (source of truth)
    const weeklyExpFromStats: Record<string, number> = {};
    if (userStats?.skills) {
      Object.values(userStats.skills).forEach(skillStat => {
        if (skillStat.gainedThisWeek) {
          const exp = parseInt(skillStat.gainedThisWeek.replace(/,/g, ''), 10) || 0;
          if (exp > 0) {
            weeklyExpFromStats[skillStat.skill] = exp;
          }
        }
      });
    }

    if (!allData || allData.length === 0) {
      // If no tracked data, but we have weekly stats from URL, create a summary point
      if (Object.keys(weeklyExpFromStats).length > 0 && (timeFrame === '7d' || timeFrame === '30d')) {
        const now = new Date();
        const summaryPoint: Record<string, string | number> = {
          date: now.toISOString(),
        };

        const skillsFromStats = Object.keys(weeklyExpFromStats).sort();
        const config: Record<string, { label: string; color: string }> = {};
        const totals: Record<string, number> = {};

        skillsFromStats.forEach((skill, index) => {
          const exp = weeklyExpFromStats[skill];
          summaryPoint[skill] = exp;
          totals[skill] = exp;
          config[skill] = {
            label: skill,
            color: SKILL_COLORS[index % SKILL_COLORS.length],
          };
        });

        return {
          chartData: [summaryPoint] as ChartDataPoint[],
          chartConfig: config,
          skillTotals: totals,
          allAvailableSkills: skillsFromStats,
          timeFrame,
        };
      }

      return { chartData: [], chartConfig: {}, skillTotals: {}, allAvailableSkills: [], timeFrame };
    }

    // Filter by time frame
    const now = new Date().getTime();
    const timeFrameHours = TIME_FRAME_OPTIONS.find(opt => opt.value === timeFrame)?.hours || 24;
    const cutoffTime = now - timeFrameHours * 60 * 60 * 1000;

    const filteredData = allData.filter((row: CSVRow) => {
      const timestamp = new Date(row.timestamp).getTime();
      return timestamp >= cutoffTime;
    });

    // Deduplicate entries: one entry per timestamp+skill (keep the one with highest gainedExp or most complete data)
    // This prevents duplicate data from appearing in charts
    const uniqueEntriesMap = new Map<string, CSVRow>();
    filteredData.forEach((row: CSVRow) => {
      const skill = row.skill || 'Unknown';
      const key = `${row.timestamp}-${skill}`;
      const existing = uniqueEntriesMap.get(key);

      if (!existing) {
        uniqueEntriesMap.set(key, row);
      } else {
        // Keep the one with higher gainedExp or more complete data
        const existingGainedExp = parseInt(existing.gainedExp || '0', 10) || 0;
        const currentGainedExp = parseInt(row.gainedExp || '0', 10) || 0;
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

      // Round down to the nearest interval
      const totalMinutes = date.getHours() * 60 + date.getMinutes();
      const roundedTotalMinutes = Math.floor(totalMinutes / intervalMinutes) * intervalMinutes;
      date.setHours(Math.floor(roundedTotalMinutes / 60));
      date.setMinutes(roundedTotalMinutes % 60, 0, 0);

      const intervalKey = date.toISOString();
      const gainedExp = parseInt(row.gainedExp || '0', 10) || 0;
      const skill = row.skill || 'Unknown';

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

    // Get all unique skills from tracked data
    const allSkills = new Set<string>();
    timeIntervalMap.forEach(skillMap => {
      skillMap.forEach((_, skill) => allSkills.add(skill));
    });

    // Also include skills from stats URL that might not be in tracked data
    Object.keys(weeklyExpFromStats).forEach(skill => allSkills.add(skill));

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

    intervals.forEach(interval => {
      const point: Record<string, string | number> = {
        date: new Date(interval.timestamp).toISOString(),
      };

      skillsToShow.forEach(skill => {
        const expGain = interval.skills[skill] || 0;
        // Use gained exp for this interval directly (not cumulative)
        point[skill] = expGain;

        // Track total for tooltip/display purposes
        const currentTotal = totalsBySkill.get(skill) || 0;
        totalsBySkill.set(skill, currentTotal + expGain);
      });

      chartPoints.push(point);
    });

    // For weekly timeframes, use stats URL as source of truth for totals
    // Stats URL weekly values fill in gaps where tracked data is missing
    // IMPORTANT: We use stats URL for totals, but don't modify chart points to avoid duplication
    if (timeFrame === '7d' || timeFrame === '30d') {
      skillsToShow.forEach(skill => {
        const weeklyExp = weeklyExpFromStats[skill] || 0;
        const trackedTotal = trackedTotalsBySkill.get(skill) || 0;

        // Stats URL is the source of truth - use it for totals when available
        if (weeklyExp > 0) {
          // Use stats URL value as the total (it's the authoritative source)
          totalsBySkill.set(skill, weeklyExp);

          // Only add to chart points if we have NO tracked data for this skill
          // This ensures we show the skill in the chart even if we didn't track it
          if (trackedTotal === 0 && chartPoints.length > 0) {
            const lastPoint = chartPoints[chartPoints.length - 1];
            // Only set if not already set to avoid overwriting tracked data
            if (!lastPoint[skill] || Number(lastPoint[skill]) === 0) {
              // Add the weekly exp to the last point so the skill appears in the chart
              // This represents the "missing" exp that we didn't track but exists in stats URL
              lastPoint[skill] = weeklyExp;
            }
          }
          // If trackedTotal > 0, we keep the tracked data in chart points
          // The totals will show the stats URL value (which may be higher)
          // This way we don't duplicate data - chart shows tracked intervals, totals show stats URL truth
        }
      });
    }

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
  }, [allData, timeFrame, selectedSkills, userStats]);
};
