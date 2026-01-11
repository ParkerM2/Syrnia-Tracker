import { useHourlyExp, useTrackedData, useFormatting } from '@extension/shared';
import {
  cn,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Badge,
  Button,
} from '@extension/ui';
import { useMemo, memo } from 'react';

const LootMap = memo(() => {
  const hourlyExp = useHourlyExp();
  const { dataByHour, clearByHour, loading } = useTrackedData();
  const { formatTime, parseDrops, parseDropAmount } = useFormatting();

  // Get tracked data for current hour
  const currentHourData = useMemo(() => {
    if (!dataByHour || !hourlyExp?.currentHour) return [];
    try {
      const now = new Date();
      const data = dataByHour(hourlyExp.currentHour, now);
      // Sort by timestamp ascending (oldest first)
      return [...data].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    } catch (error) {
      console.error('Error processing hour data:', error);
      return [];
    }
  }, [dataByHour, hourlyExp?.currentHour]);

  // Aggregate drop counts and amounts from all entries
  const dropStats = useMemo(() => {
    const stats: Record<string, { count: number; totalAmount: number }> = {};

    currentHourData.forEach(row => {
      const drops = parseDrops(row.drops || '');
      drops.forEach(drop => {
        const { amount, name } = parseDropAmount(drop);

        if (!stats[name]) {
          stats[name] = { count: 0, totalAmount: 0 };
        }

        stats[name].count += 1;
        stats[name].totalAmount += amount;
      });
    });

    return stats;
  }, [currentHourData, parseDrops, parseDropAmount]); // parseDrops and parseDropAmount are stable from useFormatting hook but included for completeness

  // Calculate total drops for the hour (count of drop occurrences)
  const totalDropsThisHour = useMemo(
    () => Object.values(dropStats).reduce((sum, stat) => sum + stat.count, 0),
    [dropStats],
  );

  // Calculate HP used per hour
  const hpUsedThisHour = useMemo(() => {
    // Get all HP values from current hour data, sorted by timestamp
    const hpEntries = currentHourData
      .filter(row => row.hp && row.hp.trim() !== '')
      .map(row => {
        // Parse HP value (remove commas)
        const hpValue = parseInt(row.hp.replace(/,/g, ''), 10);
        return {
          timestamp: row.timestamp,
          hp: isNaN(hpValue) ? null : hpValue,
        };
      })
      .filter(entry => entry.hp !== null)
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    if (hpEntries.length < 2) {
      // Need at least 2 entries to calculate HP used
      return null;
    }

    // HP used = first HP - last HP (if HP decreased, this is positive)
    const firstHP = hpEntries[0].hp!;
    const lastHP = hpEntries[hpEntries.length - 1].hp!;
    const hpUsed = firstHP - lastHP;

    return {
      used: hpUsed,
      startHP: firstHP,
      endHP: lastHP,
    };
  }, [currentHourData]); // parseDrops not used in this calculation

  // Prepare table data - entries with drops
  const tableData = useMemo(() => {
    const entriesWithDrops: Array<{ timestamp: string; drops: string[] }> = [];

    currentHourData.forEach(row => {
      const drops = parseDrops(row.drops || '');
      if (drops.length > 0) {
        entriesWithDrops.push({
          timestamp: row.timestamp,
          drops: drops,
        });
      }
    });

    // Sort by timestamp descending (most recent first) for display
    return entriesWithDrops.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [currentHourData, parseDrops]); // parseDrops is used in the calculation

  if (loading) {
    return <div className={cn('p-4 text-lg font-semibold')}>Loading tracked data...</div>;
  }

  const currentHour = hourlyExp?.currentHour ?? new Date().getHours();

  // Get list of all drops sorted by total amount (descending), then by count
  const sortedDrops = Object.entries(dropStats).sort((a, b) => {
    // Sort by total amount first, then by count
    if (b[1].totalAmount !== a[1].totalAmount) {
      return b[1].totalAmount - a[1].totalAmount;
    }
    return b[1].count - a[1].count;
  });

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
      {/* Summary Header */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <span className="text-lg font-semibold">Current Hour ({currentHour}:00)</span>
            <div className="flex items-center gap-3">
              <span className="text-xl font-bold">Total Drops: {totalDropsThisHour}</span>
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

      {/* HP Used Section */}
      {hpUsedThisHour !== null && (
        <Card>
          <CardHeader>
            <CardTitle>HP Used This Hour</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground text-sm">HP Used:</span>
                <span
                  className={cn(
                    'text-lg font-semibold',
                    hpUsedThisHour.used > 0
                      ? 'text-red-500'
                      : hpUsedThisHour.used < 0
                        ? 'text-green-500'
                        : 'text-foreground',
                  )}>
                  {hpUsedThisHour.used > 0 ? '-' : ''}
                  {Math.abs(hpUsedThisHour.used).toLocaleString()}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-muted-foreground">Start HP:</span>
                  <p className="font-semibold">{hpUsedThisHour.startHP.toLocaleString()}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">End HP:</span>
                  <p className="font-semibold">{hpUsedThisHour.endHP.toLocaleString()}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Drop Counts - Show all tracked drops */}
      {sortedDrops.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Tracked Drops</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-3">
              {sortedDrops.map(([dropName, stats]) => (
                <Card key={dropName}>
                  <CardContent className="p-4">
                    <div className="mb-2 flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-base font-semibold">{dropName}</span>
                      </div>
                      <div className="flex flex-col gap-1 text-right">
                        <div>
                          <span className="text-muted-foreground text-sm">Total: </span>
                          <span className="font-semibold text-green-500">{stats.totalAmount.toLocaleString()}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground text-xs">Count: </span>
                          <span className="text-xs font-medium">{stats.count.toLocaleString()}</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Table of all tracked entries with drops */}
      {tableData.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">No drops tracked for this hour yet.</CardContent>
        </Card>
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Time</TableHead>
                  <TableHead>Drops</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tableData.map((entry, index) => {
                  const time = formatTime(entry.timestamp);

                  return (
                    <TableRow key={`${entry.timestamp}-${index}`}>
                      <TableCell>{time}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {entry.drops.map((drop, dropIndex) => (
                            <Badge key={`${drop}-${dropIndex}`} variant="secondary">
                              {drop}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </Card>
      )}
    </div>
  );
});

LootMap.displayName = 'LootMap';

export default LootMap;
