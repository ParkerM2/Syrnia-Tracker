import { formatChartDate, formatTooltipDate } from '../utils';
import { ChartTooltip, ChartTooltipContent } from '@extension/ui';
import { memo } from 'react';
import { Area, CartesianGrid, XAxis, YAxis, Line, ComposedChart } from 'recharts';
import type { ChartDataPoint, TimeFrame } from '../types';
import type { ChartConfig } from '@extension/ui';

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
      {skills.map(skill => {
        const skillConfig = chartConfig[skill];
        const color =
          typeof skillConfig === 'object' && 'color' in skillConfig ? skillConfig.color : 'hsl(var(--primary))';

        const gradientId = `gradient-${skill.replace(/\s+/g, '-')}`;

        return (
          <linearGradient key={gradientId} id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={color} stopOpacity={0.8} />
            <stop offset="95%" stopColor={color} stopOpacity={0.1} />
          </linearGradient>
        );
      })}
    </defs>
    <CartesianGrid vertical={false} stroke="hsl(var(--border))" />
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
    {skills.map(skill => {
      const skillConfig = chartConfig[skill];
      const color =
        typeof skillConfig === 'object' && 'color' in skillConfig ? skillConfig.color : 'hsl(var(--primary))';
      const gradientId = `gradient-${skill.replace(/\s+/g, '-')}`;
      return (
        <g key={skill}>
          <Area dataKey={skill} type="monotone" fill={`url(#${gradientId})`} fillOpacity={1} stroke="none" />
          <Line dataKey={skill} type="monotone" stroke={color} strokeWidth={2} dot={false} />
        </g>
      );
    })}
  </ComposedChart>
));

LineChart.displayName = 'LineChart';

export { LineChart };
