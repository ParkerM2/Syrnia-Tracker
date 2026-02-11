import { formatChartDate, formatTooltipDate } from "../utils";
import { ChartTooltip, ChartTooltipContent } from "@app/components";
import { SKILL_COLORS } from "@app/constants";
import { memo } from "react";
import { Area, CartesianGrid, XAxis, YAxis, Line, ComposedChart } from "recharts";
import type { ChartConfig } from "@app/components";
import type { ChartDataPoint, TimeFrame } from "@app/types";

interface LineChartProps {
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

const LineChart = memo(({ chartData, chartConfig, skills, timeFrame }: LineChartProps) => (
  <ComposedChart data={chartData} {...commonProps}>
    <defs>
      {skills.map((skill, index) => {
        const skillConfig = chartConfig[skill];
        const color =
          typeof skillConfig === "object" && "color" in skillConfig
            ? skillConfig.color
            : SKILL_COLORS[index % SKILL_COLORS.length];

        const gradientId = `gradient-${skill.replace(/\s+/g, "-")}`;

        // Gradient: lighter at top (higher opacity), darker at bottom (lower opacity)
        // Matching screenshot style with teal/cyan theme
        return (
          <linearGradient key={gradientId} id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.6} />
            <stop offset="50%" stopColor={color} stopOpacity={0.4} />
            <stop offset="100%" stopColor={color} stopOpacity={0.15} />
          </linearGradient>
        );
      })}
    </defs>
    <CartesianGrid vertical={false} stroke="var(--border)" opacity={0.3} />
    <XAxis
      dataKey="date"
      tickLine={false}
      axisLine={false}
      tickMargin={8}
      minTickGap={32}
      tickFormatter={value => formatChartDate(value, timeFrame)}
      className="fill-muted-foreground text-xs"
    />
    <YAxis tickLine={false} axisLine={false} tickMargin={8} className="fill-muted-foreground text-xs" />
    <ChartTooltip content={<ChartTooltipContent labelFormatter={value => formatTooltipDate(value, timeFrame)} />} />
    {skills.map((skill, index) => {
      const skillConfig = chartConfig[skill];
      const color =
        typeof skillConfig === "object" && "color" in skillConfig
          ? skillConfig.color
          : SKILL_COLORS[index % SKILL_COLORS.length];
      const gradientId = `gradient-${skill.replace(/\s+/g, "-")}`;
      return (
        <g key={skill}>
          <Area dataKey={skill} type="monotone" fill={`url(#${gradientId})`} fillOpacity={1} stroke="none" />
          <Line
            dataKey={skill}
            type="monotone"
            stroke={color}
            strokeWidth={2}
            dot={false}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </g>
      );
    })}
  </ComposedChart>
));

LineChart.displayName = "LineChart";

export { LineChart };
