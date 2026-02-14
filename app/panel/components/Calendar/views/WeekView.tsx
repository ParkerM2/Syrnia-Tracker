import {
  CURRENT_BADGE_STYLE,
  EXP_BADGE_STYLE,
  SKILL_BADGE_STYLE,
  UNTRACKED_BADGE_STYLE,
  UntrackedExpCard,
  formatGP,
} from "../shared";
import { Badge, Card, CardContent, CardHeader, CardTitle, ItemImage } from "@app/components";
import { cn } from "@app/utils/cn";
import { formatExp } from "@app/utils/formatting";
import { memo, useCallback, useMemo, useState } from "react";
import type { CalendarCellData, CalendarViewMode } from "../types";

interface WeekViewProps {
  currentDate: Date;
  getCell: (key: string) => CalendarCellData;
  onDrillDown: (mode: CalendarViewMode, date: Date) => void;
}

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

// --- Current Summary Row (pinned at top) ---

interface CurrentSummaryRowProps {
  totalExp: number;
  expBySkill: Record<string, number>;
}

const CurrentSummaryRow = memo(({ totalExp, expBySkill }: CurrentSummaryRowProps) => {
  const mainSkill = useMemo(() => {
    const entries = Object.entries(expBySkill).sort(([, a], [, b]) => b - a);
    return entries.length > 0 ? entries[0][0] : undefined;
  }, [expBySkill]);

  return (
    <Card>
      <CardHeader className="py-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm">Week Total</CardTitle>
          <div className="flex items-center gap-1.5">
            <div className="rounded-md px-2 py-0.5 text-[10px] font-semibold" style={CURRENT_BADGE_STYLE}>
              Current
            </div>
            {mainSkill && (
              <div className="rounded-md px-2 py-0.5 text-xs font-semibold" style={SKILL_BADGE_STYLE}>
                {mainSkill}
              </div>
            )}
            <div
              className="flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-semibold"
              style={EXP_BADGE_STYLE}>
              <span>{formatExp(totalExp)} exp</span>
            </div>
          </div>
        </div>
      </CardHeader>
    </Card>
  );
});

CurrentSummaryRow.displayName = "CurrentSummaryRow";

// --- Day row with data ---

interface DayRowProps {
  label: string;
  data: CalendarCellData;
  isToday?: boolean;
  onClick: () => void;
}

const DayRow = memo(({ label, data, isToday = false, onClick }: DayRowProps) => {
  const [expanded, setExpanded] = useState(false);
  const toggle = useCallback(() => setExpanded(prev => !prev), []);

  const mainSkill = useMemo(() => {
    const entries = Object.entries(data.expBySkill).sort(([, a], [, b]) => b - a);
    return entries.length > 0 ? entries[0][0] : undefined;
  }, [data.expBySkill]);

  const hasStats =
    data.totalDropValue > 0 ||
    data.netProfit !== 0 ||
    data.foodUsed > 0 ||
    data.totalFights > 0 ||
    data.totalSkillingActions > 0;

  return (
    <Card className={cn(isToday && "ring-2 ring-primary")}>
      <CardHeader className={cn("cursor-pointer", expanded ? "pb-2" : "py-3")} onClick={toggle}>
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm">{label}</CardTitle>
          <div className="flex items-center gap-1.5">
            {data.hasUntrackedExp && (
              <div
                className="flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-semibold"
                style={UNTRACKED_BADGE_STYLE}>
                <span className="font-bold">!</span>
                <span>Untracked</span>
              </div>
            )}
            {mainSkill && (
              <div className="rounded-md px-2 py-0.5 text-xs font-semibold" style={SKILL_BADGE_STYLE}>
                {mainSkill}
              </div>
            )}
            <div
              className="flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-semibold"
              style={EXP_BADGE_STYLE}>
              <span>{formatExp(data.totalExp)} exp</span>
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
                    data.netProfit > 0 ? "bg-primary/15 text-primary" : "bg-destructive/15 text-destructive",
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

          {data.hasUntrackedExp && data.untrackedRecords && data.untrackedRecords.length > 0 && (
            <UntrackedExpCard records={data.untrackedRecords} />
          )}

          <button
            type="button"
            onClick={e => {
              e.stopPropagation();
              onClick();
            }}
            className="hover:bg-primary/10 border-primary/30 mt-1 rounded-md border px-3 py-1.5 text-xs font-medium text-primary transition-colors">
            View hours →
          </button>
        </CardContent>
      )}
    </Card>
  );
});

DayRow.displayName = "DayRow";

// --- Empty day row ---

interface EmptyDayRowProps {
  label: string;
  onClick: () => void;
}

const EmptyDayRow = memo(({ label, onClick }: EmptyDayRowProps) => (
  <button
    type="button"
    onClick={onClick}
    className="border-border/30 hover:bg-muted/50 flex items-center justify-between rounded-md border px-3 py-1.5 text-xs text-muted-foreground transition-colors">
    <span>{label}</span>
    <span className="text-muted-foreground/50">No data</span>
  </button>
));

EmptyDayRow.displayName = "EmptyDayRow";

// --- WeekView ---

const WeekView = memo(({ currentDate, getCell, onDrillDown }: WeekViewProps) => {
  const days = useMemo(() => {
    const y = currentDate.getFullYear();
    const m = currentDate.getMonth();
    const d = currentDate.getDate();
    const dayOfWeek = currentDate.getDay();
    const weekStart = new Date(y, m, d - dayOfWeek);

    const now = new Date();
    const todayKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

    return Array.from({ length: 7 }, (_, i) => {
      const date = new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate() + i);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
      return {
        date,
        key,
        label: `${DAY_NAMES[i]} ${date.getDate()}`,
        isToday: key === todayKey,
      };
    });
  }, [currentDate]);

  const weekTotal = useMemo(() => {
    let totalExp = 0;
    const expBySkill: Record<string, number> = {};
    days.forEach(({ key }) => {
      const data = getCell(key);
      if (!data.hasData) return;
      totalExp += data.totalExp;
      Object.entries(data.expBySkill).forEach(([skill, exp]) => {
        expBySkill[skill] = (expBySkill[skill] || 0) + exp;
      });
    });
    return { totalExp, expBySkill };
  }, [days, getCell]);

  return (
    <div className="flex flex-col gap-2">
      {weekTotal.totalExp > 0 && <CurrentSummaryRow totalExp={weekTotal.totalExp} expBySkill={weekTotal.expBySkill} />}
      {days
        .slice()
        .reverse()
        .map(({ date, key, label, isToday }) => {
          const data = getCell(key);
          return data.hasData ? (
            <DayRow key={key} label={label} data={data} isToday={isToday} onClick={() => onDrillDown("day", date)} />
          ) : (
            <EmptyDayRow key={key} label={label} onClick={() => onDrillDown("day", date)} />
          );
        })}
    </div>
  );
});

WeekView.displayName = "WeekView";

export { WeekView };
