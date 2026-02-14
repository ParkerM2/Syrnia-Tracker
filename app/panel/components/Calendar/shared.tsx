import { formatExp } from "@app/utils/formatting";
import { memo } from "react";
import type { UntrackedExpRecord } from "@app/types";
import type { CSSProperties } from "react";

// --- Badge styles ---

const EXP_BADGE_STYLE: CSSProperties = {
  backgroundColor: "color-mix(in srgb, var(--primary) 20%, transparent)",
  borderWidth: "1px",
  borderColor: "color-mix(in srgb, var(--primary) 30%, transparent)",
  color: "var(--primary)",
};

const SKILL_BADGE_STYLE: CSSProperties = {
  backgroundColor: "color-mix(in srgb, var(--accent-foreground) 10%, transparent)",
  borderWidth: "1px",
  borderColor: "color-mix(in srgb, var(--accent-foreground) 20%, transparent)",
  color: "var(--accent-foreground)",
};

const UNTRACKED_BADGE_STYLE: CSSProperties = {
  backgroundColor: "color-mix(in srgb, var(--destructive) 15%, transparent)",
  borderWidth: "1px",
  borderColor: "color-mix(in srgb, var(--destructive) 30%, transparent)",
  color: "var(--destructive)",
};

const CURRENT_BADGE_STYLE: CSSProperties = {
  backgroundColor: "color-mix(in srgb, var(--accent) 20%, transparent)",
  borderWidth: "1px",
  borderColor: "color-mix(in srgb, var(--accent) 30%, transparent)",
  color: "var(--accent-foreground)",
};

// --- Formatting utilities ---

const formatGP = (value: number): string =>
  value.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 });

const formatUntrackedTimeRange = (record: UntrackedExpRecord): string => {
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

  const startStr = start.toLocaleDateString(undefined, { ...dateOpts, ...timeOpts });
  const endStr = end.toLocaleDateString(undefined, { ...dateOpts, ...timeOpts });
  return `${startStr} - ${endStr}`;
};

const formatDuration = (ms: number): string => {
  const totalMinutes = Math.round(ms / 60_000);
  if (totalMinutes < 60) return `${totalMinutes}m`;
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
};

// --- Untracked EXP card component ---

interface UntrackedExpCardProps {
  records: UntrackedExpRecord[];
}

const UntrackedExpCard = memo(({ records }: UntrackedExpCardProps) => {
  const totalExp = records.reduce((sum, r) => sum + r.expGained, 0);

  return (
    <div className="border-destructive/30 bg-destructive/5 rounded-lg border p-3">
      <div className="mb-2 flex items-center gap-2">
        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground">
          !
        </span>
        <span className="text-xs font-semibold text-destructive">
          Untracked EXP &middot; {formatExp(totalExp)} total
        </span>
      </div>
      <div className="flex flex-col gap-1.5">
        {records.map(record => (
          <div key={record.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
            <span className="font-medium text-foreground">{record.skill}</span>
            <span className="bg-destructive/15 rounded-full px-1.5 py-0.5 text-[10px] font-semibold text-destructive">
              +{formatExp(record.expGained)} exp
            </span>
            <span className="text-muted-foreground">{formatUntrackedTimeRange(record)}</span>
            <span className="text-muted-foreground/70 text-[10px]">({formatDuration(record.durationMs)})</span>
          </div>
        ))}
      </div>
    </div>
  );
});

UntrackedExpCard.displayName = "UntrackedExpCard";

export {
  CURRENT_BADGE_STYLE,
  EXP_BADGE_STYLE,
  SKILL_BADGE_STYLE,
  UNTRACKED_BADGE_STYLE,
  UntrackedExpCard,
  formatDuration,
  formatGP,
  formatUntrackedTimeRange,
};
