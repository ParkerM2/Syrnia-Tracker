import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@app/components";
import { cn } from "@app/utils/cn";
import { formatExp } from "@app/utils/formatting";
import { memo } from "react";
import type { CalendarCellData } from "./types";
import type { UntrackedExpRecord } from "@app/types";

interface CalendarCellProps {
  label: string;
  data: CalendarCellData;
  isToday?: boolean;
  isMuted?: boolean;
  compact?: boolean;
  onClick?: () => void;
}

const formatGP = (value: number) =>
  value.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 });

/**
 * Compute background opacity (0–25%) based on totalExp relative to a reasonable threshold.
 */
const getIntensityClass = (totalExp: number): string => {
  if (totalExp <= 0) return "";
  if (totalExp < 500) return "bg-primary/5";
  if (totalExp < 2000) return "bg-primary/10";
  if (totalExp < 10000) return "bg-primary/15";
  if (totalExp < 50000) return "bg-primary/20";
  return "bg-primary/25";
};

const formatUntrackedRange = (record: UntrackedExpRecord): string => {
  const start = new Date(record.startUTC);
  const end = new Date(record.endUTC);
  const sameDay = start.toDateString() === end.toDateString();

  const dateOpts: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" };
  const timeOpts: Intl.DateTimeFormatOptions = { hour: "numeric", minute: "2-digit", hour12: true };

  if (sameDay) {
    const datePart = start.toLocaleDateString(undefined, dateOpts);
    const startTime = start.toLocaleTimeString(undefined, timeOpts);
    const endTime = end.toLocaleTimeString(undefined, timeOpts);
    return `${datePart}, ${startTime} - ${endTime}`;
  }

  const startStr = start.toLocaleDateString(undefined, dateOpts);
  const endStr = end.toLocaleDateString(undefined, dateOpts);
  return `${startStr} - ${endStr}`;
};

const MAX_VISIBLE_SKILLS = 4;

const CalendarCell = memo(
  ({ label, data, isToday = false, isMuted = false, compact = false, onClick }: CalendarCellProps) => {
    const hasData = data.hasData;
    const skills = hasData ? Object.entries(data.expBySkill).sort(([, a], [, b]) => b - a) : [];
    const visibleSkills = skills.slice(0, MAX_VISIBLE_SKILLS);
    const overflowSkills = skills.slice(MAX_VISIBLE_SKILLS);

    return (
      <button
        type="button"
        onClick={onClick}
        disabled={!onClick}
        className={cn(
          "relative flex min-h-[5rem] flex-col items-start overflow-hidden rounded-md border p-1.5 text-left transition-colors",
          onClick && "hover:border-primary/50 cursor-pointer",
          !onClick && "cursor-default",
          isToday && "ring-2 ring-primary",
          isMuted && "opacity-40",
          hasData ? getIntensityClass(data.totalExp) : "border-border/50",
          !hasData && !isMuted && "border-border/30",
        )}>
        {/* Day / Month label */}
        <span
          className={cn(
            "text-xs font-medium",
            isToday ? "text-primary" : isMuted ? "text-muted-foreground" : "text-foreground",
          )}>
          {label}
        </span>

        {/* Untracked exp indicator */}
        {data.hasUntrackedExp && data.untrackedRecords && data.untrackedRecords.length > 0 && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[9px] font-bold leading-none text-destructive-foreground shadow-sm">
                  !
                </span>
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-xs">
                <div className="flex flex-col gap-1">
                  <span className="text-xs font-semibold text-destructive">Untracked EXP</span>
                  {data.untrackedRecords.map(record => (
                    <span key={record.id} className="text-xs">
                      {formatExp(record.expGained)} {record.skill} exp ({formatUntrackedRange(record)})
                    </span>
                  ))}
                </div>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}

        {hasData && (
          <div className="mt-1 flex w-full flex-1 flex-col text-[10px]">
            {/* ── Totals header ── */}
            <div className="flex items-center justify-between gap-1">
              <span className="text-[9px] font-medium uppercase tracking-wider text-muted-foreground">Totals</span>
              {data.netProfit !== 0 && (
                <span
                  className={cn(
                    "truncate rounded-full px-1.5 text-[9px] font-semibold leading-tight",
                    data.netProfit > 0 ? "bg-primary/15 text-primary" : "bg-destructive/15 text-destructive",
                  )}>
                  {data.netProfit > 0 ? "+" : ""}
                  {formatGP(data.netProfit)} GP
                </span>
              )}
            </div>
            <span className="truncate font-semibold text-foreground">{formatExp(data.totalExp)} exp</span>
            {data.avgExpPerHour > 0 && (
              <span className="truncate text-[9px] text-muted-foreground">
                {formatExp(Math.round(data.avgExpPerHour))}/hr
              </span>
            )}

            {/* ── Skills (hidden in compact / month+year view) ── */}
            {!compact && skills.length > 0 && (
              <>
                <div className="border-border/40 mt-1.5 border-t pt-1.5" />
                <div className="mb-1 flex flex-wrap gap-1">
                  {visibleSkills.map(([skill]) => (
                    <span key={skill} className="truncate rounded bg-muted px-1 py-px text-[8px] text-muted-foreground">
                      {skill}
                    </span>
                  ))}
                  {overflowSkills.length > 0 && (
                    <span
                      title={overflowSkills.map(([s]) => s).join(", ")}
                      className="inline-flex h-3.5 w-3.5 flex-shrink-0 cursor-default items-center justify-center rounded-full bg-muted text-[7px] leading-none text-muted-foreground">
                      &hellip;
                    </span>
                  )}
                </div>
              </>
            )}

            {/* ── Cost ── */}
            {data.foodUsed > 0 && (
              <>
                <div className="border-border/40 mt-auto border-t pt-1" />
                <span className="w-full truncate text-center text-[9px] font-medium text-destructive">
                  {data.totalDamageReceived.toLocaleString()} HP &middot; {formatGP(data.foodUsed)} GP
                </span>
              </>
            )}
          </div>
        )}
      </button>
    );
  },
);

CalendarCell.displayName = "CalendarCell";

export { CalendarCell };
