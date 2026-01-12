import { useHourlyExp, useTrackedDataQuery, useFormatting, useItemValuesQuery } from '@extension/shared';
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
  Input,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@extension/ui';
import { useMemo, memo, useState, useCallback } from 'react';

// Component for drop badge with image (for LootMap table)
const DropBadgeTable = memo(
  ({
    drop,
    itemValues,
    parseDropAmount,
  }: {
    drop: string;
    itemValues: Record<string, string>;
    parseDropAmount: (dropString: string) => { amount: number; name: string };
  }) => {
    const [imageError, setImageError] = useState(false);
    const { amount, name } = parseDropAmount(drop);
    const itemValue = parseFloat(itemValues[name] || '0') || 0;
    const totalValue = amount * itemValue;
    const imageUrl = `https://www.syrnia.com/images/inventory/${name.replace(/\s/g, '%20')}.png`;

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
            {amount.toLocaleString()}
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

DropBadgeTable.displayName = 'DropBadgeTable';

const LootMap = memo(() => {
  const hourlyExp = useHourlyExp();
  const { dataByHour, allData, loading } = useTrackedDataQuery();
  const { formatTime, parseDrops, parseDropAmount } = useFormatting();
  const { itemValues, save, isSaving } = useItemValuesQuery();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [tempItemValues, setTempItemValues] = useState<Record<string, string>>({});

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

  // Get all unique drop item names from ALL tracked data (not just current hour)
  const allUniqueItems = useMemo(() => {
    const items = new Set<string>();
    allData.forEach(row => {
      const drops = parseDrops(row.drops || '');
      drops.forEach(drop => {
        const { name } = parseDropAmount(drop);
        items.add(name);
      });
    });
    return Array.from(items).sort();
  }, [allData, parseDrops, parseDropAmount]);

  // Handle settings dialog open
  const handleOpenSettings = useCallback(() => {
    setTempItemValues({ ...itemValues });
    setIsSettingsOpen(true);
  }, [itemValues]);

  // Handle settings dialog close
  const handleCloseSettings = useCallback(() => {
    setIsSettingsOpen(false);
    setTempItemValues({});
  }, []);

  // Handle save item values
  const handleSaveItemValues = useCallback(async () => {
    try {
      await save(tempItemValues);
      setIsSettingsOpen(false);
    } catch (error) {
      console.error('Error saving item values:', error);
      alert('Error saving item values');
    }
  }, [tempItemValues, save]);

  // Handle item value change in form
  const handleItemValueChange = useCallback((itemName: string, value: string) => {
    setTempItemValues(prev => ({
      ...prev,
      [itemName]: value,
    }));
  }, []);

  // Calculate total HP used for the hour from fight log
  const totalHpUsedThisHour = useMemo(() => {
    // Sum all hpUsed values from fight log (parsed from "gained X HP" lines)
    let totalHpUsed = 0;
    currentHourData.forEach(row => {
      if (row.hpUsed && row.hpUsed.trim() !== '') {
        const hpUsedValue = parseInt(row.hpUsed.replace(/,/g, ''), 10);
        if (!isNaN(hpUsedValue) && hpUsedValue > 0) {
          totalHpUsed += hpUsedValue;
        }
      }
    });
    return totalHpUsed > 0 ? totalHpUsed : null;
  }, [currentHourData]);

  // Prepare table data - entries with drops, HP, and profit calculations
  const tableData = useMemo(() => {
    // Get entries with drops
    const entries = currentHourData
      .filter(row => {
        const drops = parseDrops(row.drops || '');
        return drops.length > 0;
      })
      .map(row => ({
        timestamp: row.timestamp,
        drops: parseDrops(row.drops || ''),
      }));

    // Calculate HP used, drop values, HP values, and net profit for each entry
    // Create a map of timestamp to hpUsed from fight log
    const hpUsedMap = new Map<string, number>();
    currentHourData.forEach(row => {
      if (row.hpUsed && row.hpUsed.trim() !== '') {
        const hpUsedValue = parseInt(row.hpUsed.replace(/,/g, ''), 10);
        if (!isNaN(hpUsedValue) && hpUsedValue > 0) {
          hpUsedMap.set(row.timestamp, hpUsedValue);
        }
      }
    });

    const entriesWithProfit = entries.map(entry => {
      // Get HP used from fight log (parsed from "gained X HP" lines)
      const hpUsed = hpUsedMap.get(entry.timestamp) ?? null;

      // Calculate drop value
      let dropValue = 0;
      entry.drops.forEach(drop => {
        const { amount, name } = parseDropAmount(drop);
        const itemValue = parseFloat(itemValues[name] || '0');
        if (!isNaN(itemValue)) {
          dropValue += amount * itemValue;
        }
      });

      // Calculate HP value (HP used * 2.5)
      const hpValue = hpUsed !== null ? hpUsed * 2.5 : 0;

      // Calculate net profit (drop value - HP value)
      const netProfit = dropValue - hpValue;

      return {
        ...entry,
        hpUsed,
        dropValue,
        hpValue,
        netProfit,
      };
    });

    // Sort by timestamp descending (most recent first) for display
    return entriesWithProfit.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [currentHourData, parseDrops, parseDropAmount, itemValues]); // Added parseDropAmount and itemValues dependencies

  // Calculate total profit values for the hour
  const totalProfitValues = useMemo(() => {
    let totalDropValue = 0;

    tableData.forEach(entry => {
      totalDropValue += entry.dropValue;
    });

    // Use totalHpUsedThisHour for HP value calculation to ensure consistency
    // HP value = total HP used * 2.5
    const totalHpValue = totalHpUsedThisHour !== null ? totalHpUsedThisHour * 2.5 : 0;

    // Recalculate total net profit using the correct HP value
    const recalculatedNetProfit = totalDropValue - totalHpValue;

    return {
      totalDropValue,
      totalHpValue,
      totalNetProfit: recalculatedNetProfit,
    };
  }, [tableData, totalHpUsedThisHour]);

  if (loading) {
    return <div className={cn('p-4 text-lg font-semibold')}>Loading tracked data...</div>;
  }

  const currentHour = hourlyExp?.currentHour ?? new Date().getHours();

  return (
    <div className={cn('flex flex-col gap-4')}>
      {/* Summary Header */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <span className="text-lg font-semibold">Current Hour ({currentHour}:00)</span>
            <div className="flex items-center gap-3">
              <span className="text-xl font-bold">Total Drops: {totalDropsThisHour}</span>
              {totalHpUsedThisHour !== null && (
                <span className="text-xl font-bold">
                  HP Used:{' '}
                  <span
                    className={cn(
                      totalHpUsedThisHour > 0
                        ? 'text-red-500'
                        : totalHpUsedThisHour < 0
                          ? 'text-green-500'
                          : 'text-foreground',
                    )}>
                    {totalHpUsedThisHour > 0 ? '-' : ''}
                    {Math.abs(totalHpUsedThisHour).toLocaleString()}
                  </span>
                </span>
              )}
              {tableData.length > 0 && (
                <span className="text-xl font-bold">
                  Net Profit:{' '}
                  <span
                    className={cn(
                      totalProfitValues.totalNetProfit > 0
                        ? 'text-green-500'
                        : totalProfitValues.totalNetProfit < 0
                          ? 'text-red-500'
                          : 'text-foreground',
                    )}>
                    {totalProfitValues.totalNetProfit >= 0 ? '+' : ''}
                    {totalProfitValues.totalNetProfit.toLocaleString(undefined, {
                      minimumFractionDigits: 0,
                      maximumFractionDigits: 0,
                    })}{' '}
                    GP
                  </span>
                </span>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Profit Table */}
      {tableData.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">No drops tracked for this hour yet.</CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Profit</CardTitle>
              <Button onClick={handleOpenSettings} variant="outline" size="icon" aria-label="Item Value Settings">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round">
                  <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"></path>
                  <circle cx="12" cy="12" r="3"></circle>
                </svg>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Time</TableHead>
                    <TableHead>Drops</TableHead>
                    <TableHead>HP Used</TableHead>
                    <TableHead className="text-right">Drop Value</TableHead>
                    <TableHead className="text-right">HP Value</TableHead>
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
                              <DropBadgeTable
                                key={`${drop}-${dropIndex}`}
                                drop={drop}
                                itemValues={itemValues}
                                parseDropAmount={parseDropAmount}
                              />
                            ))}
                          </div>
                        </TableCell>
                        <TableCell>
                          {entry.hpUsed !== null ? (
                            <span
                              className={cn(
                                'font-semibold',
                                entry.hpUsed > 0
                                  ? 'text-red-500'
                                  : entry.hpUsed < 0
                                    ? 'text-green-500'
                                    : 'text-foreground',
                              )}>
                              {entry.hpUsed > 0 ? '-' : ''}
                              {Math.abs(entry.hpUsed).toLocaleString()}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <span className="font-semibold">
                            {entry.dropValue.toLocaleString(undefined, {
                              minimumFractionDigits: 0,
                              maximumFractionDigits: 0,
                            })}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <span className={cn('font-semibold', entry.hpValue > 0 ? 'text-red-500' : 'text-foreground')}>
                            {entry.hpValue.toLocaleString(undefined, {
                              minimumFractionDigits: 0,
                              maximumFractionDigits: 0,
                            })}
                          </span>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {/* Summary Row */}
                  {tableData.length > 0 && (
                    <TableRow className="bg-muted/50">
                      <TableCell colSpan={5} className="p-4">
                        <div className="flex flex-col gap-2">
                          <div className="mb-1 text-sm font-bold">Summary:</div>
                          <div className="flex flex-col gap-1 text-sm">
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Total Value of drops:</span>
                              <span className="font-semibold">
                                {totalProfitValues.totalDropValue.toLocaleString(undefined, {
                                  minimumFractionDigits: 0,
                                  maximumFractionDigits: 0,
                                })}{' '}
                                GP
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Total HP value:</span>
                              <span className="font-semibold text-red-500">
                                {totalProfitValues.totalHpValue.toLocaleString(undefined, {
                                  minimumFractionDigits: 0,
                                  maximumFractionDigits: 0,
                                })}{' '}
                                GP
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Total Net Profit:</span>
                              <span
                                className={cn(
                                  'font-semibold',
                                  totalProfitValues.totalNetProfit > 0
                                    ? 'text-green-500'
                                    : totalProfitValues.totalNetProfit < 0
                                      ? 'text-red-500'
                                      : 'text-foreground',
                                )}>
                                {totalProfitValues.totalNetProfit >= 0 ? '+' : ''}
                                {totalProfitValues.totalNetProfit.toLocaleString(undefined, {
                                  minimumFractionDigits: 0,
                                  maximumFractionDigits: 0,
                                })}{' '}
                                GP
                              </span>
                            </div>
                          </div>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Settings Dialog */}
      <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
        <DialogContent className="max-h-[80vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Item Value Settings</DialogTitle>
            <DialogDescription>
              Assign GP (gold pieces) values to all tracked items. These values will be used for profit calculations.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {allUniqueItems.length === 0 ? (
              <div className="text-muted-foreground py-8 text-center">No items have been tracked yet.</div>
            ) : (
              <div className="space-y-3">
                {allUniqueItems.map(itemName => (
                  <div key={itemName} className="flex items-center gap-3">
                    <label
                      className="text-popover-foreground w-48 truncate text-sm font-medium"
                      title={itemName}
                      htmlFor={`item-value-${itemName}`}>
                      {itemName}
                    </label>
                    <Input
                      id={`item-value-${itemName}`}
                      type="number"
                      placeholder="GP value"
                      value={tempItemValues[itemName] || ''}
                      onChange={e => handleItemValueChange(itemName, e.target.value)}
                      className="flex-1"
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleCloseSettings} disabled={isSaving}>
              Cancel
            </Button>
            <Button onClick={handleSaveItemValues} disabled={isSaving}>
              {isSaving ? 'Saving...' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
});

LootMap.displayName = 'LootMap';

export default LootMap;
