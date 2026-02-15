import { ResolutionTable } from "./ResolutionTable";
import { useUntrackedResolution } from "@app/hooks/data/useUntrackedResolution";
import { memo, useCallback, useState } from "react";

interface UntrackedExpBannerProps {
  onExpandChange?: (expanded: boolean) => void;
}

const UntrackedExpBanner = memo(({ onExpandChange }: UntrackedExpBannerProps) => {
  const { unresolvedGaps, knownItems, hasUnresolved, getInitialRows, saveResolution } = useUntrackedResolution();
  const [expanded, setExpanded] = useState(false);
  const [currentGapIndex, setCurrentGapIndex] = useState(0);

  const toggle = useCallback(() => {
    setExpanded(prev => {
      const next = !prev;
      onExpandChange?.(next);
      return next;
    });
  }, [onExpandChange]);

  const handleDismiss = useCallback(
    async (gapRecordIds: string[]) => {
      // Save with empty rows to just mark as resolved
      const gapDate = new Date(unresolvedGaps[currentGapIndex]?.startUTC ?? Date.now());
      await saveResolution(gapRecordIds, [], gapDate);
      // Move to next gap or collapse
      if (currentGapIndex >= unresolvedGaps.length - 1) {
        setCurrentGapIndex(0);
        setExpanded(false);
        onExpandChange?.(false);
      }
    },
    [unresolvedGaps, currentGapIndex, saveResolution, onExpandChange],
  );

  const handleSaveComplete = useCallback(() => {
    // After save, the gap is resolved and will disappear from unresolvedGaps
    // If no more gaps, collapse
    if (unresolvedGaps.length <= 1) {
      setExpanded(false);
      onExpandChange?.(false);
      setCurrentGapIndex(0);
    } else if (currentGapIndex >= unresolvedGaps.length - 1) {
      setCurrentGapIndex(prev => Math.max(0, prev - 1));
    }
  }, [unresolvedGaps.length, currentGapIndex, onExpandChange]);

  if (!hasUnresolved) return null;

  const currentGap = unresolvedGaps[currentGapIndex];
  if (!currentGap) return null;

  return (
    <div className="mx-4 mt-2">
      {/* Collapsed notification bar */}
      <div
        className="border-destructive/30 bg-destructive/5 cursor-pointer rounded-lg border px-4 py-2.5"
        onClick={toggle}
        role="button"
        tabIndex={0}
        onKeyDown={e => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            toggle();
          }
        }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground">
              !
            </span>
            <span className="text-sm font-medium text-foreground">Untracked EXP detected!</span>
            <span className="text-xs text-muted-foreground">
              {expanded ? "Click to collapse." : "Click to resolve."}
            </span>
          </div>
          <span className="text-xs text-muted-foreground">
            {unresolvedGaps.length} period{unresolvedGaps.length !== 1 ? "s" : ""}
          </span>
        </div>
      </div>

      {/* Expanded resolution editor */}
      <div
        className="grid transition-[grid-template-rows] duration-300 ease-in-out"
        style={{ gridTemplateRows: expanded ? "1fr" : "0fr" }}>
        <div className="overflow-hidden">
          <div className="border-destructive/20 rounded-b-lg border border-t-0 bg-card p-4">
            {/* Gap navigation (if multiple) */}
            {unresolvedGaps.length > 1 && (
              <div className="mb-3 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setCurrentGapIndex(prev => Math.max(0, prev - 1))}
                  disabled={currentGapIndex === 0}
                  className="text-xs text-muted-foreground hover:text-foreground disabled:opacity-30">
                  ← Prev
                </button>
                <span className="text-xs text-muted-foreground">
                  Gap {currentGapIndex + 1} of {unresolvedGaps.length}
                </span>
                <button
                  type="button"
                  onClick={() => setCurrentGapIndex(prev => Math.min(unresolvedGaps.length - 1, prev + 1))}
                  disabled={currentGapIndex === unresolvedGaps.length - 1}
                  className="text-xs text-muted-foreground hover:text-foreground disabled:opacity-30">
                  Next →
                </button>
              </div>
            )}

            <ResolutionTable
              key={currentGap.id}
              gap={currentGap}
              initialRows={getInitialRows(currentGap)}
              knownItems={knownItems}
              onSave={async (ids, resolvedRows, date) => {
                await saveResolution(ids, resolvedRows, date);
                handleSaveComplete();
              }}
              onDismiss={handleDismiss}
            />
          </div>
        </div>
      </div>
    </div>
  );
});

UntrackedExpBanner.displayName = "UntrackedExpBanner";

export { UntrackedExpBanner };
