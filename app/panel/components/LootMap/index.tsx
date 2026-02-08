import LootGrid from './LootGrid';
import LootTable from './LootTable';
import { useLootMap } from './useLootMap';
import { GridViewIcon, SettingsIcon, TableViewIcon, ZoomInIcon, ZoomOutIcon } from '@app/assets/icons';
import {
  cn,
  Card,
  CardContent,
  Input,
  Button,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  IconButton,
  CardFooter,
  CardDescription,
} from '@app/components';
import { memo, useState } from 'react';
import type { TimeFilterOption, SortOption } from './useLootMap';

type ViewMode = 'table' | 'grid';

/**
 * LootMap Component
 * Pure JSX component - all logic is in useLootMap hook
 */
const LootMap = memo(() => {
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [zoomLevel, setZoomLevel] = useState(18); // Default zoom level (18 = ~3 columns base, range 1-20)
  const {
    loading,
    searchQuery,
    setSearchQuery,
    filterMonster,
    setFilterMonster,
    filterLocation,
    setFilterLocation,
    timeFilter,
    setTimeFilter,
    sortOption,
    setSortOption,
    isSettingsOpen,
    setIsSettingsOpen,
    tempItemValues,
    isSaving,
    allUniqueItems,
    uniqueMonsters,
    uniqueLocations,
    sortedAndGroupedLoot,
    filteredLootEntries,
    handleOpenSettings,
    handleCloseSettings,
    handleSaveItemValues,
    handleItemValueChange,
  } = useLootMap();

  if (loading) {
    return <div className={cn('p-4 text-lg font-semibold')}>Loading tracked data...</div>;
  }

  return (
    <div className={cn('flex flex-col gap-4')}>
      {/* Search and Filter Controls */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <div className="min-w-0 flex-1">
              <Input
                placeholder="Search by item name, location, or monster..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full"
              />
            </div>
            <div className="flex min-w-0 flex-wrap gap-2">
              <select
                value={filterMonster}
                onChange={e => setFilterMonster(e.target.value)}
                className={cn(
                  'flex h-10 min-w-[120px] max-w-[150px] flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-[hsl(var(--secondary))]',
                )}>
                <option value="none">All Monsters</option>
                {uniqueMonsters.map(monster => (
                  <option key={monster} value={monster}>
                    {monster}
                  </option>
                ))}
              </select>
              <select
                value={filterLocation}
                onChange={e => setFilterLocation(e.target.value)}
                className={cn(
                  'flex h-10 min-w-[120px] max-w-[150px] flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-[hsl(var(--secondary))]',
                )}>
                <option value="none">All Locations</option>
                {uniqueLocations.map(location => (
                  <option key={location} value={location}>
                    {location}
                  </option>
                ))}
              </select>
              <select
                value={timeFilter}
                onChange={e => setTimeFilter(e.target.value as TimeFilterOption)}
                className={cn(
                  'flex h-10 min-w-[120px] max-w-[150px] flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-[hsl(var(--secondary))]',
                )}>
                <option value="none">All Time</option>
                <option value="day">By Day</option>
                <option value="week">By Week</option>
                <option value="hour">By Hour</option>
              </select>
              <select
                value={sortOption}
                onChange={e => setSortOption(e.target.value as SortOption)}
                className={cn(
                  'flex h-10 min-w-[120px] max-w-[150px] flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-[hsl(var(--secondary))]',
                )}>
                <option value="totalValue">By Total Value</option>
                <option value="alphabetical">Alphabetical</option>
              </select>
              <IconButton
                onClick={() => setZoomLevel(prev => Math.max(1, prev - 1))}
                variant="outline"
                size="icon"
                label="Zoom Out"
                className="flex-shrink-0"
                Icon={ZoomOutIcon}
                disabled={zoomLevel <= 1}
              />
              <IconButton
                onClick={() => setZoomLevel(prev => Math.min(20, prev + 1))}
                variant="outline"
                size="icon"
                label="Zoom In"
                className="flex-shrink-0"
                Icon={ZoomInIcon}
                disabled={zoomLevel >= 20}
              />
              <IconButton
                onClick={() => setViewMode('table')}
                variant={viewMode === 'table' ? 'default' : 'outline'}
                size="icon"
                label="Table View"
                className={cn(
                  'flex-shrink-0',
                  viewMode === 'table' ? 'hover:bg-accent/80 bg-accent text-accent-foreground' : '',
                )}
                Icon={TableViewIcon}
              />
              <IconButton
                onClick={() => setViewMode('grid')}
                variant={viewMode === 'grid' ? 'default' : 'outline'}
                size="icon"
                label="Grid View"
                className={cn(
                  'flex-shrink-0',
                  viewMode === 'grid' ? 'hover:bg-accent/80 bg-accent text-accent-foreground' : '',
                )}
                Icon={GridViewIcon}
              />
              <IconButton
                onClick={handleOpenSettings}
                variant="outline"
                size="icon"
                label="Item Value Settings"
                className="flex-shrink-0"
                Icon={SettingsIcon}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Loot Table/Grid */}
      {sortedAndGroupedLoot.length === 0 || sortedAndGroupedLoot.every(group => group.entries.length === 0) ? (
        <Card>
          <CardContent className="p-8 text-center">No loot found.</CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="pt-6">
            {viewMode === 'table' ? (
              <LootTable
                sortedAndGroupedLoot={sortedAndGroupedLoot}
                filteredLootEntries={filteredLootEntries}
                zoomLevel={zoomLevel}
              />
            ) : (
              <LootGrid
                filteredLootEntries={filteredLootEntries}
                sortedAndGroupedLoot={sortedAndGroupedLoot}
                sortOption={sortOption}
                timeFilter={timeFilter}
                zoomLevel={zoomLevel}
              />
            )}
          </CardContent>
          <CardFooter className="flex justify-end">
            <CardDescription className="text-sm text-muted-foreground">
              {filteredLootEntries?.map(item => item.totalValue).reduce((acc, curr) => acc + curr, 0)} GP
            </CardDescription>
          </CardFooter>
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
              <div className="py-8 text-center text-muted-foreground">No items have been tracked yet.</div>
            ) : (
              <div className="space-y-3">
                {allUniqueItems.map(itemName => (
                  <div key={itemName} className="flex items-center gap-3">
                    <label
                      className="w-48 truncate text-sm font-medium text-popover-foreground"
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
