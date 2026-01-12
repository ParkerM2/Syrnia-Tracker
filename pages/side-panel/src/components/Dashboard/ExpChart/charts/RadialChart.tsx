import { ChartTooltip, ChartTooltipContent } from '@extension/ui';
import { memo, useMemo } from 'react';
import { RadialBar, RadialBarChart as RechartsRadialBarChart, Cell, Legend } from 'recharts';
import type { ChartDataPoint } from '../types';
import type { ChartConfig } from '@extension/ui';

interface RadialChartProps {
  chartData: ChartDataPoint[];
  chartConfig: ChartConfig;
  skills: string[];
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

const RadialChart = memo(({ chartData, chartConfig, skills }: RadialChartProps) => {
  // Prepare data for radial chart (aggregate totals)
  const pieData = useMemo(
    () =>
      skills.map(skill => {
        const total = chartData.reduce((sum, point) => sum + (Number(point[skill]) || 0), 0);
        const skillConfig = chartConfig[skill];
        const color =
          typeof skillConfig === 'object' && 'color' in skillConfig ? skillConfig.color : 'hsl(var(--primary))';
        return {
          name: skill,
          value: total,
          fill: color,
        };
      }),
    [chartData, chartConfig, skills],
  );

  return (
    <RechartsRadialBarChart data={pieData} innerRadius="20%" outerRadius="80%" {...commonProps}>
      <ChartTooltip content={<ChartTooltipContent />} />
      <RadialBar dataKey="value" cornerRadius={4}>
        {pieData.map((entry, index) => (
          <Cell key={`cell-${index}`} fill={entry.fill} />
        ))}
      </RadialBar>
      <Legend />
    </RechartsRadialBarChart>
  );
});

RadialChart.displayName = 'RadialChart';

export { RadialChart };
