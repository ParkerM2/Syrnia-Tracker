import { TrendDownIcon, TrendUpIcon } from "@app/assets/icons";
import { Badge, Card, CardContent, CardDescription, CardHeader, CardTitle, ItemImage } from "@app/components";
import { memo, useMemo } from "react";
import type { HourCardData } from "./useDashboard";
import type { CSSProperties } from "react";

interface HourCardProps {
  data: HourCardData;
}

const formatGP = (value: number) =>
  value.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 });

const trendStyle = (isPositive: boolean): CSSProperties => {
  const cssVar = isPositive ? "var(--primary)" : "var(--destructive)";
  return {
    backgroundColor: `color-mix(in srgb, ${cssVar} 20%, transparent)`,
    borderWidth: "1px",
    borderColor: `color-mix(in srgb, ${cssVar} 30%, transparent)`,
    color: cssVar,
  };
};

const HourCard = memo(({ data }: HourCardProps) => {
  const hasStats =
    data.totalDropValue > 0 ||
    data.netProfit !== 0 ||
    data.hpValue > 0 ||
    data.totalFights > 0 ||
    data.totalSkillingActions > 0;

  const profitStyle = useMemo<CSSProperties | undefined>(() => {
    if (data.netProfit === 0) return undefined;
    const cssVar = data.netProfit > 0 ? "var(--primary)" : "var(--destructive)";
    return { color: cssVar };
  }, [data.netProfit]);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">{data.label}</CardTitle>
          {data.trend && (
            <div
              className="flex items-center gap-1 rounded-md px-2 py-1 text-sm font-semibold"
              style={trendStyle(data.trend.isPositive)}>
              {data.trend.isPositive ? (
                <TrendUpIcon className="h-3.5 w-3.5" />
              ) : (
                <TrendDownIcon className="h-3.5 w-3.5" />
              )}
              {data.trend.isPositive ? "+" : ""}
              {data.trend.value}%
            </div>
          )}
        </div>
        <CardDescription>{data.timeRange}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {/* Skill badges */}
        {data.skills.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {data.skills.map(s => (
              <Badge key={s.skill} isActive={s.isMainSkill}>
                <span>{s.skill}</span>
                <span className="font-bold">{s.formattedExp}</span>
                {s.level !== null && <span className="text-[10px] opacity-70">Lv{s.level}</span>}
              </Badge>
            ))}
          </div>
        )}

        {/* Loot items */}
        {data.lootItems.length > 0 && (
          <div>
            <p className="mb-1.5 text-xs font-medium text-muted-foreground">Drops</p>
            <div className="flex flex-wrap gap-2">
              {data.lootItems.map(item => (
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

        {/* Items produced from skilling */}
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

        {/* Summary footer */}
        {hasStats && (
          <div className="flex flex-wrap gap-x-4 gap-y-1 border-t pt-3 text-xs text-muted-foreground">
            {data.totalDropValue > 0 && <span>Total: {formatGP(data.totalDropValue)} GP</span>}
            {data.netProfit !== 0 && (
              <span style={profitStyle}>
                Net: {data.netProfit > 0 ? "+" : ""}
                {formatGP(data.netProfit)} GP
              </span>
            )}
            {data.hpValue > 0 && <span>Food: {formatGP(data.hpValue)} GP</span>}
            {data.totalFights > 0 && <span>Fights: {data.totalFights.toLocaleString()}</span>}
            {data.totalSkillingActions > 0 && <span>Actions: {data.totalSkillingActions.toLocaleString()}</span>}
          </div>
        )}
      </CardContent>
    </Card>
  );
});

HourCard.displayName = "HourCard";

export { HourCard };
