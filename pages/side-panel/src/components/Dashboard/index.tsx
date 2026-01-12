import {
  useHourlyExp,
  useTrackedDataQuery,
  useHourStats,
  useFormatting,
  useScreenData,
  useItemValuesQuery,
  useUserStatsQuery,
} from '@extension/shared';
import { cn, Card, CardContent, CardHeader, CardTitle, Badge } from '@extension/ui';
import { useMemo, memo, useState } from 'react';

/**
 * Normalize skill name for image URL
 * Converts skill name to lowercase for URL matching
 */
const getSkillImageUrl = (skillName: string): string => {
  const normalized = skillName.toLowerCase();
  return `https://www.syrnia.com/images/skills/skills37/${normalized}.jpg`;
};

// Component for drop badge with image fallback
const DropBadge = memo(
  ({
    name,
    imageUrl,
    stats,
    totalValue,
  }: {
    name: string;
    imageUrl: string;
    stats: { count: number; totalAmount: number };
    totalValue: number;
  }) => {
    const [imageError, setImageError] = useState(false);

    return (
      <Badge
        variant="secondary"
        className="border-border/50 relative flex items-center gap-1.5 px-4 py-2 text-xs font-medium">
        <div className="relative">
          {!imageError ? (
            <img src={imageUrl} alt={name} className="h-8 w-8 object-contain" onError={() => setImageError(true)} />
          ) : (
            <div className="bg-muted flex h-8 w-8 items-center justify-center rounded">
              <span className="truncate text-[10px] font-medium">{name}</span>
            </div>
          )}
          {/* Total amount badge on top left of image */}
          <span className="text-foreground absolute -left-1 -top-1 text-[10px] font-bold drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
            {stats.totalAmount.toLocaleString()}
          </span>
        </div>
        <span className="sr-only">{name}</span>
        <span className="font-bold text-green-500">
          +
          {totalValue.toLocaleString(undefined, {
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
          })}{' '}
          GP
        </span>
      </Badge>
    );
  },
);

DropBadge.displayName = 'DropBadge';

/**
 * Dashboard Skill Card Component - handles image loading state
 */
const DashboardSkillCard = memo(
  ({
    skill,
    level,
    gainedExp,
    weeklyExp,
    formatExp,
  }: {
    skill: string;
    level: number;
    gainedExp: number;
    weeklyExp: number | null;
    formatExp: (exp: number | string) => string;
  }) => {
    const [imageLoaded, setImageLoaded] = useState(false);
    const [imageError, setImageError] = useState(false);

    return (
      <div className="hover:bg-accent flex flex-col rounded-lg border p-3 transition-colors">
        {/* Header: Image, Level, Skill Name, +Hour, +Week */}
        <div className="mb-2 flex items-center gap-2">
          <div className="flex items-center gap-2">
            <img
              src={getSkillImageUrl(skill)}
              alt={`${skill}${level > 0 ? ` - Level ${level}` : ''}`}
              className="h-8 w-8 flex-shrink-0 rounded object-cover"
              onLoad={() => setImageLoaded(true)}
              onError={e => {
                setImageError(true);
                // Hide image if it fails to load
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
            {level > 0 && <span className="text-sm font-bold">{level}</span>}
          </div>
          <div className="flex flex-1 items-center justify-end gap-2">
            {(!imageLoaded || imageError) && <span className="mr-auto text-sm font-semibold">{skill}</span>}
            <div className="flex flex-col items-end gap-0.5">
              {gainedExp > 0 && <span className="text-xs font-semibold text-green-500">+{formatExp(gainedExp)}</span>}
              {weeklyExp !== null && weeklyExp > 0 && (
                <span className="text-[10px] font-semibold text-blue-500">+{formatExp(weeklyExp)}</span>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  },
);
DashboardSkillCard.displayName = 'DashboardSkillCard';

const Dashboard = memo(() => {
  const hourlyExp = useHourlyExp();
  const { loading, dataByHour } = useTrackedDataQuery();
  const { formatExp, parseDrops, parseDropAmount } = useFormatting();
  const screenData = useScreenData();
  const { itemValues } = useItemValuesQuery();
  const { userStats } = useUserStatsQuery();

  // Get current hour - ensure it updates when hour changes
  const currentHour = useMemo(() => hourlyExp?.currentHour ?? new Date().getHours(), [hourlyExp?.currentHour]); // currentHour dependency is needed to trigger recalculation

  const previousHour = useMemo(() => (currentHour === 0 ? 23 : currentHour - 1), [currentHour]);

  // Use the reusable hook for hour stats
  // Note: useHourStats will recalculate when dataByHour changes (when new data is added)
  const currentHourStats = useHourStats(currentHour);
  const previousHourStats = useHourStats(previousHour);

  // Debug logging
  useMemo(() => {
    console.log('[Dashboard] Current hour stats:', {
      currentHour,
      totalExp: currentHourStats.totalExp,
      skillCount: Object.keys(currentHourStats.expBySkill).length,
      dropCount: Object.keys(currentHourStats.dropStats).length,
      hasHP: !!currentHourStats.hpUsed,
    });
  }, [currentHour, currentHourStats]);

  // Get hour data for calculating skill stats
  const currentHourData = useMemo(() => {
    try {
      if (!dataByHour || currentHour === undefined || currentHour === null) {
        return [];
      }
      const now = new Date();
      const data = dataByHour(currentHour, now);
      if (!Array.isArray(data)) {
        return [];
      }
      return [...data].sort((a, b) => new Date(a?.timestamp || 0).getTime() - new Date(b?.timestamp || 0).getTime());
    } catch (error) {
      console.error('[Dashboard] Error processing current hour data:', error);
      return [];
    }
  }, [dataByHour, currentHour]);

  const previousHourData = useMemo(() => {
    try {
      if (!dataByHour || previousHour === undefined || previousHour === null) {
        return [];
      }
      const now = new Date();
      const data = dataByHour(previousHour, now);
      if (!Array.isArray(data)) {
        return [];
      }
      return [...data].sort((a, b) => new Date(a?.timestamp || 0).getTime() - new Date(b?.timestamp || 0).getTime());
    } catch (error) {
      console.error('[Dashboard] Error processing previous hour data:', error);
      return [];
    }
  }, [dataByHour, previousHour]);

  // Get current skill from screen data
  const currentSkill = useMemo(() => screenData?.actionText.currentActionText || '', [screenData]);

  // Helper function to format location (replace "Rima city - barracks" with "Barracks")
  const formatLocation = (location: string): string => {
    if (location.toLowerCase() === 'rima city - barracks') {
      return 'Barracks';
    }
    return location;
  };

  // Get current training activity description (monster, location)
  const currentTrainingDescription = useMemo(() => {
    // Get the most recent entry from current hour data
    const mostRecent = currentHourData
      .filter(row => row.skill && (row.monster || row.location))
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0];

    if (!mostRecent) {
      // Fallback to screen data
      const monster = screenData?.monster || '';
      const location = screenData?.location || '';

      if (monster && location) {
        return `Killing ${monster} at ${formatLocation(location)}`;
      }
      return null;
    }

    const monster = mostRecent.monster || '';
    const location = mostRecent.location || '';

    if (monster && location) {
      return `Killing ${monster} at ${formatLocation(location)}`;
    } else if (location) {
      return `Training at ${formatLocation(location)}`;
    }

    return null;
  }, [currentHourData, screenData]);

  // Helper function to format hour range
  const formatHourRange = (hour: number) => {
    const startDate = new Date();
    startDate.setHours(hour, 0, 0, 0);
    const endDate = new Date(startDate);
    endDate.setHours(hour + 1, 0, 0, 0);

    const startTime = startDate.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
    const endTime = endDate.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });

    return `${startTime} - ${endTime}`;
  };

  // Helper function to get skill info
  const getSkillInfo = (skill: string, skillData: { skillLevel: string; expForNextLevel: string }) => {
    const isCurrentSkill = skill === currentSkill;

    if (isCurrentSkill && screenData?.actionText.currentActionText === skill) {
      return {
        level: screenData?.actionText.skillLevel || skillData?.skillLevel || '',
        expForNextLevel: screenData?.actionText.expForNextLevel || skillData?.expForNextLevel || '',
      };
    }

    return {
      level: skillData?.skillLevel || '',
      expForNextLevel: skillData?.expForNextLevel || '',
    };
  };

  // Calculate overall average hit for current hour
  const currentHourOverallAvgHit = useMemo(() => {
    let totalDamage = 0;
    let hitCount = 0;

    currentHourData.forEach(row => {
      const damageDealtStr = row.damageDealt || '';
      if (damageDealtStr) {
        const damageValues = damageDealtStr
          .split(';')
          .map(d => d.trim())
          .filter(d => d.length > 0);
        damageValues.forEach(damageStr => {
          const damage = parseInt(String(damageStr).replace(/,/g, ''), 10);
          if (!isNaN(damage) && damage > 0) {
            totalDamage += damage;
            hitCount += 1;
          }
        });
      }
    });

    return hitCount > 0 ? totalDamage / hitCount : 0;
  }, [currentHourData]);

  // Calculate overall average hit for previous hour
  const previousHourOverallAvgHit = useMemo(() => {
    let totalDamage = 0;
    let hitCount = 0;

    previousHourData.forEach(row => {
      const damageDealtStr = row.damageDealt || '';
      if (damageDealtStr) {
        const damageValues = damageDealtStr
          .split(';')
          .map(d => d.trim())
          .filter(d => d.length > 0);
        damageValues.forEach(damageStr => {
          const damage = parseInt(String(damageStr).replace(/,/g, ''), 10);
          if (!isNaN(damage) && damage > 0) {
            totalDamage += damage;
            hitCount += 1;
          }
        });
      }
    });

    return hitCount > 0 ? totalDamage / hitCount : 0;
  }, [previousHourData]);

  // Get unique fighting locations for current hour
  const currentHourLocations = useMemo(() => {
    const locations = new Set<string>();
    currentHourData.forEach(row => {
      const location = row.location || '';
      if (location) {
        locations.add(location);
      }
    });
    return Array.from(locations);
  }, [currentHourData]);

  // Get unique fighting locations for previous hour
  const previousHourLocations = useMemo(() => {
    const locations = new Set<string>();
    previousHourData.forEach(row => {
      const location = row.location || '';
      if (location) {
        locations.add(location);
      }
    });
    return Array.from(locations);
  }, [previousHourData]);

  // Calculate average people fighting for current hour
  const currentHourAvgPeopleFighting = useMemo(() => {
    const peopleCounts: number[] = [];
    currentHourData.forEach(row => {
      const peopleFighting = row.peopleFighting?.trim();
      if (peopleFighting) {
        const count = parseInt(peopleFighting, 10);
        if (!isNaN(count) && count > 0) {
          peopleCounts.push(count);
        }
      }
    });
    if (peopleCounts.length === 0) return null;
    const sum = peopleCounts.reduce((acc, val) => acc + val, 0);
    return Math.round(sum / peopleCounts.length);
  }, [currentHourData]);

  // Calculate average people fighting for previous hour
  const previousHourAvgPeopleFighting = useMemo(() => {
    const peopleCounts: number[] = [];
    previousHourData.forEach(row => {
      const peopleFighting = row.peopleFighting?.trim();
      if (peopleFighting) {
        const count = parseInt(peopleFighting, 10);
        if (!isNaN(count) && count > 0) {
          peopleCounts.push(count);
        }
      }
    });
    if (peopleCounts.length === 0) return null;
    const sum = peopleCounts.reduce((acc, val) => acc + val, 0);
    return Math.round(sum / peopleCounts.length);
  }, [previousHourData]);

  // Get tracked skills for each hour - use expBySkill from useHourStats (correct calculation)
  const currentHourTrackedSkills = useMemo(
    () =>
      Object.entries(currentHourStats.expBySkill)
        .map(([skill, gainedExp]) => {
          // Find the most recent entry for this skill to get level info
          const mostRecent = currentHourData
            .filter(row => row.skill === skill)
            .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0];

          return {
            skill,
            gainedExp,
            lastUpdate: mostRecent?.timestamp || '',
            skillLevel: mostRecent?.skillLevel || '',
            expForNextLevel: mostRecent?.expForNextLevel || '',
          };
        })
        .sort((a, b) => new Date(b.lastUpdate).getTime() - new Date(a.lastUpdate).getTime()),
    [currentHourStats.expBySkill, currentHourData],
  );

  const previousHourTrackedSkills = useMemo(
    () =>
      Object.entries(previousHourStats.expBySkill)
        .map(([skill, gainedExp]) => {
          // Find the most recent entry for this skill to get level info
          const mostRecent = previousHourData
            .filter(row => row.skill === skill)
            .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0];

          return {
            skill,
            gainedExp,
            lastUpdate: mostRecent?.timestamp || '',
            skillLevel: mostRecent?.skillLevel || '',
            expForNextLevel: mostRecent?.expForNextLevel || '',
          };
        })
        .sort((a, b) => new Date(b.lastUpdate).getTime() - new Date(a.lastUpdate).getTime()),
    [previousHourStats.expBySkill, previousHourData],
  );

  // Calculate net profit for current hour
  const currentHourNetProfit = useMemo(() => {
    let totalDropValue = 0;

    // Calculate total drop value
    currentHourData.forEach(row => {
      const drops = parseDrops(row.drops || '');
      drops.forEach(drop => {
        const { amount, name } = parseDropAmount(drop);
        const itemValue = parseFloat(itemValues[name] || '0');
        if (!isNaN(itemValue)) {
          totalDropValue += amount * itemValue;
        }
      });
    });

    // Calculate HP value (HP used * 2.5)
    const hpUsed = currentHourStats.hpUsed?.used || 0;
    const hpValue = hpUsed * 2.5;

    // Calculate net profit
    const netProfit = totalDropValue - hpValue;

    return {
      dropValue: totalDropValue,
      hpValue,
      netProfit,
    };
  }, [currentHourData, currentHourStats.hpUsed, parseDrops, parseDropAmount, itemValues]);

  // Calculate net profit for previous hour
  const previousHourNetProfit = useMemo(() => {
    let totalDropValue = 0;

    // Calculate total drop value
    previousHourData.forEach(row => {
      const drops = parseDrops(row.drops || '');
      drops.forEach(drop => {
        const { amount, name } = parseDropAmount(drop);
        const itemValue = parseFloat(itemValues[name] || '0');
        if (!isNaN(itemValue)) {
          totalDropValue += amount * itemValue;
        }
      });
    });

    // Calculate HP value (HP used * 2.5)
    const hpUsed = previousHourStats.hpUsed?.used || 0;
    const hpValue = hpUsed * 2.5;

    // Calculate net profit
    const netProfit = totalDropValue - hpValue;

    return {
      dropValue: totalDropValue,
      hpValue,
      netProfit,
    };
  }, [previousHourData, previousHourStats.hpUsed, parseDrops, parseDropAmount, itemValues]);

  if (loading) {
    return <div className={cn('p-4 text-lg font-semibold')}>Loading tracked data...</div>;
  }

  return (
    <div className={cn('flex flex-col gap-4')}>
      {/* Current Hour Skills - Compact Grid */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-2">
            <CardTitle className="flex-1 text-left">
              {currentTrainingDescription || `Current Hour (${formatHourRange(currentHour)})`}
            </CardTitle>
            {currentTrainingDescription && (
              <Badge
                variant="outline"
                className="flex-shrink-0 border-slate-300 bg-slate-200 text-slate-900 dark:border-slate-300 dark:bg-slate-200 dark:text-slate-900">
                Current
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {currentHourTrackedSkills.length > 0 ||
          (currentHourStats.hpUsed && currentHourStats.hpUsed.used !== 0) ||
          currentHourOverallAvgHit > 0 ||
          Object.keys(currentHourStats.dropStats).length > 0 ||
          currentHourData.length > 0 ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
              {/* Skill Cards - Compact */}
              {currentHourTrackedSkills.map(skillData => {
                const skillInfo = getSkillInfo(skillData.skill, {
                  skillLevel: skillData.skillLevel,
                  expForNextLevel: skillData.expForNextLevel,
                });

                // Get weekly exp from userStats if available
                const weeklyExp = userStats?.skills?.[skillData.skill]?.gainedThisWeek
                  ? parseInt(userStats.skills[skillData.skill].gainedThisWeek?.replace(/,/g, '') || '0', 10)
                  : null;

                const level = skillInfo.level ? parseInt(skillInfo.level, 10) : 0;

                return (
                  <DashboardSkillCard
                    key={skillData.skill}
                    skill={skillData.skill}
                    level={level}
                    gainedExp={skillData.gainedExp}
                    weeklyExp={weeklyExp}
                    formatExp={formatExp}
                  />
                );
              })}

              {/* Stats Cards - Compact */}
              {currentHourStats.hpUsed && (
                <div className="hover:bg-accent flex flex-col rounded-lg border p-3 transition-colors">
                  <p className="text-muted-foreground text-xs font-medium">HP Used</p>
                  <p
                    className={cn(
                      'mt-1 text-base font-bold',
                      currentHourStats.hpUsed.used > 0
                        ? 'text-red-500'
                        : currentHourStats.hpUsed.used < 0
                          ? 'text-green-500'
                          : 'text-foreground',
                    )}>
                    {currentHourStats.hpUsed.used > 0 ? '-' : ''}
                    {Math.abs(currentHourStats.hpUsed.used).toLocaleString()}
                  </p>
                </div>
              )}

              {currentHourOverallAvgHit > 0 && (
                <div className="hover:bg-accent flex flex-col rounded-lg border p-3 transition-colors">
                  <p className="text-muted-foreground text-xs font-medium">Avg Hit</p>
                  <p className="mt-1 text-base font-bold">{Math.round(currentHourOverallAvgHit).toLocaleString()}</p>
                </div>
              )}

              {/* Location Cards */}
              {currentHourLocations.length > 0 &&
                currentHourLocations.map(location => (
                  <div key={location} className="hover:bg-accent flex flex-col rounded-lg border p-3 transition-colors">
                    <p className="text-muted-foreground text-xs font-medium">Location</p>
                    <p className="mt-1 truncate text-base font-bold">{location}</p>
                  </div>
                ))}

              {/* Average People Fighting Card */}
              {currentHourAvgPeopleFighting !== null && (
                <div className="hover:bg-accent flex flex-col rounded-lg border p-3 transition-colors">
                  <p className="text-muted-foreground text-xs font-medium">Avg People Fighting</p>
                  <p className="mt-1 text-base font-bold">{currentHourAvgPeopleFighting}</p>
                </div>
              )}

              {/* Net Profit Card */}
              {(currentHourNetProfit.dropValue > 0 || currentHourNetProfit.hpValue > 0) && (
                <div className="hover:bg-accent flex flex-col rounded-lg border p-3 transition-colors">
                  <p className="text-muted-foreground text-xs font-medium">Net Profit</p>
                  <p
                    className={cn(
                      'mt-1 text-base font-bold',
                      currentHourNetProfit.netProfit > 0
                        ? 'text-green-500'
                        : currentHourNetProfit.netProfit < 0
                          ? 'text-red-500'
                          : 'text-foreground',
                    )}>
                    {currentHourNetProfit.netProfit >= 0 ? '+' : ''}
                    {currentHourNetProfit.netProfit.toLocaleString(undefined, {
                      minimumFractionDigits: 0,
                      maximumFractionDigits: 0,
                    })}{' '}
                    GP
                  </p>
                </div>
              )}

              {/* Total Fights Card */}
              {currentHourStats.totalFights > 0 && (
                <div className="hover:bg-accent flex flex-col rounded-lg border p-3 transition-colors">
                  <p className="text-muted-foreground text-xs font-medium">Total Fights</p>
                  <p className="mt-1 text-base font-bold">{currentHourStats.totalFights.toLocaleString()}</p>
                </div>
              )}

              {/* Drops - Compact */}
              {Object.keys(currentHourStats.dropStats).length > 0 && (
                <div className="col-span-full rounded-lg border p-3">
                  <p className="text-muted-foreground mb-2 text-xs font-medium">Drops</p>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(currentHourStats.dropStats)
                      .sort((a, b) => {
                        // Sort by total value (amount * itemValue) descending
                        const aValue = a[1].totalAmount * (parseFloat(itemValues[a[0]] || '0') || 0);
                        const bValue = b[1].totalAmount * (parseFloat(itemValues[b[0]] || '0') || 0);
                        return bValue - aValue;
                      })
                      .map(([name, stats]) => {
                        const itemValue = parseFloat(itemValues[name] || '0') || 0;
                        const totalValue = stats.totalAmount * itemValue;
                        const imageUrl = `https://www.syrnia.com/images/inventory/${name.replace(/\s/g, '%20')}.png`;
                        return (
                          <DropBadge key={name} name={name} imageUrl={imageUrl} stats={stats} totalValue={totalValue} />
                        );
                      })}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-muted-foreground flex items-center justify-center py-8">
              <p className="text-sm">No data tracked for this hour yet</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Previous Hour Skills - Compact Grid */}
      {previousHourTrackedSkills.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>{formatHourRange(previousHour)}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
              {/* Skill Cards - Compact */}
              {previousHourTrackedSkills.map(skillData => {
                const skillInfo = getSkillInfo(skillData.skill, {
                  skillLevel: skillData.skillLevel,
                  expForNextLevel: skillData.expForNextLevel,
                });

                // Get weekly exp from userStats if available
                const weeklyExp = userStats?.skills?.[skillData.skill]?.gainedThisWeek
                  ? parseInt(userStats.skills[skillData.skill].gainedThisWeek?.replace(/,/g, '') || '0', 10)
                  : null;

                const level = skillInfo.level ? parseInt(skillInfo.level, 10) : 0;

                return (
                  <DashboardSkillCard
                    key={skillData.skill}
                    skill={skillData.skill}
                    level={level}
                    gainedExp={skillData.gainedExp}
                    weeklyExp={weeklyExp}
                    formatExp={formatExp}
                  />
                );
              })}

              {/* Stats Cards - Compact */}
              {previousHourStats.hpUsed && (
                <div className="hover:bg-accent flex flex-col rounded-lg border p-3 transition-colors">
                  <p className="text-muted-foreground text-xs font-medium">HP Used</p>
                  <p
                    className={cn(
                      'mt-1 text-base font-bold',
                      previousHourStats.hpUsed.used > 0
                        ? 'text-red-500'
                        : previousHourStats.hpUsed.used < 0
                          ? 'text-green-500'
                          : 'text-foreground',
                    )}>
                    {previousHourStats.hpUsed.used > 0 ? '-' : ''}
                    {Math.abs(previousHourStats.hpUsed.used).toLocaleString()}
                  </p>
                </div>
              )}

              {previousHourOverallAvgHit > 0 && (
                <div className="hover:bg-accent flex flex-col rounded-lg border p-3 transition-colors">
                  <p className="text-muted-foreground text-xs font-medium">Avg Hit</p>
                  <p className="mt-1 text-base font-bold">{Math.round(previousHourOverallAvgHit).toLocaleString()}</p>
                </div>
              )}

              {/* Location Cards */}
              {previousHourLocations.length > 0 &&
                previousHourLocations.map(location => (
                  <div key={location} className="hover:bg-accent flex flex-col rounded-lg border p-3 transition-colors">
                    <p className="text-muted-foreground text-xs font-medium">Location</p>
                    <p className="mt-1 truncate text-base font-bold">{location}</p>
                  </div>
                ))}

              {/* Average People Fighting Card */}
              {previousHourAvgPeopleFighting !== null && (
                <div className="hover:bg-accent flex flex-col rounded-lg border p-3 transition-colors">
                  <p className="text-muted-foreground text-xs font-medium">Avg People Fighting</p>
                  <p className="mt-1 text-base font-bold">{previousHourAvgPeopleFighting}</p>
                </div>
              )}

              {/* Net Profit Card */}
              {(previousHourNetProfit.dropValue > 0 || previousHourNetProfit.hpValue > 0) && (
                <div className="hover:bg-accent flex flex-col rounded-lg border p-3 transition-colors">
                  <p className="text-muted-foreground text-xs font-medium">Net Profit</p>
                  <p
                    className={cn(
                      'mt-1 text-base font-bold',
                      previousHourNetProfit.netProfit > 0
                        ? 'text-green-500'
                        : previousHourNetProfit.netProfit < 0
                          ? 'text-red-500'
                          : 'text-foreground',
                    )}>
                    {previousHourNetProfit.netProfit >= 0 ? '+' : ''}
                    {previousHourNetProfit.netProfit.toLocaleString(undefined, {
                      minimumFractionDigits: 0,
                      maximumFractionDigits: 0,
                    })}{' '}
                    GP
                  </p>
                </div>
              )}

              {/* Total Fights Card */}
              {previousHourStats.totalFights > 0 && (
                <div className="hover:bg-accent flex flex-col rounded-lg border p-3 transition-colors">
                  <p className="text-muted-foreground text-xs font-medium">Total Fights</p>
                  <p className="mt-1 text-base font-bold">{previousHourStats.totalFights.toLocaleString()}</p>
                </div>
              )}

              {/* Drops - Compact */}
              {Object.keys(previousHourStats.dropStats).length > 0 && (
                <div className="col-span-full rounded-lg border p-3">
                  <p className="text-muted-foreground mb-2 text-xs font-medium">Drops</p>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(previousHourStats.dropStats)
                      .sort((a, b) => {
                        // Sort by total value (amount * itemValue) descending
                        const aValue = a[1].totalAmount * (parseFloat(itemValues[a[0]] || '0') || 0);
                        const bValue = b[1].totalAmount * (parseFloat(itemValues[b[0]] || '0') || 0);
                        return bValue - aValue;
                      })
                      .map(([name, stats]) => {
                        const itemValue = parseFloat(itemValues[name] || '0') || 0;
                        const totalValue = stats.totalAmount * itemValue;
                        const imageUrl = `https://www.syrnia.com/images/inventory/${name.replace(/\s/g, '%20')}.png`;
                        return (
                          <DropBadge key={name} name={name} imageUrl={imageUrl} stats={stats} totalValue={totalValue} />
                        );
                      })}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
});

Dashboard.displayName = 'Dashboard';

export default Dashboard;
