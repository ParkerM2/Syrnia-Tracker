import { useHourlyExp, useTrackedData, useHourStats, useFormatting, useScreenData } from '@extension/shared';
import { cn, Card, CardContent, CardHeader, CardTitle } from '@extension/ui';
import { useMemo, memo } from 'react';

const Dashboard = memo(() => {
  const hourlyExp = useHourlyExp();
  const { loading, stats: overallStats, dataByHour } = useTrackedData();
  const { formatExp } = useFormatting();
  const screenData = useScreenData();

  // Get current hour - ensure it updates when hour changes
  const currentHour = useMemo(() => hourlyExp?.currentHour ?? new Date().getHours(), [hourlyExp?.currentHour]); // currentHour dependency is needed to trigger recalculation

  const previousHour = useMemo(() => (currentHour === 0 ? 23 : currentHour - 1), [currentHour]);

  // Use the reusable hook for hour stats - pass current date to ensure fresh calculation
  const now = useMemo(() => new Date(), []); // Recreate date when hour changes
  const currentHourStats = useHourStats(currentHour, now);
  const previousHourStats = useHourStats(previousHour, now);

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

  if (loading) {
    return <div className={cn('p-4 text-lg font-semibold')}>Loading tracked data...</div>;
  }

  return (
    <div className={cn('flex flex-col gap-4')}>
      {/* Overall Progress Section */}
      <Card>
        <CardHeader>
          <CardTitle>Overall Progress</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <p className="text-muted-foreground mb-1 text-sm">Total Experience</p>
              <p className="text-2xl font-bold">{formatExp(overallStats.totalExp)}</p>
            </div>
            <div>
              <p className="text-muted-foreground mb-1 text-sm">Skills Tracked</p>
              <p className="text-2xl font-bold">{Object.keys(overallStats.skills).length}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tracked Skills - Current Hour */}
      {currentHourTrackedSkills.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Current Hour ({formatHourRange(currentHour)})</CardTitle>
          </CardHeader>
          <CardContent>
            <div
              className="grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-3"
              style={{ gridAutoRows: 'auto', gridAutoFlow: 'row dense' }}>
              {/* Skill Cards */}
              {currentHourTrackedSkills.map(skillData => {
                const skillInfo = getSkillInfo(skillData.skill, {
                  skillLevel: skillData.skillLevel,
                  expForNextLevel: skillData.expForNextLevel,
                });
                return (
                  <Card key={skillData.skill} className="h-auto min-w-[150px] flex-shrink-0 p-3">
                    <CardContent className="h-full p-0">
                      <div className="flex h-full flex-col gap-2">
                        <p className="text-muted-foreground text-xs">
                          {skillData.skill}
                          {skillInfo.level ? ` ${skillInfo.level}` : ''}
                        </p>
                        <p className="text-lg font-semibold text-green-500">+{formatExp(skillData.gainedExp)}</p>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}

              {/* Drops Card */}
              {Object.keys(currentHourStats.dropStats).length > 0 && (
                <Card className="h-auto min-w-[150px] p-3" style={{ gridColumn: 'span 2' }}>
                  <CardContent className="h-full p-0">
                    <div className="flex h-full flex-col gap-2">
                      <p className="text-muted-foreground text-xs">Drops</p>
                      <div className="space-y-1">
                        {Object.entries(currentHourStats.dropStats)
                          .sort((a, b) => b[1].totalAmount - a[1].totalAmount)
                          .map(([name, stats]) => (
                            <div key={name} className="flex items-center justify-between text-xs">
                              <span className="text-muted-foreground truncate pr-2">{name}</span>
                              <span className="whitespace-nowrap font-semibold">
                                {stats.totalAmount.toLocaleString()} ({stats.count}x)
                              </span>
                            </div>
                          ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* HP Used Card */}
              {currentHourStats.hpUsed && (
                <Card className="h-auto min-w-[150px] flex-shrink-0 p-3">
                  <CardContent className="h-full p-0">
                    <div className="flex h-full flex-col gap-2">
                      <p className="text-muted-foreground text-xs">HP Used</p>
                      <p
                        className={cn(
                          'text-lg font-semibold',
                          currentHourStats.hpUsed.used > 0
                            ? 'text-red-500'
                            : currentHourStats.hpUsed.used < 0
                              ? 'text-green-500'
                              : 'text-foreground',
                        )}>
                        {currentHourStats.hpUsed.used > 0 ? '-' : ''}
                        {Math.abs(currentHourStats.hpUsed.used).toLocaleString()}
                      </p>
                      <p className="text-muted-foreground text-xs">
                        {currentHourStats.hpUsed.startHP.toLocaleString()} →{' '}
                        {currentHourStats.hpUsed.endHP.toLocaleString()}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Overall Average Hit Card */}
              {currentHourOverallAvgHit > 0 && (
                <Card className="h-auto min-w-[150px] flex-shrink-0 p-3">
                  <CardContent className="h-full p-0">
                    <div className="flex h-full flex-col gap-2">
                      <p className="text-muted-foreground text-xs">Avg Hit</p>
                      <p className="text-lg font-semibold">{Math.round(currentHourOverallAvgHit).toLocaleString()}</p>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Fighting Location Cards */}
              {currentHourLocations.map(location => (
                <Card key={`fighting-location-${location}`} className="min-w-[150px] flex-shrink-0 p-3">
                  <CardContent className="p-0">
                    <div className="flex flex-col gap-2">
                      <p className="text-muted-foreground text-xs">Fighting Location</p>
                      <p className="text-lg font-semibold">{location}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}

              {/* Average Hit by Location Cards */}
              {Object.entries(currentHourStats.averageHitByLocation)
                .sort((a, b) => b[1] - a[1])
                .map(([location, avgHit]) => (
                  <Card key={`location-${location}`} className="min-w-[150px] flex-shrink-0 p-3">
                    <CardContent className="p-0">
                      <div className="flex flex-col gap-2">
                        <p className="text-muted-foreground text-xs">Avg Hit at {location}</p>
                        <p className="text-lg font-semibold">{Math.round(avgHit).toLocaleString()}</p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tracked Skills - Previous Hour */}
      {previousHourTrackedSkills.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Previous Hour ({formatHourRange(previousHour)})</CardTitle>
          </CardHeader>
          <CardContent>
            <div
              className="grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-3"
              style={{ gridAutoRows: 'auto', gridAutoFlow: 'row dense' }}>
              {/* Skill Cards */}
              {previousHourTrackedSkills.map(skillData => {
                const skillInfo = getSkillInfo(skillData.skill, {
                  skillLevel: skillData.skillLevel,
                  expForNextLevel: skillData.expForNextLevel,
                });
                return (
                  <Card key={skillData.skill} className="h-auto min-w-[150px] flex-shrink-0 p-3">
                    <CardContent className="h-full p-0">
                      <div className="flex h-full flex-col gap-2">
                        <p className="text-muted-foreground text-xs">
                          {skillData.skill}
                          {skillInfo.level ? ` ${skillInfo.level}` : ''}
                        </p>
                        <p className="text-lg font-semibold text-green-500">+{formatExp(skillData.gainedExp)}</p>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}

              {/* Drops Card */}
              {Object.keys(previousHourStats.dropStats).length > 0 && (
                <Card className="h-auto min-w-[150px] p-3" style={{ gridColumn: 'span 2' }}>
                  <CardContent className="h-full p-0">
                    <div className="flex h-full flex-col gap-2">
                      <p className="text-muted-foreground text-xs">Drops</p>
                      <div className="space-y-1">
                        {Object.entries(previousHourStats.dropStats)
                          .sort((a, b) => b[1].totalAmount - a[1].totalAmount)
                          .map(([name, stats]) => (
                            <div key={name} className="flex items-center justify-between text-xs">
                              <span className="text-muted-foreground truncate pr-2">{name}</span>
                              <span className="whitespace-nowrap font-semibold">
                                {stats.totalAmount.toLocaleString()} ({stats.count}x)
                              </span>
                            </div>
                          ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* HP Used Card */}
              {previousHourStats.hpUsed && (
                <Card className="h-auto min-w-[150px] flex-shrink-0 p-3">
                  <CardContent className="h-full p-0">
                    <div className="flex h-full flex-col gap-2">
                      <p className="text-muted-foreground text-xs">HP Used</p>
                      <p
                        className={cn(
                          'text-lg font-semibold',
                          previousHourStats.hpUsed.used > 0
                            ? 'text-red-500'
                            : previousHourStats.hpUsed.used < 0
                              ? 'text-green-500'
                              : 'text-foreground',
                        )}>
                        {previousHourStats.hpUsed.used > 0 ? '-' : ''}
                        {Math.abs(previousHourStats.hpUsed.used).toLocaleString()}
                      </p>
                      <p className="text-muted-foreground text-xs">
                        {previousHourStats.hpUsed.startHP.toLocaleString()} →{' '}
                        {previousHourStats.hpUsed.endHP.toLocaleString()}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Overall Average Hit Card */}
              {previousHourOverallAvgHit > 0 && (
                <Card className="h-auto min-w-[150px] flex-shrink-0 p-3">
                  <CardContent className="h-full p-0">
                    <div className="flex h-full flex-col gap-2">
                      <p className="text-muted-foreground text-xs">Avg Hit</p>
                      <p className="text-lg font-semibold">{Math.round(previousHourOverallAvgHit).toLocaleString()}</p>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Fighting Location Cards */}
              {previousHourLocations.map(location => (
                <Card key={`fighting-location-${location}`} className="min-w-[150px] flex-shrink-0 p-3">
                  <CardContent className="p-0">
                    <div className="flex flex-col gap-2">
                      <p className="text-muted-foreground text-xs">Fighting Location</p>
                      <p className="text-lg font-semibold">{location}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}

              {/* Average Hit by Location Cards */}
              {Object.entries(previousHourStats.averageHitByLocation)
                .sort((a, b) => b[1] - a[1])
                .map(([location, avgHit]) => (
                  <Card key={`location-${location}`} className="min-w-[150px] flex-shrink-0 p-3">
                    <CardContent className="p-0">
                      <div className="flex flex-col gap-2">
                        <p className="text-muted-foreground text-xs">Avg Hit at {location}</p>
                        <p className="text-lg font-semibold">{Math.round(avgHit).toLocaleString()}</p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
});

Dashboard.displayName = 'Dashboard';

export default Dashboard;
