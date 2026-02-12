import { TrendUpIcon } from "@app/assets/icons";
import { Badge, Card, CardContent, CardHeader, CardTitle, ItemImage } from "@app/components";
import { cn } from "@app/utils/cn";
import { calculateExpForNextLevel } from "@app/utils/exp-calculator";
import { formatExp } from "@app/utils/formatting";
import { memo, useCallback, useMemo, useState } from "react";
import type { CalendarCellData } from "../types";
import type { CSSProperties } from "react";

interface DayViewProps {
  currentDate: Date;
  getCell: (key: string) => CalendarCellData;
}

const formatGP = (value: number) =>
  value.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 });

const formatHourLabel = (hour: number): string => {
  const h = hour % 12 || 12;
  const ampm = hour < 12 ? "AM" : "PM";
  return `${h}:00 ${ampm}`;
};

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

// --- Hour row with data ---

interface HourRowProps {
  hour: number;
  data: CalendarCellData;
  mainSkill?: string;
  trendPct?: number;
}

const HourRow = memo(({ hour, data, mainSkill, trendPct }: HourRowProps) => {
  const [expanded, setExpanded] = useState(false);
  const toggle = useCallback(() => setExpanded(prev => !prev), []);

  const hasStats =
    data.totalDropValue > 0 ||
    data.netProfit !== 0 ||
    data.foodUsed > 0 ||
    data.totalFights > 0 ||
    data.totalSkillingActions > 0;

  return (
    <Card>
      <CardHeader className={cn("cursor-pointer", expanded ? "pb-2" : "py-3")} onClick={toggle}>
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm">{formatHourLabel(hour)}</CardTitle>
          <div className="flex items-center gap-1.5">
            {mainSkill && (
              <div className="rounded-md px-2 py-0.5 text-xs font-semibold" style={SKILL_BADGE_STYLE}>
                {mainSkill}
              </div>
            )}
            <div
              className="flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-semibold"
              style={EXP_BADGE_STYLE}>
              <span>{formatExp(data.totalExp)} exp</span>
              {trendPct !== undefined && (
                <>
                  <span className="text-[10px] opacity-60">|</span>
                  <span>{trendPct}%</span>
                  <TrendUpIcon className="h-3 w-3" />
                </>
              )}
            </div>
          </div>
        </div>
      </CardHeader>

      {expanded && (
        <CardContent className="flex flex-col gap-3 pt-0">
          {Object.keys(data.expBySkill).length > 0 && (
            <div className="flex flex-wrap gap-2">
              {Object.entries(data.expBySkill)
                .sort(([, a], [, b]) => b - a)
                .map(([skill, exp]) => (
                  <Badge key={skill}>
                    <span>{skill}</span>
                    <span className="font-bold">{formatExp(exp)}</span>
                  </Badge>
                ))}
            </div>
          )}

          {data.drops.length > 0 && (
            <div>
              <p className="mb-1.5 text-xs font-medium text-muted-foreground">Drops</p>
              <div className="flex flex-wrap gap-2">
                {data.drops.map(item => (
                  <ItemImage
                    key={item.name}
                    src={item.imageUrl}
                    name={item.name}
                    quantity={item.quantity}
                    className="h-10 w-10 rounded bg-muted"
                  />
                ))}
              </div>
            </div>
          )}

          {data.producedItems.length > 0 && (
            <div>
              <p className="mb-1.5 text-xs font-medium text-muted-foreground">Items Produced</p>
              <div className="flex flex-wrap gap-2">
                {data.producedItems.map(item => (
                  <ItemImage
                    key={item.name}
                    src={item.imageUrl}
                    name={item.name}
                    quantity={item.quantity}
                    prefix="+"
                    className="h-10 w-10 rounded bg-muted"
                  />
                ))}
              </div>
            </div>
          )}

          {hasStats && (
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 border-t pt-2 text-xs">
              {data.totalDropValue > 0 && (
                <span className="text-muted-foreground">
                  Total Value: <span className="font-medium text-foreground">{formatGP(data.totalDropValue)} GP</span>
                </span>
              )}
              {data.foodUsed > 0 && (
                <span className="text-muted-foreground">
                  Food Cost: <span className="font-medium text-foreground">{formatGP(data.foodUsed)} GP</span>
                </span>
              )}
              {data.netProfit !== 0 && (
                <span
                  className={cn(
                    "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold",
                    data.netProfit > 0 ? "bg-green-500/15 text-green-600" : "bg-red-500/15 text-red-600",
                  )}>
                  {data.netProfit > 0 ? "+" : ""}
                  {formatGP(data.netProfit)} GP
                </span>
              )}
              {data.totalFights > 0 && (
                <span className="text-muted-foreground">
                  Fights: <span className="font-medium text-foreground">{data.totalFights.toLocaleString()}</span>
                </span>
              )}
              {data.totalSkillingActions > 0 && (
                <span className="text-muted-foreground">
                  Actions:{" "}
                  <span className="font-medium text-foreground">{data.totalSkillingActions.toLocaleString()}</span>
                </span>
              )}
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
});

HourRow.displayName = "HourRow";

// --- Empty hour (single) ---

const EmptyHourRow = memo(({ hour }: { hour: number }) => (
  <div className="border-border/30 flex items-center justify-between rounded-md border px-3 py-1.5">
    <span className="text-xs text-muted-foreground">{formatHourLabel(hour)}</span>
    <span className="text-muted-foreground/50 text-xs">No data</span>
  </div>
));

EmptyHourRow.displayName = "EmptyHourRow";

// --- Collapsible group of consecutive empty hours ---

interface EmptyGroupProps {
  hours: number[];
}

const EmptyHourGroup = memo(({ hours }: EmptyGroupProps) => {
  const [expanded, setExpanded] = useState(false);
  const toggle = useCallback(() => setExpanded(prev => !prev), []);

  const label = `${formatHourLabel(hours[0])} - ${formatHourLabel(hours[hours.length - 1])}`;

  return (
    <div className="flex flex-col gap-1">
      <button
        type="button"
        onClick={toggle}
        className={cn(
          "border-border/30 flex items-center justify-between rounded-md border px-3 py-1.5",
          "hover:bg-muted/50 text-xs text-muted-foreground transition-colors",
        )}>
        <span>{label}</span>
        <span className="text-muted-foreground/50">
          {hours.length} empty hours {expanded ? "[-]" : "[+]"}
        </span>
      </button>
      {expanded && (
        <div className="flex flex-col gap-1 pl-3">
          {hours.map(h => (
            <EmptyHourRow key={h} hour={h} />
          ))}
        </div>
      )}
    </div>
  );
});

EmptyHourGroup.displayName = "EmptyHourGroup";

// --- Segment types for rendering ---

type DaySegment = { type: "active"; hour: number; data: CalendarCellData } | { type: "empty"; hours: number[] };

// --- DayView ---

const DayView = memo(({ getCell }: DayViewProps) => {
  const segments = useMemo(() => {
    const result: DaySegment[] = [];
    let emptyBuffer: number[] = [];

    const flushEmpty = () => {
      if (emptyBuffer.length > 0) {
        result.push({ type: "empty", hours: emptyBuffer });
        emptyBuffer = [];
      }
    };

    for (let h = 23; h >= 0; h--) {
      const cell = getCell(String(h));
      if (cell.hasData) {
        flushEmpty();
        result.push({ type: "active", hour: h, data: cell });
      } else {
        emptyBuffer.push(h);
      }
    }
    flushEmpty();

    return result;
  }, [getCell]);

  const hourMeta = useMemo(() => {
    const trendMap = new Map<number, number>();
    const skillMap = new Map<number, string>();
    for (const seg of segments) {
      if (seg.type !== "active") continue;
      const { expBySkill, skillLevels } = seg.data;
      const mainEntry = Object.entries(expBySkill).sort(([, a], [, b]) => b - a)[0];
      if (!mainEntry) continue;
      const [skillName, skillExp] = mainEntry;
      skillMap.set(seg.hour, skillName);
      const level = skillLevels[skillName];
      if (!level || level <= 0) continue;
      const expForNext = calculateExpForNextLevel(level);
      if (expForNext <= 0) continue;
      const pct = Number.parseFloat(((skillExp / expForNext) * 100).toFixed(2));
      trendMap.set(seg.hour, pct);
    }
    return { trendMap, skillMap };
  }, [segments]);

  return (
    <div className="flex flex-col gap-2">
      {segments.map(seg => {
        if (seg.type === "active") {
          return (
            <HourRow
              key={seg.hour}
              hour={seg.hour}
              data={seg.data}
              mainSkill={hourMeta.skillMap.get(seg.hour)}
              trendPct={hourMeta.trendMap.get(seg.hour)}
            />
          );
        }
        // Single empty hour — show inline, no collapse needed
        if (seg.hours.length === 1) {
          return <EmptyHourRow key={seg.hours[0]} hour={seg.hours[0]} />;
        }
        // Multiple consecutive empty hours — collapsible group
        return <EmptyHourGroup key={`empty-${seg.hours[0]}`} hours={seg.hours} />;
      })}
    </div>
  );
});

DayView.displayName = "DayView";

export { DayView };
