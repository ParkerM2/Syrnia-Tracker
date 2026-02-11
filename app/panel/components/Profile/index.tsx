import ProfileCard from "../ProfileCard";
import { cn, Card, CardContent, Badge } from "@app/components";
import { useTrackedDataQuery, useScreenData, useFormatting, useHourlyExp } from "@app/hooks";
import { memo, useMemo, useState } from "react";

/**
 * Normalize skill name for image URL
 * Converts skill name to lowercase for URL matching
 */
const getSkillImageUrl = (skillName: string): string => {
  const normalized = skillName.toLowerCase();
  return `https://www.syrnia.com/images/skills/skills37/${normalized}.jpg`;
};

/**
 * Skill Card Wrapper Component - handles image loading state
 */
const SkillCardWrapper = memo(
  ({
    skill,
    level,
    stats,
    isCurrentSkill,
    formatExp,
    getSkillInfo,
  }: {
    skill: string;
    level: number;
    stats: { gainedExp: number; lastUpdate: string; skillLevel: string; expForNextLevel: string };
    isCurrentSkill: boolean;
    formatExp: (exp: number | string) => string;
    getSkillInfo: (skill: string) => { level: string; expForNextLevel: string };
  }) => {
    const [imageLoaded, setImageLoaded] = useState(false);
    const [imageError, setImageError] = useState(false);
    const skillInfo = getSkillInfo(skill);
    const expForNextLevel = formatExp(skillInfo.expForNextLevel || "0");

    return (
      <Card className={cn(isCurrentSkill && "bg-primary/10 border-primary", "min-w-[200px] flex-1")}>
        <CardContent className="p-4">
          <div className="mb-2 flex items-center gap-2">
            <div className="flex items-center gap-2">
              <img
                src={getSkillImageUrl(skill)}
                alt={`${skill}${level > 0 ? ` - Level ${level}` : ""}`}
                className="h-10 w-10 rounded object-cover"
                onLoad={() => setImageLoaded(true)}
                onError={e => {
                  setImageError(true);
                  // Hide image if it fails to load
                  (e.target as HTMLImageElement).style.display = "none";
                }}
              />
              {level > 0 && <span className="text-base font-bold">{level}</span>}
            </div>
            <div className="flex flex-1 items-center justify-end gap-2">
              {(!imageLoaded || imageError) && <span className="mr-auto text-base font-semibold">{skill}</span>}
              <span className="text-base font-semibold text-green-500">+{formatExp(stats.gainedExp)}</span>
              {isCurrentSkill && (
                <Badge className="border-slate-300 bg-slate-200 text-slate-900 dark:border-slate-300 dark:bg-slate-200 dark:text-slate-900">
                  Current
                </Badge>
              )}
            </div>
          </div>
          <div className="flex flex-col gap-1 text-left text-sm">
            <div>
              <span className="text-muted-foreground">Current Exp: </span>
              <span className="font-semibold text-green-500">+{formatExp(stats.gainedExp)}</span>
            </div>
            {expForNextLevel !== "0" && (
              <div>
                <span className="text-muted-foreground">Exp Left: </span>
                <span className="font-semibold">{expForNextLevel}</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  },
);
SkillCardWrapper.displayName = "SkillCardWrapper";

/**
 * Profile component - displays user profile information
 * This is a dedicated tab view for the profile section
 */
const Profile = memo(() => {
  const { dataByHour, loading } = useTrackedDataQuery();
  const screenData = useScreenData();
  const { formatExp } = useFormatting();
  const hourlyExp = useHourlyExp();

  // Get current hour data for calculating skill stats
  const currentHour = useMemo(() => hourlyExp?.currentHour ?? new Date().getHours(), [hourlyExp?.currentHour]);
  const now = useMemo(() => new Date(), []);
  const currentHourData = useMemo(() => {
    try {
      if (!dataByHour || currentHour === undefined || currentHour === null) {
        return [];
      }
      const data = dataByHour(currentHour, now);
      if (!Array.isArray(data)) {
        return [];
      }
      return [...data].sort((a, b) => new Date(a?.timestamp || 0).getTime() - new Date(b?.timestamp || 0).getTime());
    } catch {
      return [];
    }
  }, [dataByHour, currentHour, now]);

  // Calculate stats per skill for current hour (level, expForNextLevel, and use hourlyExp for gained exp)
  const skillStats = useMemo(() => {
    const stats: Record<
      string,
      {
        gainedExp: number; // Current hour exp from hourlyExp hook
        lastUpdate: string;
        skillLevel: string;
        expForNextLevel: string;
      }
    > = {};

    // Use hourlyExp.expBySkill for current hour exp (this is the source of truth)
    Object.entries(hourlyExp?.expBySkill || {}).forEach(([skill, exp]) => {
      stats[skill] = {
        gainedExp: exp || 0,
        lastUpdate: "",
        skillLevel: "",
        expForNextLevel: "",
      };
    });

    // Get level and expForNextLevel from current hour data
    currentHourData.forEach(row => {
      const skill = row.skill || "Unknown";
      const skillLevel = row.skillLevel || "";
      const expForNextLevel = row.expForNextLevel || "";

      if (!stats[skill]) {
        stats[skill] = {
          gainedExp: hourlyExp?.expBySkill[skill] || 0,
          lastUpdate: row.timestamp,
          skillLevel: skillLevel,
          expForNextLevel: expForNextLevel,
        };
      }

      const rowTime = new Date(row.timestamp).getTime();
      const statsTime = stats[skill].lastUpdate ? new Date(stats[skill].lastUpdate).getTime() : 0;

      if (rowTime > statsTime) {
        stats[skill].lastUpdate = row.timestamp;
        if (skillLevel) stats[skill].skillLevel = skillLevel;
        if (expForNextLevel) stats[skill].expForNextLevel = expForNextLevel;
      } else {
        if (skillLevel && !stats[skill].skillLevel) stats[skill].skillLevel = skillLevel;
        if (expForNextLevel && !stats[skill].expForNextLevel) stats[skill].expForNextLevel = expForNextLevel;
      }
    });

    return stats;
  }, [hourlyExp?.expBySkill, currentHourData]);

  // Determine the current skill
  const currentSkill = useMemo(() => {
    const screenSkill = screenData?.actionText.currentActionText || "";
    const mostRecentEntry = currentHourData
      .filter(row => {
        const skill = row.skill || "";
        return (hourlyExp?.expBySkill[skill] || 0) > 0;
      })
      .sort((a, b) => new Date(b?.timestamp || 0).getTime() - new Date(a?.timestamp || 0).getTime())[0];
    return screenSkill || mostRecentEntry?.skill || "";
  }, [screenData, currentHourData, hourlyExp?.expBySkill]);

  // Get level and expForNextLevel from screen data if available, otherwise use tracked data
  const getSkillInfo = (skill: string) => {
    const isCurrentSkill = skill === currentSkill;
    const trackedInfo = skillStats[skill];

    if (isCurrentSkill && screenData?.actionText.currentActionText === skill) {
      return {
        level: screenData?.actionText.skillLevel || trackedInfo?.skillLevel || "",
        expForNextLevel: screenData?.actionText.expForNextLevel || trackedInfo?.expForNextLevel || "",
      };
    }

    return {
      level: trackedInfo?.skillLevel || "",
      expForNextLevel: trackedInfo?.expForNextLevel || "",
    };
  };

  // Get list of all tracked skills for current hour, sorted by exp gained (highest first)
  const trackedSkills = Object.entries(skillStats)
    .filter(([, stats]) => stats.gainedExp > 0) // Only show skills with exp this hour
    .sort((a, b) => b[1].gainedExp - a[1].gainedExp); // Sort by exp gained (highest first)

  if (loading) {
    return (
      <div className="flex flex-col gap-4">
        <div className={cn("p-4 text-lg font-semibold")}>Loading tracked data...</div>
        <ProfileCard />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Skill Stats - Show all tracked skills - Moved from Stats tab */}
      {trackedSkills.length > 0 && (
        <div className="flex flex-wrap gap-3">
          {trackedSkills.map(([skill, stats]) => {
            const isCurrentSkill = skill === currentSkill;
            const skillInfo = getSkillInfo(skill);
            const level = skillInfo.level ? parseInt(skillInfo.level, 10) : 0;

            return (
              <SkillCardWrapper
                key={skill}
                skill={skill}
                level={level}
                stats={stats}
                isCurrentSkill={isCurrentSkill}
                formatExp={formatExp}
                getSkillInfo={getSkillInfo}
              />
            );
          })}
        </div>
      )}

      <ProfileCard />
    </div>
  );
});

Profile.displayName = "Profile";

export default Profile;
