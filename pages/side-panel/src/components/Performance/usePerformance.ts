import { useHourlyExp, useTrackedDataQuery, useFormatting, useUserStatsQuery } from '@extension/shared';
import { useMemo, useState, useEffect } from 'react';
import type { CSVRow, EquipmentData, EquipmentItem } from '@extension/shared';

// Combat skills list
const COMBAT_SKILLS = ['Attack', 'Defence', 'Strength', 'Health'];

export interface PerformanceStats {
  maxHit: number;
  avgHit: number;
  meanHit: number;
  modeHit: number;
  avgHitsToKill: number;
  maxHitByMonster: Record<string, number>;
  avgHitByMonster: Record<string, number>;
  meanHitByMonster: Record<string, number>;
  modeHitByMonster: Record<string, number>;
  avgHitsToKillByMonster: Record<string, number>;
  maxDamageReceived: number;
  avgDamageReceived: number;
  meanDamageReceived: number;
  modeDamageReceived: number;
  maxDamageReceivedByMonster: Record<string, number>;
  avgDamageReceivedByMonster: Record<string, number>;
  meanDamageReceivedByMonster: Record<string, number>;
  modeDamageReceivedByMonster: Record<string, number>;
  hpLostPerHour: number;
  hpLostPer15Min: number;
}

/**
 * Main hook for Performance component
 * Handles all logic, state, and data processing
 */
export const usePerformance = () => {
  const hourlyExp = useHourlyExp();
  const { allData, clearByHour, loading } = useTrackedDataQuery();
  const { formatExp } = useFormatting();
  const { userStats } = useUserStatsQuery();
  const [selectedLocation, setSelectedLocation] = useState<string>('all');
  const [selectedMonster, setSelectedMonster] = useState<string>('all');

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

  // Group all data by monster
  const dataByMonster = useMemo(() => {
    const monsterMap = new Map<string, CSVRow[]>();
    const allMonsters: CSVRow[] = [];

    allData.forEach(row => {
      allMonsters.push(row);
      const monster = row.monster?.trim() || 'Unknown';
      if (!monsterMap.has(monster)) {
        monsterMap.set(monster, []);
      }
      monsterMap.get(monster)!.push(row);
    });

    // Add "All" monster with all data
    const result = new Map<string, CSVRow[]>();
    result.set('all', allMonsters);

    // Sort monsters by name (excluding 'all')
    const sortedMonsters = Array.from(monsterMap.entries())
      .filter(([mon]) => mon !== 'all')
      .sort(([a], [b]) => a.localeCompare(b));

    sortedMonsters.forEach(([monster, rows]) => {
      result.set(monster, rows);
    });

    return result;
  }, [allData]);

  // Get list of monsters for filter
  const monsters = useMemo(() => Array.from(dataByMonster.keys()), [dataByMonster]);

  // Set default selected monster to first available (or 'all')
  useEffect(() => {
    if (monsters.length > 0) {
      if (selectedMonster === 'all' && !monsters.includes('all')) {
        setSelectedMonster(monsters[0]);
      } else if (!monsters.includes(selectedMonster)) {
        setSelectedMonster(monsters[0]);
      }
    }
  }, [monsters, selectedMonster]);

  // Get data for selected location
  const selectedLocationData = useMemo(
    () => dataByLocation.get(selectedLocation) || [],
    [dataByLocation, selectedLocation],
  );

  // Get data for selected monster
  const selectedMonsterData = useMemo(() => dataByMonster.get(selectedMonster) || [], [dataByMonster, selectedMonster]);

  // Get data filtered by both location and monster
  const filteredData = useMemo(() => {
    const locationData = selectedLocationData;
    const monsterData = selectedMonsterData;

    // If both are 'all', return all data
    if (selectedLocation === 'all' && selectedMonster === 'all') {
      return allData;
    }

    // If location is 'all', use monster data
    if (selectedLocation === 'all') {
      return monsterData;
    }

    // If monster is 'all', use location data
    if (selectedMonster === 'all') {
      return locationData;
    }

    // Both are specific - find intersection
    // Create a set of UUIDs from location data for fast lookup
    const locationUUIDs = new Set(locationData.map(row => row.uuid || `${row.timestamp}-${row.skill}`));

    // Filter monster data to only include rows that are also in location data
    return monsterData.filter(row => {
      const key = row.uuid || `${row.timestamp}-${row.skill}`;
      return locationUUIDs.has(key);
    });
  }, [selectedLocationData, selectedMonsterData, selectedLocation, selectedMonster, allData]);

  // Prepare display data - use saved gainedExp directly with deduplication
  const displayData = useMemo(() => {
    if (filteredData.length === 0) return [];

    // Deduplicate entries: one entry per timestamp+skill (keep the one with highest gainedExp or most complete data)
    const uniqueEntriesMap = new Map<string, CSVRow>();

    filteredData.forEach(row => {
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
            equipment: row.equipment || '',
            combatExp: row.combatExp || '',
            gainedExp,
            uuid: row.uuid || '',
          });
        }
      } catch {
        // Skip invalid rows
      }
    });

    // Sort by timestamp descending (most recent first) for display
    return result.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [filteredData]);

  // Calculate total gained exp for the hour (sum of all gained exp, not total exp)
  // Only count combat skills for Performance tab
  const totalGainedExpThisHour = useMemo(
    () => displayData.filter(row => COMBAT_SKILLS.includes(row.skill)).reduce((sum, row) => sum + row.gainedExp, 0),
    [displayData],
  );

  // Calculate current hour - must be a hook to maintain hook order
  const currentHour = useMemo(() => {
    try {
      return hourlyExp?.currentHour ?? new Date().getHours();
    } catch {
      return new Date().getHours();
    }
  }, [hourlyExp?.currentHour]);

  // Calculate total gained exp formatted
  const totalGainedExp = useMemo(() => {
    try {
      return formatExp(totalGainedExpThisHour);
    } catch {
      return '0';
    }
  }, [totalGainedExpThisHour, formatExp]);

  // Calculate performance stats: max hit, avg hit, HP lost
  const performanceStats = useMemo((): PerformanceStats => {
    try {
      if (!Array.isArray(filteredData) || filteredData.length === 0) {
        return {
          maxHit: 0,
          avgHit: 0,
          meanHit: 0,
          modeHit: 0,
          avgHitsToKill: 0,
          maxHitByMonster: {},
          avgHitByMonster: {},
          meanHitByMonster: {},
          modeHitByMonster: {},
          avgHitsToKillByMonster: {},
          maxDamageReceived: 0,
          avgDamageReceived: 0,
          meanDamageReceived: 0,
          modeDamageReceived: 0,
          maxDamageReceivedByMonster: {},
          avgDamageReceivedByMonster: {},
          meanDamageReceivedByMonster: {},
          modeDamageReceivedByMonster: {},
          hpLostPerHour: 0,
          hpLostPer15Min: 0,
        };
      }

      // Deduplicate entries: one entry per timestamp+skill (keep the one with highest gainedExp or most complete data)
      const uniqueEntriesMap = new Map<string, CSVRow>();

      filteredData.forEach(row => {
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
        } catch {
          // Skip invalid rows
        }
      });

      // Calculate overall stats for damage dealt (by user)
      const validHits = allDamageDealt.filter(d => d > 0);
      const maxHit = validHits.length > 0 ? Math.max(...validHits) : 0;
      const avgHit = validHits.length > 0 ? validHits.reduce((sum, d) => sum + d, 0) / validHits.length : 0;
      const meanHit = avgHit; // Mean is the same as average

      // Calculate mode hit (most frequent hit value)
      const hitFrequency: Record<number, number> = {};
      validHits.forEach(hit => {
        hitFrequency[hit] = (hitFrequency[hit] || 0) + 1;
      });
      const modeHit =
        Object.keys(hitFrequency).length > 0
          ? parseInt(Object.entries(hitFrequency).sort((a, b) => b[1] - a[1])[0][0], 10)
          : 0;

      // Calculate avg hits to kill (average number of hits per fight)
      // Each row with damageDealt represents a fight, count hits per fight
      const hitsPerFight: number[] = [];
      uniqueEntries.forEach(row => {
        const damageDealtStr = row.damageDealt || '';
        if (damageDealtStr) {
          const damageValues = damageDealtStr
            .split(';')
            .map(d => d.trim())
            .filter(d => d.length > 0)
            .map(d => parseInt(String(d).replace(/,/g, ''), 10))
            .filter(d => !isNaN(d) && d > 0);

          if (damageValues.length > 0) {
            hitsPerFight.push(damageValues.length);
          }
        }
      });

      const avgHitsToKill =
        hitsPerFight.length > 0 ? hitsPerFight.reduce((sum, count) => sum + count, 0) / hitsPerFight.length : 0;

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
      const meanHitByMonster: Record<string, number> = {};
      const modeHitByMonster: Record<string, number> = {};
      const avgHitsToKillByMonster: Record<string, number> = {};

      // Calculate per-monster stats for damage received
      const maxDamageReceivedByMonster: Record<string, number> = {};
      const avgDamageReceivedByMonster: Record<string, number> = {};
      const meanDamageReceivedByMonster: Record<string, number> = {};
      const modeDamageReceivedByMonster: Record<string, number> = {};

      // Track hits per fight per monster for avgHitsToKill calculation
      const monsterHitsPerFight: Record<string, number[]> = {};

      // First pass: collect hits per fight for each monster
      uniqueEntries.forEach(row => {
        try {
          const rawMonster = row.monster || 'Unknown';
          const displayName = rawMonster.trim() || 'Unknown';

          const damageDealtStr = row.damageDealt || '';
          if (damageDealtStr) {
            const damageValues = damageDealtStr
              .split(';')
              .map(d => d.trim())
              .filter(d => d.length > 0)
              .map(d => parseInt(String(d).replace(/,/g, ''), 10))
              .filter(d => !isNaN(d) && d >= 0);

            if (damageValues.length > 0) {
              if (!monsterHitsPerFight[displayName]) {
                monsterHitsPerFight[displayName] = [];
              }
              monsterHitsPerFight[displayName].push(damageValues.length);
            }
          }
        } catch {
          // Skip invalid rows
        }
      });

      Object.entries(monsterStats).forEach(([, stats]) => {
        // Use display name for the key (preserves original casing/formatting)
        const monsterDisplayName = stats.displayName;

        // Damage dealt stats - all hits for this monster are already aggregated in stats.damage
        const validMonsterHits = stats.damage.filter(d => d > 0);
        if (validMonsterHits.length > 0) {
          // Calculate max from all accumulated hits for this monster
          maxHitByMonster[monsterDisplayName] = Math.max(...validMonsterHits);
          // Calculate average from all accumulated hits for this monster
          const avg = validMonsterHits.reduce((sum, d) => sum + d, 0) / validMonsterHits.length;
          avgHitByMonster[monsterDisplayName] = avg;
          meanHitByMonster[monsterDisplayName] = avg; // Mean is the same as average

          // Calculate mode hit for this monster
          const monsterHitFrequency: Record<number, number> = {};
          validMonsterHits.forEach(hit => {
            monsterHitFrequency[hit] = (monsterHitFrequency[hit] || 0) + 1;
          });
          modeHitByMonster[monsterDisplayName] =
            Object.keys(monsterHitFrequency).length > 0
              ? parseInt(Object.entries(monsterHitFrequency).sort((a, b) => b[1] - a[1])[0][0], 10)
              : 0;

          // Calculate average hits to kill for this monster
          const hitsPerFightForMonster = monsterHitsPerFight[monsterDisplayName] || [];
          if (hitsPerFightForMonster.length > 0) {
            avgHitsToKillByMonster[monsterDisplayName] =
              hitsPerFightForMonster.reduce((sum, count) => sum + count, 0) / hitsPerFightForMonster.length;
          }
        }

        // Damage received stats - all received damage for this monster are already aggregated in stats.received
        const validMonsterReceived = stats.received.filter(d => d > 0);
        if (validMonsterReceived.length > 0) {
          // Calculate max from all accumulated received damage for this monster
          maxDamageReceivedByMonster[monsterDisplayName] = Math.max(...validMonsterReceived);
          // Calculate average from all accumulated received damage for this monster
          const avgReceived = validMonsterReceived.reduce((sum, d) => sum + d, 0) / validMonsterReceived.length;
          avgDamageReceivedByMonster[monsterDisplayName] = avgReceived;
          meanDamageReceivedByMonster[monsterDisplayName] = avgReceived; // Mean is the same as average

          // Calculate mode damage received for this monster
          const monsterReceivedFrequency: Record<number, number> = {};
          validMonsterReceived.forEach(hit => {
            monsterReceivedFrequency[hit] = (monsterReceivedFrequency[hit] || 0) + 1;
          });
          modeDamageReceivedByMonster[monsterDisplayName] =
            Object.keys(monsterReceivedFrequency).length > 0
              ? parseInt(Object.entries(monsterReceivedFrequency).sort((a, b) => b[1] - a[1])[0][0], 10)
              : 0;
        }
      });

      return {
        maxHit,
        avgHit,
        meanHit,
        modeHit,
        avgHitsToKill,
        maxHitByMonster,
        avgHitByMonster,
        meanHitByMonster,
        modeHitByMonster,
        avgHitsToKillByMonster,
        maxDamageReceived,
        avgDamageReceived,
        meanDamageReceived: avgDamageReceived, // Mean is the same as average
        modeDamageReceived: (() => {
          const receivedFrequency: Record<number, number> = {};
          validReceived.forEach(hit => {
            receivedFrequency[hit] = (receivedFrequency[hit] || 0) + 1;
          });
          return Object.keys(receivedFrequency).length > 0
            ? parseInt(Object.entries(receivedFrequency).sort((a, b) => b[1] - a[1])[0][0], 10)
            : 0;
        })(),
        maxDamageReceivedByMonster,
        avgDamageReceivedByMonster,
        meanDamageReceivedByMonster,
        modeDamageReceivedByMonster,
        hpLostPerHour,
        hpLostPer15Min,
      };
    } catch {
      return {
        maxHit: 0,
        avgHit: 0,
        meanHit: 0,
        modeHit: 0,
        avgHitsToKill: 0,
        maxHitByMonster: {},
        avgHitByMonster: {},
        meanHitByMonster: {},
        modeHitByMonster: {},
        avgHitsToKillByMonster: {},
        maxDamageReceived: 0,
        avgDamageReceived: 0,
        meanDamageReceived: 0,
        modeDamageReceived: 0,
        maxDamageReceivedByMonster: {},
        avgDamageReceivedByMonster: {},
        meanDamageReceivedByMonster: {},
        modeDamageReceivedByMonster: {},
        hpLostPerHour: 0,
        hpLostPer15Min: 0,
      };
    }
  }, [filteredData]);

  // Calculate location-specific stats (only for specific locations, not 'all')
  const locationStats = useMemo(() => {
    if (selectedLocation === 'all' || !Array.isArray(filteredData) || filteredData.length === 0) {
      return {
        totalFights: 0,
        avgDamagePer15Min: 0,
        maxDamagePer15Min: 0,
        avgHitsToKill: 0,
      };
    }

    // Deduplicate entries
    const uniqueEntriesMap = new Map<string, CSVRow>();
    filteredData.forEach(row => {
      const skill = row.skill || '';
      const key = `${row.timestamp}-${skill}`;
      const existing = uniqueEntriesMap.get(key);

      if (!existing) {
        uniqueEntriesMap.set(key, row);
      } else {
        const existingGainedExp = parseInt(existing.gainedExp || '0', 10) || 0;
        const currentGainedExp = parseInt(row.gainedExp || '0', 10) || 0;
        if (currentGainedExp > existingGainedExp || (currentGainedExp === existingGainedExp && row.skillLevel)) {
          uniqueEntriesMap.set(key, row);
        }
      }
    });

    const uniqueEntries = Array.from(uniqueEntriesMap.values());

    // Count total fights (entries with damageDealt)
    // IMPORTANT: Deduplicate by UUID since each fight creates multiple rows (one per combat skill)
    // All rows from the same fight share the same UUID
    const fightUUIDs = new Set<string>();
    uniqueEntries.forEach(row => {
      if (row.damageDealt && row.damageDealt.trim().length > 0 && row.uuid) {
        fightUUIDs.add(row.uuid);
      }
    });
    const totalFights = fightUUIDs.size;

    // Calculate total damage received from all tracked entries
    let totalDamageReceived = 0;
    const damageBy15Min: Record<number, number> = {};
    const timestamps = uniqueEntries.map(row => new Date(row.timestamp).getTime()).filter(ts => !isNaN(ts));

    if (timestamps.length === 0) {
      return {
        totalFights,
        avgDamagePer15Min: 0,
        maxDamagePer15Min: 0,
        avgHitsToKill: 0,
      };
    }

    const earliestTime = Math.min(...timestamps);
    const latestTime = Math.max(...timestamps);
    const elapsedMinutes = Math.max(1, (latestTime - earliestTime) / (1000 * 60));

    // Sum all damage received values and track per 15-minute interval
    uniqueEntries.forEach(row => {
      const damageReceivedStr = row.damageReceived || '';
      if (damageReceivedStr) {
        const receivedValues = damageReceivedStr
          .split(';')
          .map(d => d.trim())
          .filter(d => d.length > 0)
          .map(d => parseInt(String(d).replace(/,/g, ''), 10))
          .filter(d => !isNaN(d) && d >= 0);

        if (receivedValues.length > 0) {
          const rowDamage = receivedValues.reduce((sum, d) => sum + d, 0);
          totalDamageReceived += rowDamage;

          // Track damage per 15-minute interval for max calculation
          const rowTime = new Date(row.timestamp).getTime();
          const minutesFromStart = (rowTime - earliestTime) / (1000 * 60);
          const interval15Min = Math.floor(minutesFromStart / 15);

          if (!damageBy15Min[interval15Min]) {
            damageBy15Min[interval15Min] = 0;
          }
          damageBy15Min[interval15Min] += rowDamage;
        }
      }
    });

    // Calculate average damage per 15 minutes: total damage / (elapsed minutes / 15)
    // This gives the average rate of damage per 15-minute period
    const avgDamagePer15Min = elapsedMinutes > 0 ? (totalDamageReceived / elapsedMinutes) * 15 : 0;

    // Max damage per 15 minutes: maximum damage in any single 15-minute interval
    const damagePer15MinValues = Object.values(damageBy15Min);
    const maxDamagePer15Min = damagePer15MinValues.length > 0 ? Math.max(...damagePer15MinValues) : 0;

    // Calculate average equipment stats
    // Note: Equipment data needs to be stored in CSVRow for this to work
    // For now, we'll try to parse equipment from a JSON string if it exists in CSVRow
    // This assumes equipment is stored as a JSON string in a future CSVRow field
    let avgEquipment: { items: Record<string, EquipmentItem>; totals: EquipmentData['totals'] } | undefined = undefined;

    // Try to collect equipment data (if it exists in CSVRow)
    const equipmentEntries: EquipmentData[] = [];
    uniqueEntries.forEach(row => {
      if (row.equipment && row.equipment.trim().length > 0) {
        try {
          const equipment = JSON.parse(row.equipment) as EquipmentData;
          if (equipment && typeof equipment === 'object') {
            equipmentEntries.push(equipment);
          }
        } catch {
          // Invalid JSON, skip this equipment entry
        }
      }
    });

    if (equipmentEntries.length > 0) {
      // Calculate average equipment
      const slotCounts: Record<string, number> = {};
      const slotSums: Record<string, { name: string; imageUrl?: string; enchant?: string; count: number }> = {};
      const totalsSum = { armour: 0, aim: 0, power: 0, travelTime: 0 };
      let totalsCount = 0;

      equipmentEntries.forEach(eq => {
        // Count equipment items by slot (exclude 'totals' which is not an EquipmentItem)
        const slots: Array<Exclude<keyof EquipmentData, 'totals'>> = [
          'helm',
          'shield',
          'body',
          'weapon',
          'legs',
          'gloves',
          'boots',
          'horse',
          'trophy',
        ];
        slots.forEach(slot => {
          const item = eq[slot];
          if (item && 'name' in item) {
            // Type guard: ensure item is EquipmentItem (has 'name' property)
            if (!slotCounts[slot]) {
              slotCounts[slot] = 0;
              slotSums[slot] = { name: item.name, imageUrl: item.imageUrl, enchant: item.enchant, count: 0 };
            }
            slotCounts[slot]++;
            // Use the most common item name/image/enchant for each slot
            if (slotSums[slot].name === item.name) {
              slotSums[slot].count++;
              // Update enchant if this item has one and we don't have one yet
              if (item.enchant && !slotSums[slot].enchant) {
                slotSums[slot].enchant = item.enchant;
              }
            }
          }
        });

        // Sum totals
        if (eq.totals) {
          if (eq.totals.armour !== undefined) totalsSum.armour += eq.totals.armour;
          if (eq.totals.aim !== undefined) totalsSum.aim += eq.totals.aim;
          if (eq.totals.power !== undefined) totalsSum.power += eq.totals.power;
          if (eq.totals.travelTime !== undefined) totalsSum.travelTime += eq.totals.travelTime;
          totalsCount++;
        }
      });

      // Build average equipment items (use most common item per slot)
      const avgItems: Record<string, EquipmentItem> = {};
      Object.entries(slotSums).forEach(([slot, data]) => {
        if (data.count > 0) {
          avgItems[slot] = {
            slot,
            name: data.name,
            imageUrl: data.imageUrl,
            enchant: data.enchant,
          };
        }
      });

      // Calculate average totals
      const avgTotals: EquipmentData['totals'] = {};
      if (totalsCount > 0) {
        if (totalsSum.armour > 0) avgTotals.armour = totalsSum.armour / totalsCount;
        if (totalsSum.aim > 0) avgTotals.aim = totalsSum.aim / totalsCount;
        if (totalsSum.power > 0) avgTotals.power = totalsSum.power / totalsCount;
        if (totalsSum.travelTime > 0) avgTotals.travelTime = totalsSum.travelTime / totalsCount;
      }

      avgEquipment = { items: avgItems, totals: avgTotals };
    }

    // Calculate average hits to kill for this location
    const hitsPerFightForLocation: number[] = [];
    uniqueEntries.forEach(row => {
      const damageDealtStr = row.damageDealt || '';
      if (damageDealtStr) {
        const damageValues = damageDealtStr
          .split(';')
          .map(d => d.trim())
          .filter(d => d.length > 0)
          .map(d => parseInt(String(d).replace(/,/g, ''), 10))
          .filter(d => !isNaN(d) && d >= 0);

        if (damageValues.length > 0) {
          hitsPerFightForLocation.push(damageValues.length);
        }
      }
    });

    const avgHitsToKill =
      hitsPerFightForLocation.length > 0
        ? hitsPerFightForLocation.reduce((sum, count) => sum + count, 0) / hitsPerFightForLocation.length
        : 0;

    return {
      totalFights,
      avgDamagePer15Min,
      maxDamagePer15Min,
      avgEquipment,
      avgHitsToKill,
    };
  }, [selectedLocation, filteredData]);

  const handleClearCurrentHour = async () => {
    if (
      confirm(
        `Are you sure you want to clear all tracked data for hour ${currentHour}:00? This action cannot be undone.`,
      )
    ) {
      try {
        await clearByHour(currentHour);
        alert(`Data for hour ${currentHour}:00 cleared successfully!`);
      } catch {
        alert('Error clearing data for current hour');
      }
    }
  };

  return {
    // State
    selectedLocation,
    setSelectedLocation,
    selectedMonster,
    setSelectedMonster,
    loading,
    userStats,

    // Data
    locations,
    monsters,
    totalGainedExp,
    performanceStats,
    locationStats,
    currentHour,

    // Handlers
    handleClearCurrentHour,
  };
};
