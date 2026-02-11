import { useTrackedDataQuery, useHourStats, useScreenData } from "@app/hooks";
import { calculateExpForNextLevel, formatExp } from "@app/utils";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { HourLootItem } from "@app/hooks/stats/useHourStats";

export interface SkillBadgeData {
  skill: string;
  exp: number;
  formattedExp: string;
  level: number | null;
  isMainSkill: boolean;
}

export interface HourCardData {
  label: string;
  timeRange: string;
  skills: SkillBadgeData[];
  lootItems: HourLootItem[];
  totalDropValue: number;
  hpValue: number;
  netProfit: number;
  totalFights: number;
  totalSkillingActions: number;
  producedItems: Array<{ name: string; imageUrl: string; quantity: number }>;
  trend?: { value: number; isPositive: boolean };
}

/**
 * Custom hook for Dashboard component
 * Handles all business logic, state, and data processing
 */
export const useDashboard = () => {
  const { loading, allData } = useTrackedDataQuery();
  const screenData = useScreenData();

  // Get current hour - ensure it updates when hour changes
  const [currentHour, setCurrentHour] = useState(() => new Date().getUTCHours());

  useEffect(() => {
    const updateHour = () => {
      const hour = new Date().getUTCHours();
      setCurrentHour(prev => (prev === hour ? prev : hour));
    };

    updateHour();
    const interval = setInterval(updateHour, 60000);
    return () => clearInterval(interval);
  }, []);

  const previousHour = useMemo(() => (currentHour === 0 ? 23 : currentHour - 1), [currentHour]);

  const currentHourStats = useHourStats(currentHour);
  const previousHourStats = useHourStats(previousHour);

  const currentSkill = useMemo(() => screenData?.actionText.currentActionText || "", [screenData]);
  const formatHourRange = useCallback((hour: number) => {
    const now = new Date();
    const startDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), hour, 0, 0, 0));
    const endDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), hour + 1, 0, 0, 0));

    const startTime = startDate.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
    const sameDay = startDate.toDateString() === endDate.toDateString();
    const endTime = endDate.toLocaleString(
      "en-US",
      sameDay
        ? {
            hour: "numeric",
            minute: "2-digit",
            hour12: true,
          }
        : {
            month: "short",
            day: "numeric",
            hour: "numeric",
            minute: "2-digit",
            hour12: true,
          },
    );

    return `${startTime} - ${endTime}`;
  }, []);

  const skillLevels = useMemo(() => {
    const levels: Record<string, { level: number | null }> = {};

    if (!screenData) {
      return levels;
    }

    const { actionText } = screenData;
    const mainSkillName = actionText.currentActionText?.trim();

    if (mainSkillName) {
      const parsedLevel = actionText.skillLevel ? parseInt(actionText.skillLevel, 10) : NaN;
      levels[mainSkillName] = {
        level: Number.isNaN(parsedLevel) ? null : parsedLevel,
      };
    }

    (actionText.combatExp || []).forEach(gain => {
      const skillName = gain.skill?.trim();
      if (!skillName) return;

      const parsedLevel = gain.skillLevel ? parseInt(gain.skillLevel, 10) : NaN;
      levels[skillName] = {
        level: Number.isNaN(parsedLevel) ? null : parsedLevel,
      };
    });

    return levels;
  }, [screenData]);

  // Check if there's any data at all
  const hasAnyData = useMemo(() => allData && allData.length > 0, [allData]);

  // Build consolidated current hour data
  const currentHourData = useMemo<HourCardData | null>(() => {
    const expBySkill = currentHourStats.expBySkill || {};
    const entries = Object.entries(expBySkill);
    const hasLoot = currentHourStats.lootItems.length > 0;

    if (entries.length === 0 && !hasLoot) {
      return null;
    }

    const trimmedCurrentSkill = currentSkill?.trim();

    const skills: SkillBadgeData[] = entries.map(([skill, exp]) => {
      const levelInfo = skillLevels[skill];
      return {
        skill,
        exp,
        formattedExp: `+${formatExp(exp)}`,
        level: levelInfo?.level ?? null,
        isMainSkill: trimmedCurrentSkill ? skill === trimmedCurrentSkill : false,
      };
    });

    // If no skill matched currentSkill, mark the first one as main
    if (skills.length > 0 && !skills.some(s => s.isMainSkill)) {
      skills[0].isMainSkill = true;
    }

    // Calculate trend for main skill
    const mainSkillData = skills.find(s => s.isMainSkill);
    let trend: HourCardData["trend"];
    if (mainSkillData && mainSkillData.level !== null && mainSkillData.exp > 0) {
      const expForNext = calculateExpForNextLevel(mainSkillData.level);
      if (expForNext > 0) {
        trend = {
          value: Number.parseFloat(((mainSkillData.exp / expForNext) * 100).toFixed(2)),
          isPositive: true,
        };
      }
    }

    return {
      label: "Current Hour",
      timeRange: formatHourRange(currentHour),
      skills,
      lootItems: currentHourStats.lootItems,
      totalDropValue: currentHourStats.totalDropValue,
      hpValue: currentHourStats.hpValue,
      netProfit: currentHourStats.netProfit,
      totalFights: currentHourStats.totalFights,
      totalSkillingActions: currentHourStats.totalSkillingActions,
      producedItems: Object.entries(currentHourStats.itemsProduced).map(([name, data]) => ({
        name,
        imageUrl: `https://www.syrnia.com/images/inventory/${name.replace(/\s/g, "%20")}.png`,
        quantity: data.quantity,
      })),
      trend,
    };
  }, [currentHourStats, currentSkill, skillLevels, currentHour, formatHourRange]);

  // Build consolidated previous hour data
  const previousHourData = useMemo<HourCardData | null>(() => {
    const expBySkill = previousHourStats.expBySkill || {};
    const entries = Object.entries(expBySkill);
    const hasLoot = previousHourStats.lootItems.length > 0;

    if (entries.length === 0 && !hasLoot) {
      return null;
    }

    const trimmedCurrentSkill = currentSkill?.trim();

    const skills: SkillBadgeData[] = entries.map(([skill, exp]) => {
      const levelInfo = skillLevels[skill];
      return {
        skill,
        exp,
        formattedExp: `+${formatExp(exp)}`,
        level: levelInfo?.level ?? null,
        isMainSkill: trimmedCurrentSkill ? skill === trimmedCurrentSkill : false,
      };
    });

    if (skills.length > 0 && !skills.some(s => s.isMainSkill)) {
      skills[0].isMainSkill = true;
    }

    return {
      label: "Previous Hour",
      timeRange: formatHourRange(previousHour),
      skills,
      lootItems: previousHourStats.lootItems,
      totalDropValue: previousHourStats.totalDropValue,
      hpValue: previousHourStats.hpValue,
      netProfit: previousHourStats.netProfit,
      totalFights: previousHourStats.totalFights,
      totalSkillingActions: previousHourStats.totalSkillingActions,
      producedItems: Object.entries(previousHourStats.itemsProduced).map(([name, data]) => ({
        name,
        imageUrl: `https://www.syrnia.com/images/inventory/${name.replace(/\s/g, "%20")}.png`,
        quantity: data.quantity,
      })),
    };
  }, [previousHourStats, currentSkill, skillLevels, previousHour, formatHourRange]);

  return {
    loading,
    hasAnyData,
    currentHourData,
    previousHourData,
  };
};
