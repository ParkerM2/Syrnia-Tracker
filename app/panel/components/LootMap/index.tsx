import LootGrid from "./LootGrid";
import LootTable from "./LootTable";
import { useLootMap } from "./useLootMap";
import { FilterIcon, GridViewIcon, SettingsIcon, TableViewIcon, ZoomInIcon, ZoomOutIcon } from "@app/assets/icons";
import {
  cn,
  Card,
  CardContent,
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
  Input,
  Popover,
  PopoverTrigger,
  PopoverContent,
  Select,
  Tabs,
  TabsList,
  TabsTrigger,
} from "@app/components";
import { memo, useState } from "react";
import type { TimeFilterOption, SortOption, SourceFilterOption } from "./useLootMap";

type ViewMode = "table" | "grid";

/**
 * LootMap Component
 * Pure JSX component - all logic is in useLootMap hook
 */
const LootMap = memo(() => {
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [zoomLevel, setZoomLevel] = useState(8);
  const {
    loading,
    sourceFilter,
    setSourceFilter,
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
    return <div className={cn("p-4 text-lg font-semibold")}>Loading tracked data...</div>;
  }

  return (
    <div className={cn("flex min-h-full min-w-full flex-col gap-4")}>
      {/* Header Bar */}
      <div className="flex flex-row items-center gap-4">
        {/* Center: Time period tabs */}
        <div className="flex flex-1 justify-center">
          <Tabs value={timeFilter} onValueChange={v => setTimeFilter(v as TimeFilterOption)}>
            <TabsList>
              <TabsTrigger value="none">All</TabsTrigger>
              <TabsTrigger value="hour">Hour</TabsTrigger>
              <TabsTrigger value="day">Day</TabsTrigger>
              <TabsTrigger value="month">Month</TabsTrigger>
              <TabsTrigger value="year">Year</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      {/* Content */}
      {sortedAndGroupedLoot.length === 0 || sortedAndGroupedLoot.every(group => group.entries.length === 0) ? (
        <Card>
          <CardContent className="p-8 text-center">No loot found.</CardContent>
        </Card>
      ) : (
        <Card className="p-2">
          <div className="flex w-full items-center justify-between gap-1">
            <div className="flex flex-row items-center justify-start gap-2">
              <IconButton
                onClick={() => setViewMode("table")}
                variant={viewMode === "table" ? "default" : "outline"}
                size="icon"
                label="Table View"
                className={cn(
                  "flex-shrink-0",
                  viewMode === "table" ? "hover:bg-accent/80 bg-accent text-accent-foreground" : "",
                )}
                Icon={TableViewIcon}
              />
              <IconButton
                onClick={() => setViewMode("grid")}
                variant={viewMode === "grid" ? "default" : "outline"}
                size="icon"
                label="Grid View"
                className={cn(
                  "flex-shrink-0",
                  viewMode === "grid" ? "hover:bg-accent/80 bg-accent text-accent-foreground" : "",
                )}
                Icon={GridViewIcon}
              />
              <span className="text-sm font-medium text-foreground">
                {viewMode === "table" ? "Table View" : "Grid View"}
              </span>
            </div>
            <div className="flex flex-row items-center justify-end gap-1">
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="icon" aria-label="Filters" title="Filters" className="flex-shrink-0">
                    <FilterIcon className="h-4 w-4" aria-hidden="true" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent align="end" className="w-64 space-y-3">
                  <div className="space-y-1">
                    <span className="text-sm font-medium">Source</span>
                    <Select value={sourceFilter} onChange={e => setSourceFilter(e.target.value as SourceFilterOption)}>
                      <option value="all">All Items</option>
                      <option value="drops">Drops Only</option>
                      <option value="produced">Produced Only</option>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <span className="text-sm font-medium">Monster</span>
                    <Select value={filterMonster} onChange={e => setFilterMonster(e.target.value)}>
                      <option value="none">All Monsters</option>
                      {uniqueMonsters.map(monster => (
                        <option key={monster} value={monster}>
                          {monster}
                        </option>
                      ))}
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <span className="text-sm font-medium">Location</span>
                    <Select value={filterLocation} onChange={e => setFilterLocation(e.target.value)}>
                      <option value="none">All Locations</option>
                      {uniqueLocations.map(location => (
                        <option key={location} value={location}>
                          {location}
                        </option>
                      ))}
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <span className="text-sm font-medium">Sort</span>
                    <Select value={sortOption} onChange={e => setSortOption(e.target.value as SortOption)}>
                      <option value="totalValue">By Total Value</option>
                      <option value="alphabetical">Alphabetical</option>
                    </Select>
                  </div>
                </PopoverContent>
              </Popover>
              <IconButton
                onClick={handleOpenSettings}
                variant="outline"
                size="icon"
                label="Item Value Settings"
                className="flex-shrink-0"
                Icon={SettingsIcon}
              />
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
            </div>
          </div>
          <CardContent className="pt-2">
            {viewMode === "table" ? (
              <LootTable filteredLootEntries={filteredLootEntries} timeFilter={timeFilter} zoomLevel={zoomLevel} />
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
                      value={tempItemValues[itemName] || ""}
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
              {isSaving ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
});

LootMap.displayName = "LootMap";

export default LootMap;
