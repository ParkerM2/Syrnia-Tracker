import { ChartTooltip, ChartTooltipContent } from '@app/components';
import { memo, useMemo } from 'react';
// eslint-disable-next-line import-x/no-deprecated
import { Pie, PieChart as RechartsPieChart, Cell, Legend } from 'recharts';
import type { ChartDataPoint } from '../types';
import type { ChartConfig } from '@app/components';

interface PieChartProps {
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

const PieChart = memo(({ chartData, chartConfig, skills }: PieChartProps) => {
  // Prepare data for pie chart (aggregate totals)
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
    <RechartsPieChart {...commonProps}>
      <ChartTooltip content={<ChartTooltipContent />} />
      <Pie
        data={pieData}
        cx="50%"
        cy="50%"
        labelLine={false}
        label={({ name, percent }) => `${name}: ${((percent || 0) * 100).toFixed(0)}%`}
        outerRadius={80}
        fill="#8884d8"
        dataKey="value">
        {pieData.map((entry, index) => (
          <Cell key={`cell-${index}`} fill={entry.fill} />
        ))}
      </Pie>
      <Legend />
    </RechartsPieChart>
  );
});

PieChart.displayName = 'PieChart';

export { PieChart };
