import { formatChartDate, formatTooltipDate } from '../utils';
import { ChartTooltip, ChartTooltipContent } from '@extension/ui';
import { memo } from 'react';
import { Bar, BarChart as RechartsBarChart, CartesianGrid, XAxis, YAxis } from 'recharts';
import type { ChartDataPoint, TimeFrame } from '../types';
import type { ChartConfig } from '@extension/ui';

interface BarChartProps {
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

const BarChart = memo(({ chartData, chartConfig, skills, timeFrame }: BarChartProps) => (
  <RechartsBarChart data={chartData} {...commonProps}>
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
      return <Bar key={skill} dataKey={skill} fill={color} />;
    })}
  </RechartsBarChart>
));

BarChart.displayName = 'BarChart';

export { BarChart };
