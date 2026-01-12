import { useHourlyExp, useTrackedDataQuery, useFormatting } from '@extension/shared';
import { cn, Card, CardContent, CardHeader, CardTitle, Button, Tabs, TabsList, TabsTrigger } from '@extension/ui';
import { useMemo, memo, useState, useEffect } from 'react';
import type { CSVRow } from '@extension/shared';

const Stats = memo(() => {
  const hourlyExp = useHourlyExp();
  const { allData, clearByHour, loading } = useTrackedDataQuery();
  const { formatExp } = useFormatting();
  const [selectedLocation, setSelectedLocation] = useState<string>('all');

  // Group all data by location
  const dataByLocation = useMemo(() => {
    const locationMap = new Map<string, CSVRow[]>();
    const allLocations: CSVRow[] = [];

    allData.forEach(row => {
      allLocations.push(row);
      const location = row.location?.trim() || 'Unknown';
      if (!locationMap.has(location)) {
        locationMap.set(location, []);
      }
      locationMap.get(location)!.push(row);
    });

    // Add "All" location with all data
    const result = new Map<string, CSVRow[]>();
    result.set('all', allLocations);

    // Sort locations by name (excluding 'all')
    const sortedLocations = Array.from(locationMap.entries())
      .filter(([loc]) => loc !== 'all')
      .sort(([a], [b]) => a.localeCompare(b));

    sortedLocations.forEach(([location, rows]) => {
      result.set(location, rows);
    });

    return result;
  }, [allData]);

  // Get list of locations for tabs
  const locations = useMemo(() => Array.from(dataByLocation.keys()), [dataByLocation]);

  // Set default selected location to first available (or 'all')
  useEffect(() => {
    if (locations.length > 0) {
      if (selectedLocation === 'all' && !locations.includes('all')) {
        setSelectedLocation(locations[0]);
      } else if (!locations.includes(selectedLocation)) {
        setSelectedLocation(locations[0]);
      }
    }
  }, [locations, selectedLocation]);

  // Get data for selected location
  const selectedLocationData = useMemo(
    () => dataByLocation.get(selectedLocation) || [],
    [dataByLocation, selectedLocation],
  );

  // Prepare display data - use saved gainedExp directly with deduplication
  // Use selectedLocationData instead of currentHourData for location-based stats
  const displayData = useMemo(() => {
    if (selectedLocationData.length === 0) return [];

    // Deduplicate entries: one entry per timestamp+skill (keep the one with highest gainedExp or most complete data)
    // This matches the logic in aggregateStats used by the history tab
    const uniqueEntriesMap = new Map<string, CSVRow>();

    selectedLocationData.forEach(row => {
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
            peopleFighting: row.peopleFighting || '',
            totalFights: row.totalFights || '',
            totalInventoryHP: row.totalInventoryHP || '',
            hpUsed: row.hpUsed || '',
            gainedExp,
          });
        }
      } catch (error) {
        console.error('Error processing row in displayData:', error, row);
      }
    });

    // Sort by timestamp descending (most recent first) for display
    return result.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [selectedLocationData]);

  // Calculate total gained exp for the hour (sum of all gained exp, not total exp)
  const totalGainedExpThisHour = useMemo(() => displayData.reduce((sum, row) => sum + row.gainedExp, 0), [displayData]);

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
  // Use selectedLocationData instead of currentHourData for location-based stats
  const performanceStats = useMemo(() => {
    try {
      if (!Array.isArray(selectedLocationData) || selectedLocationData.length === 0) {
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

      selectedLocationData.forEach(row => {
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

      // Calculate time span for rate calculations (use earliest and latest timestamps)
      const timestamps = uniqueEntries
        .map(row => new Date(row.timestamp).getTime())
        .filter(ts => !isNaN(ts))
        .sort((a, b) => a - b);

      const earliestTime = timestamps.length > 0 ? timestamps[0] : Date.now();
      const latestTime = timestamps.length > 0 ? timestamps[timestamps.length - 1] : Date.now();
      const elapsedMinutes = Math.max(1, (latestTime - earliestTime) / (1000 * 60)); // At least 1 minute to avoid division by zero

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
  }, [selectedLocationData]);

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

  return (
    <div className={cn('flex flex-col gap-4')}>
      {/* Location Tabs */}
      <Card>
        <CardContent className="p-4">
          <Tabs value={selectedLocation} onValueChange={setSelectedLocation}>
            <TabsList className="w-full flex-wrap justify-start">
              {locations.map(location => (
                <TabsTrigger key={location} value={location}>
                  {location === 'all' ? 'All Locations' : location}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </CardContent>
      </Card>

      {/* Summary Header */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <span className="text-lg font-semibold">
              {selectedLocation === 'all' ? 'All Locations' : selectedLocation}
            </span>
            <div className="flex items-center gap-3">
              <span className="text-xl font-bold">
                Total Gained: <span className="text-green-500">+{totalGainedExp}</span>
              </span>
              {selectedLocation !== 'all' && (
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
              )}
            </div>
          </div>
        </CardContent>
      </Card>

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
