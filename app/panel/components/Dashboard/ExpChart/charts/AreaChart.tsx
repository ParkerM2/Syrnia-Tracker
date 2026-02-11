import { formatChartDate, formatTooltipDate } from "../utils";
import { ChartTooltip, ChartTooltipContent } from "@app/components";
import { memo } from "react";
import { Area, AreaChart as RechartsAreaChart, CartesianGrid, XAxis } from "recharts";
import type { ChartConfig } from "@app/components";
import type { ChartDataPoint, TimeFrame } from "@app/types";

interface AreaChartProps {
  chartData: ChartDataPoint[];
  chartConfig: ChartConfig;
  skills: string[];
  timeFrame: TimeFrame;
}

const commonProps = {
  accessibilityLayer: true,
  margin: {
    left: 12,
    right: 12,
    top: 12,
    bottom: 12,
  },
};

const AreaChart = memo(({ chartData, chartConfig, skills, timeFrame }: AreaChartProps) => (
  <RechartsAreaChart data={chartData} {...commonProps}>
    <defs>
      {skills.map(skill => {
        const skillConfig = chartConfig[skill];
        const color = typeof skillConfig === "object" && "color" in skillConfig ? skillConfig.color : "var(--primary)";

        const gradientId = `gradient-${skill.replace(/\s+/g, "-")}`;

        return (
          <linearGradient key={gradientId} id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={color} stopOpacity={0.8} />
            <stop offset="95%" stopColor={color} stopOpacity={0.1} />
          </linearGradient>
        );
      })}
    </defs>
    <CartesianGrid vertical={false} stroke="var(--border)" />
    <XAxis
      dataKey="date"
      tickLine={false}
      axisLine={false}
      tickMargin={8}
      minTickGap={32}
      tickFormatter={value => formatChartDate(value, timeFrame)}
      className="fill-muted-foreground text-xs"
    />
    <ChartTooltip content={<ChartTooltipContent labelFormatter={value => formatTooltipDate(value, timeFrame)} />} />
    {skills.map(skill => {
      const skillConfig = chartConfig[skill];
      const color = typeof skillConfig === "object" && "color" in skillConfig ? skillConfig.color : "var(--primary)";
      const gradientId = `gradient-${skill.replace(/\s+/g, "-")}`;

      return (
        <Area
          key={skill}
          dataKey={skill}
          type="monotone"
          stroke={color}
          strokeWidth={2}
          fill={`url(#${gradientId})`}
          fillOpacity={1}
        />
      );
    })}
  </RechartsAreaChart>
));

AreaChart.displayName = "AreaChart";

export { AreaChart };
