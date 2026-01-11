import { useHourlyExp, useTrackedData, useScreenData, useFormatting } from '@extension/shared';
import { cn, Card, CardContent, CardHeader, CardTitle } from '@extension/ui';
import { useMemo, memo } from 'react';
import type { CSVRow } from '@extension/shared';

const Stats = memo(() => {
  const hourlyExp = useHourlyExp();
  const { dataByHour, clearByHour, loading } = useTrackedData();
  const screenData = useScreenData();
  const { formatExp } = useFormatting();

  // Get tracked data for current hour (use hourlyExp.currentHour which updates when hour changes)
  const currentHourData = useMemo(() => {
    try {
      if (!dataByHour || hourlyExp?.currentHour === undefined || hourlyExp?.currentHour === null) {
        return [];
      }
      const now = new Date();
      const data = dataByHour(hourlyExp.currentHour, now);

      if (!Array.isArray(data)) {
        console.warn('dataByHour did not return an array:', data);
        return [];
      }
      // Sort by timestamp ascending (oldest first) for calculating gained exp
      const sorted = [...data].sort((a, b) => {
        try {
          const timeA = new Date(a?.timestamp || 0).getTime();
          const timeB = new Date(b?.timestamp || 0).getTime();
          return timeA - timeB;
        } catch (err) {
          console.error('[Stats] Error sorting timestamps:', err, a, b);
          return 0;
        }
      });
      return sorted;
    } catch (error) {
      console.error('[Stats] Error processing hour data:', error);
      return [];
    }
  }, [dataByHour, hourlyExp?.currentHour]);

  // Prepare display data - use saved gainedExp directly with deduplication
  const displayData = useMemo(() => {
    if (currentHourData.length === 0) return [];

    // Deduplicate entries: one entry per timestamp+skill (keep the one with highest gainedExp or most complete data)
    // This matches the logic in aggregateStats used by the history tab
    const uniqueEntriesMap = new Map<string, CSVRow>();

    currentHourData.forEach(row => {
      const skill = row.skill || '';
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

    // Process unique entries only
    const uniqueEntries = Array.from(uniqueEntriesMap.values());
    const result: Array<Omit<CSVRow, 'gainedExp'> & { gainedExp: number }> = [];

    uniqueEntries.forEach(row => {
      try {
        // Use saved gainedExp directly (it's already calculated and saved)
        const gainedExp = parseInt(row.gainedExp || '0', 10) || 0;

        // Only include entries with gainedExp > 0 (matches aggregateStats logic)
        if (gainedExp > 0) {
          // Ensure all CSVRow fields are present with defaults
          result.push({
            timestamp: row.timestamp || '',
            skill: row.skill || '',
            skillLevel: row.skillLevel || '',
            expForNextLevel: row.expForNextLevel || '',
            drops: row.drops || '',
            hp: row.hp || '',
            monster: row.monster || '',
            location: row.location || '',
            damageDealt: row.damageDealt || '',
            damageReceived: row.damageReceived || '',
            gainedExp,
          });
        }
      } catch (error) {
        console.error('Error processing row in displayData:', error, row);
      }
    });

    // Sort by timestamp descending (most recent first) for display
    return result.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [currentHourData]);

  // Calculate total gained exp for the hour (sum of all gained exp, not total exp)
  const totalGainedExpThisHour = useMemo(() => displayData.reduce((sum, row) => sum + row.gainedExp, 0), [displayData]);

  // Calculate stats per skill (total gained exp, level, and expForNextLevel for each skill)
  // Use tracked data for persistence - don't rely on current screen data
  const skillStats = useMemo(() => {
    const stats: Record<
      string,
      {
        gainedExp: number;
        lastUpdate: string;
        skillLevel: string;
        expForNextLevel: string;
      }
    > = {};

    // Process all entries to build skill stats
    displayData.forEach(row => {
      const skill = row.skill || 'Unknown';
      const gainedExp = row.gainedExp;
      const skillLevel = row.skillLevel || '';
      const expForNextLevel = row.expForNextLevel || '';

      if (!stats[skill]) {
        // Initialize stats for this skill
        stats[skill] = {
          gainedExp: 0,
          lastUpdate: row.timestamp,
          skillLevel: skillLevel,
          expForNextLevel: expForNextLevel,
        };
      }

      // Always add to gained exp
      stats[skill].gainedExp += gainedExp;

      // Update level and expForNextLevel based on timestamp and availability
      const rowTime = new Date(row.timestamp).getTime();
      const statsTime = new Date(stats[skill].lastUpdate).getTime();

      if (rowTime > statsTime) {
        // More recent entry - update all values if available
        stats[skill].lastUpdate = row.timestamp;
        if (skillLevel) stats[skill].skillLevel = skillLevel;
        if (expForNextLevel) stats[skill].expForNextLevel = expForNextLevel;
      } else {
        // If we don't have level/expForNextLevel yet, use them even from older entries
        if (skillLevel && !stats[skill].skillLevel) stats[skill].skillLevel = skillLevel;
        if (expForNextLevel && !stats[skill].expForNextLevel) stats[skill].expForNextLevel = expForNextLevel;
      }
    });

    return stats;
  }, [displayData]);

  // Determine the current skill - the most recently trained skill (from tracked data, not just screen)
  // This persists even when the skill is no longer on screen
  const currentSkill = useMemo(() => {
    // First, check if there's a skill currently on screen
    const screenSkill = screenData?.actionText.currentActionText || '';

    // Find the most recent entry with gained exp from tracked data
    const mostRecentEntry = displayData
      .filter(row => row.gainedExp > 0)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0];

    // If there's a skill on screen, use that (most up-to-date)
    // Otherwise, use the most recently trained skill from tracked data
    return screenSkill || mostRecentEntry?.skill || '';
  }, [screenData, displayData]);

  // Calculate current hour - must be a hook to maintain hook order
  const currentHour = useMemo(() => {
    try {
      return hourlyExp?.currentHour ?? new Date().getHours();
    } catch (error) {
      console.error('Error getting current hour:', error);
      return new Date().getHours();
    }
  }, [hourlyExp?.currentHour]);

  // Calculate total gained exp formatted
  const totalGainedExp = useMemo(() => {
    try {
      return formatExp(totalGainedExpThisHour);
    } catch (error) {
      console.error('Error formatting total gained exp:', error);
      return '0';
    }
  }, [totalGainedExpThisHour, formatExp]);

  // Calculate performance stats: max hit, avg hit, HP lost
  const performanceStats = useMemo(() => {
    try {
      if (!Array.isArray(currentHourData) || currentHourData.length === 0) {
        return {
          maxHit: 0,
          avgHit: 0,
          maxHitByMonster: {},
          avgHitByMonster: {},
          maxDamageReceived: 0,
          avgDamageReceived: 0,
          maxDamageReceivedByMonster: {},
          avgDamageReceivedByMonster: {},
          hpLostPerHour: 0,
          hpLostPer15Min: 0,
        };
      }

      // Deduplicate entries: one entry per timestamp+skill (keep the one with highest gainedExp or most complete data)
      // This matches the logic in aggregateStats used by the history tab
      const uniqueEntriesMap = new Map<string, CSVRow>();

      currentHourData.forEach(row => {
        const skill = row.skill || '';
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

      // Use unique entries only
      const uniqueEntries = Array.from(uniqueEntriesMap.values());

      const allDamageDealt: number[] = [];
      const allDamageReceived: number[] = [];
      const monsterStats: Record<string, { damage: number[]; received: number[]; displayName: string }> = {};

      // Get hour start time for calculating rates
      const now = new Date();
      const hourStart = new Date(now);
      hourStart.setHours(hourlyExp?.currentHour ?? now.getHours(), 0, 0, 0);
      const hourStartTime = hourStart.getTime();
      const currentTime = now.getTime();
      const elapsedMinutes = Math.max(1, (currentTime - hourStartTime) / (1000 * 60)); // At least 1 minute to avoid division by zero

      uniqueEntries.forEach(row => {
        try {
          // Normalize monster name for consistent grouping (case-insensitive, trimmed)
          const rawMonster = row.monster || 'Unknown';
          const normalizedKey = rawMonster.trim().toLowerCase();
          const displayName = rawMonster.trim() || 'Unknown';

          // Parse damage dealt
          const damageDealtStr = row.damageDealt || '';
          if (damageDealtStr) {
            const damageValues = damageDealtStr
              .split(';')
              .map(d => d.trim())
              .filter(d => d.length > 0);
            damageValues.forEach(damageStr => {
              const damage = parseInt(String(damageStr).replace(/,/g, ''), 10);
              if (!isNaN(damage) && damage >= 0) {
                allDamageDealt.push(damage);
                if (!monsterStats[normalizedKey]) {
                  monsterStats[normalizedKey] = { damage: [], received: [], displayName };
                }
                monsterStats[normalizedKey].damage.push(damage);
              }
            });
          }

          // Parse damage received
          const damageReceivedStr = row.damageReceived || '';
          if (damageReceivedStr) {
            const receivedValues = damageReceivedStr
              .split(';')
              .map(d => d.trim())
              .filter(d => d.length > 0);
            receivedValues.forEach(damageStr => {
              const damage = parseInt(String(damageStr).replace(/,/g, ''), 10);
              if (!isNaN(damage) && damage >= 0) {
                allDamageReceived.push(damage);
                if (!monsterStats[normalizedKey]) {
                  monsterStats[normalizedKey] = { damage: [], received: [], displayName };
                }
                monsterStats[normalizedKey].received.push(damage);
              }
            });
          }
        } catch (err) {
          console.error('Error processing row in performanceStats:', err, row);
        }
      });

      // Calculate overall stats for damage dealt (by user)
      const validHits = allDamageDealt.filter(d => d > 0);
      const maxHit = validHits.length > 0 ? Math.max(...validHits) : 0;
      const avgHit = validHits.length > 0 ? validHits.reduce((sum, d) => sum + d, 0) / validHits.length : 0;

      // Calculate overall stats for damage received (by user)
      const validReceived = allDamageReceived.filter(d => d > 0);
      const maxDamageReceived = validReceived.length > 0 ? Math.max(...validReceived) : 0;
      const avgDamageReceived =
        validReceived.length > 0 ? validReceived.reduce((sum, d) => sum + d, 0) / validReceived.length : 0;

      // Calculate HP lost
      const totalHPLost = allDamageReceived.reduce((sum, d) => sum + d, 0);
      const hpLostPerHour = totalHPLost;
      const hpLostPer15Min = (totalHPLost / elapsedMinutes) * 15;

      // Calculate per-monster stats for damage dealt
      const maxHitByMonster: Record<string, number> = {};
      const avgHitByMonster: Record<string, number> = {};

      // Calculate per-monster stats for damage received
      const maxDamageReceivedByMonster: Record<string, number> = {};
      const avgDamageReceivedByMonster: Record<string, number> = {};

      Object.entries(monsterStats).forEach(([, stats]) => {
        // Use display name for the key (preserves original casing/formatting)
        const monsterDisplayName = stats.displayName;

        // Damage dealt stats - all hits for this monster are already aggregated in stats.damage
        const validMonsterHits = stats.damage.filter(d => d > 0);
        if (validMonsterHits.length > 0) {
          // Calculate max from all accumulated hits for this monster
          maxHitByMonster[monsterDisplayName] = Math.max(...validMonsterHits);
          // Calculate average from all accumulated hits for this monster
          avgHitByMonster[monsterDisplayName] =
            validMonsterHits.reduce((sum, d) => sum + d, 0) / validMonsterHits.length;
        }

        // Damage received stats - all received damage for this monster are already aggregated in stats.received
        const validMonsterReceived = stats.received.filter(d => d > 0);
        if (validMonsterReceived.length > 0) {
          // Calculate max from all accumulated received damage for this monster
          maxDamageReceivedByMonster[monsterDisplayName] = Math.max(...validMonsterReceived);
          // Calculate average from all accumulated received damage for this monster
          avgDamageReceivedByMonster[monsterDisplayName] =
            validMonsterReceived.reduce((sum, d) => sum + d, 0) / validMonsterReceived.length;
        }
      });

      return {
        maxHit,
        avgHit,
        maxHitByMonster,
        avgHitByMonster,
        maxDamageReceived,
        avgDamageReceived,
        maxDamageReceivedByMonster,
        avgDamageReceivedByMonster,
        hpLostPerHour,
        hpLostPer15Min,
      };
    } catch (error) {
      console.error('Error calculating performanceStats:', error);
      return {
        maxHit: 0,
        avgHit: 0,
        maxHitByMonster: {},
        avgHitByMonster: {},
        hpLostPerHour: 0,
        hpLostPer15Min: 0,
      };
    }
  }, [currentHourData, hourlyExp?.currentHour]);

  if (loading) {
    return <div className={cn('p-4 text-lg font-semibold')}>Loading tracked data...</div>;
  }

  const handleClearCurrentHour = async () => {
    if (
      confirm(
        `Are you sure you want to clear all tracked data for hour ${currentHour}:00? This action cannot be undone.`,
      )
    ) {
      try {
        await clearByHour(currentHour);
        alert(`Data for hour ${currentHour}:00 cleared successfully!`);
      } catch (error) {
        alert('Error clearing data for current hour');
        console.error(error);
      }
    }
  };

  // Get level and expForNextLevel from screen data if available, otherwise use tracked data
  // This ensures we show the most up-to-date info when on screen, but fall back to saved data when off screen
  const getSkillInfo = (skill: string) => {
    const isCurrentSkill = skill === currentSkill;
    const trackedInfo = skillStats[skill];

    // If this is the current skill and we have screen data, prefer screen data (most up-to-date)
    if (isCurrentSkill && screenData?.actionText.currentActionText === skill) {
      return {
        level: screenData?.actionText.skillLevel || trackedInfo?.skillLevel || '',
        expForNextLevel: screenData?.actionText.expForNextLevel || trackedInfo?.expForNextLevel || '',
      };
    }

    // Otherwise, use tracked data (persisted from when it was on screen)
    return {
      level: trackedInfo?.skillLevel || '',
      expForNextLevel: trackedInfo?.expForNextLevel || '',
    };
  };

  // Get list of all tracked skills sorted by most recent activity
  const trackedSkills = Object.entries(skillStats).sort(
    (a, b) => new Date(b[1].lastUpdate).getTime() - new Date(a[1].lastUpdate).getTime(),
  );

  return (
    <div className={cn('flex flex-col gap-4')}>
      {/* Summary Header */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <span className="text-lg font-semibold">Current Hour ({currentHour}:00)</span>
            <div className="flex items-center gap-3">
              <span className="text-xl font-bold">
                Total Gained: <span className="text-green-500">+{totalGainedExp}</span>
              </span>
              <Button
                onClick={handleClearCurrentHour}
                variant="destructive"
                size="sm"
                aria-label="Clear Current Hour Data">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="mr-1">
                  <path d="M3 6h18"></path>
                  <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
                  <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
                </svg>
                Clear Hour
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Skill Stats - Show all tracked skills */}
      {trackedSkills.length > 0 && (
        <div className="flex flex-wrap gap-3">
          {trackedSkills.map(([skill, stats]) => {
            const isCurrentSkill = skill === currentSkill;
            return (
              <Card
                key={skill}
                className={cn(isCurrentSkill && 'bg-primary/10 border-primary', 'min-w-[200px] flex-1')}>
                <CardContent className="p-4">
                  <div className="mb-2 flex items-center gap-2">
                    <span className="text-base font-semibold">{skill}</span>
                    <span className="text-base font-semibold text-green-500">+{formatExp(stats.gainedExp)}</span>
                    {isCurrentSkill && (
                      <Badge
                        variant="outline"
                        className="border-slate-300 bg-slate-200 text-slate-900 dark:border-slate-300 dark:bg-slate-200 dark:text-slate-900">
                        Current
                      </Badge>
                    )}
                  </div>
                  <div className="flex flex-col gap-1 text-left text-sm">
                    {(() => {
                      const skillInfo = getSkillInfo(skill);
                      const level = skillInfo.level;
                      const expForNextLevel = formatExp(skillInfo.expForNextLevel || '0');

                      return (
                        <>
                          {level && (
                            <div>
                              <span className="text-muted-foreground">Level: </span>
                              <span className="font-semibold">{level}</span>
                            </div>
                          )}
                          <div>
                            <span className="text-muted-foreground">Current Exp: </span>
                            <span className="font-semibold text-green-500">+{formatExp(stats.gainedExp)}</span>
                          </div>
                          {expForNextLevel !== '0' && (
                            <div>
                              <span className="text-muted-foreground">Exp Left: </span>
                              <span className="font-semibold">{expForNextLevel}</span>
                            </div>
                          )}
                        </>
                      );
                    })()}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Performance Card */}
      <Card>
        <CardHeader>
          <CardTitle>Performance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-3">
            {/* Max and Average Hit Card - Damage Dealt */}
            <Card>
              <CardContent className="p-4">
                <div className="mb-2 flex items-start justify-between">
                  <span className="text-base font-semibold">Your Max and Average Hit per creature</span>
                </div>
                <div className="space-y-1">
                  <div className="mb-2 space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">You (Max):</span>
                      <span className="font-medium">
                        {performanceStats.maxHit > 0 ? performanceStats.maxHit.toLocaleString() : '—'}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">You (Avg):</span>
                      <span className="font-medium">
                        {performanceStats.avgHit > 0 ? Math.round(performanceStats.avgHit).toLocaleString() : '—'}
                      </span>
                    </div>
                  </div>
                  {Object.keys(performanceStats.maxHitByMonster).length > 0 && (
                    <>
                      <div className="mt-2 border-t pt-2">
                        {Object.entries(performanceStats.maxHitByMonster)
                          .sort((a, b) => b[1] - a[1])
                          .map(([monster, maxHit]) => {
                            const avgHit = (performanceStats.avgHitByMonster as Record<string, number>)[monster];
                            return (
                              <div key={monster} className="mb-2 space-y-1 last:mb-0">
                                <div className="flex justify-between text-sm">
                                  <span className="text-muted-foreground">{monster} (Max):</span>
                                  <span className="font-medium">{maxHit.toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                  <span className="text-muted-foreground">{monster} (Avg):</span>
                                  <span className="font-medium">
                                    {avgHit ? Math.round(avgHit).toLocaleString() : '—'}
                                  </span>
                                </div>
                              </div>
                            );
                          })}
                      </div>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Max and Average Damage Received Card */}
            <Card>
              <CardContent className="p-4">
                <div className="mb-2 flex items-start justify-between">
                  <span className="text-base font-semibold">Your Max and Average Damage Received per creature</span>
                </div>
                <div className="space-y-1">
                  <div className="mb-2 space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">You (Max):</span>
                      <span
                        className={cn(
                          'font-medium',
                          (performanceStats.maxDamageReceived ?? 0) > 0 ? 'text-red-500' : 'text-foreground',
                        )}>
                        {(performanceStats.maxDamageReceived ?? 0) > 0
                          ? (performanceStats.maxDamageReceived ?? 0).toLocaleString()
                          : '—'}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">You (Avg):</span>
                      <span
                        className={cn(
                          'font-medium',
                          (performanceStats.avgDamageReceived ?? 0) > 0 ? 'text-red-500' : 'text-foreground',
                        )}>
                        {(performanceStats.avgDamageReceived ?? 0) > 0
                          ? Math.round(performanceStats.avgDamageReceived ?? 0).toLocaleString()
                          : '—'}
                      </span>
                    </div>
                  </div>
                  {performanceStats.maxDamageReceivedByMonster &&
                    Object.keys(performanceStats.maxDamageReceivedByMonster).length > 0 && (
                      <>
                        <div className="mt-2 border-t pt-2">
                          {Object.entries(performanceStats.maxDamageReceivedByMonster)
                            .sort((a, b) => b[1] - a[1])
                            .map(([monster, maxReceived]) => {
                              const avgReceived = (
                                performanceStats.avgDamageReceivedByMonster as Record<string, number> | undefined
                              )?.[monster];
                              return (
                                <div key={monster} className="mb-2 space-y-1 last:mb-0">
                                  <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">{monster} (Max):</span>
                                    <span
                                      className={cn(
                                        'font-medium',
                                        maxReceived > 0 ? 'text-red-500' : 'text-foreground',
                                      )}>
                                      {maxReceived.toLocaleString()}
                                    </span>
                                  </div>
                                  <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">{monster} (Avg):</span>
                                    <span
                                      className={cn(
                                        'font-medium',
                                        (avgReceived ?? 0) > 0 ? 'text-red-500' : 'text-foreground',
                                      )}>
                                      {avgReceived ? Math.round(avgReceived).toLocaleString() : '—'}
                                    </span>
                                  </div>
                                </div>
                              );
                            })}
                        </div>
                      </>
                    )}
                </div>
              </CardContent>
            </Card>

            {/* Estimated HP Lost Card */}
            <Card>
              <CardContent className="p-4">
                <div className="mb-2 flex items-start justify-between">
                  <span className="text-base font-semibold">Estimated HP Lost</span>
                </div>
                <div className="mt-2 grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-muted-foreground">Per Hour:</span>
                    <p
                      className={cn(
                        'font-semibold',
                        performanceStats.hpLostPerHour > 0 ? 'text-red-500' : 'text-foreground',
                      )}>
                      {performanceStats.hpLostPerHour > 0 ? performanceStats.hpLostPerHour.toLocaleString() : '—'}
                    </p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Per 15 Minutes:</span>
                    <p
                      className={cn(
                        'font-semibold',
                        performanceStats.hpLostPer15Min > 0 ? 'text-red-500' : 'text-foreground',
                      )}>
                      {performanceStats.hpLostPer15Min > 0
                        ? Math.round(performanceStats.hpLostPer15Min).toLocaleString()
                        : '—'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>
    </div>
  );
});

Stats.displayName = 'Stats';

export default Stats;
