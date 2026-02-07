import {
  useTrackedDataQuery,
  useHourStats,
  useScreenData,
  formatExp,
  calculateExpLeft,
  calculateTotalExpForLevel,
} from '@extension/shared';
import { useEffect, useMemo, useState } from 'react';

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

  const currentSkill = useMemo(() => screenData?.actionText.currentActionText || '', [screenData]);
  const formatHourRange = (hour: number) => {
    const now = new Date();
    const startDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), hour, 0, 0, 0));
    const endDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), hour + 1, 0, 0, 0));

    const startTime = startDate.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
    const sameDay = startDate.toDateString() === endDate.toDateString();
    const endTime = endDate.toLocaleString(
      'en-US',
      sameDay
        ? {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true,
          }
        : {
            month: 'short',
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
            hour12: true,
          },
    );

    return `${startTime} - ${endTime}`;
  };

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

  const skillCards = useMemo(() => {
    const expBySkill = currentHourStats.expBySkill || {};
    const entries = Object.entries(expBySkill);

    if (entries.length === 0) {
      return [] as {
        skill: string;
        expPerHour: string;
        level: number | null;
        subtitle: string;
      }[];
    }

    const hourRange = formatHourRange(currentHour);

    return entries.map(([skill, gainedExp]) => {
      const levelInfo = skillLevels[skill];
      const level = levelInfo?.level ?? null;
      const expPerHour = formatExp(gainedExp);
      const subtitle = level !== null ? `Level ${level} • Exp gained ${hourRange}` : `Exp gained ${hourRange}`;

      return {
        skill,
        expPerHour,
        level,
        subtitle,
      };
    });
  }, [currentHourStats.expBySkill, skillLevels, formatExp, currentHour, formatHourRange]);

  // Separate main skill from other tracked skills for dashboard cards
  const mainSkill = useMemo(() => {
    if (skillCards.length === 0) {
      return null;
    }

    const trimmedCurrentSkill = currentSkill?.trim();
    if (trimmedCurrentSkill) {
      const found = skillCards.find(card => card.skill === trimmedCurrentSkill);
      if (found) {
        return found;
      }
    }

    return skillCards[0];
  }, [skillCards, currentSkill]);

  const otherSkills = useMemo(() => {
    if (!mainSkill) {
      return skillCards.slice(1);
    }

    return skillCards.filter(card => card.skill !== mainSkill.skill);
  }, [skillCards, mainSkill]);

  // Prepare main skill card data
  const mainSkillCard = useMemo(() => {
    if (!mainSkill) return null;

    return {
      skill: mainSkill.skill,
      expPerHour: mainSkill.expPerHour,
      level: mainSkill.level,
      subtitle: mainSkill.subtitle,
    };
  }, [mainSkill]);

  // Trend calculation for main skill card
  const trend = useMemo(() => {
    if (!mainSkillCard?.expPerHour) {
      return undefined;
    }
    const level = mainSkillCard.level ?? 0;
    const expPerHour = Number.parseFloat(mainSkillCard.expPerHour.replace(/,/g, '') || '0');
    const totalExp = calculateTotalExpForLevel(level);
    const expLeft = calculateExpLeft(level, totalExp);
    const percentage = expLeft > 0 ? expPerHour / expLeft : NaN;
    if (Number.isNaN(percentage)) {
      return undefined;
    }
    return {
      value: Number.parseFloat((percentage * 100).toFixed(2)),
      isPositive: expPerHour > 0,
    };
  }, [mainSkillCard?.expPerHour, mainSkillCard?.level]);

  // Prepare other skills card data
  const otherSkillsCards = useMemo(
    () =>
      otherSkills.map(skillData => ({
        skill: skillData.skill,
        expPerHour: skillData.expPerHour,
        level: skillData.level,
        subtitle: skillData.subtitle,
      })),
    [otherSkills],
  );

  // current hour loot card
  const currentHourLootCard = useMemo(() => {
    if (currentHourStats.totalDropValue === 0) {
      return null;
    }
    const value = `${currentHourStats.totalDropValue.toLocaleString(undefined, {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    })} GP`;
    const title = 'Drops';

    return {
      title,
      value,
      subtitle: formatHourRange(currentHour),
      lootItems: currentHourStats.lootItems,
    };
  }, [currentHourStats.totalDropValue, currentHourStats.lootItems, currentHour, formatHourRange]);

  // Prepare previous loot card data
  const previousLootCard = useMemo(() => {
    if (previousHourStats.totalDropValue === 0) {
      return null;
    }

    const value = `${previousHourStats.totalDropValue.toLocaleString(undefined, {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    })} GP`;

    return {
      title: 'Last Hour Drops',
      value,
      subtitle: formatHourRange(previousHour),
      lootItems: previousHourStats.lootItems,
    };
  }, [previousHourStats.totalDropValue, previousHourStats.lootItems, previousHour, formatHourRange]);

  return {
    loading,
    hasAnyData,
    trend,
    mainSkillCard,
    otherSkillsCards,
    previousLootCard,
    currentLootCard: currentHourLootCard,
  };
};
