import { AreaChart } from './charts/AreaChart';
import { BarChart } from './charts/BarChart';
import { LineChart } from './charts/LineChart';
import { PieChart } from './charts/PieChart';
import { RadarChart } from './charts/RadarChart';
import { RadialChart } from './charts/RadialChart';
import { ChartContainer } from '@extension/ui';
import { memo } from 'react';
import type { ChartDataPoint, ChartType, TimeFrame } from './types';
import type { ChartConfig } from '@extension/ui';

interface ChartVisualizationProps {
  chartData: ChartDataPoint[];
  chartConfig: ChartConfig;
  skills: string[];
  chartType: ChartType;
  timeFrame: TimeFrame;
  userStats?: { skills?: Record<string, { gainedThisWeek?: string }> } | null;
}

const ChartVisualization = memo(
  ({ chartData, chartConfig, skills, chartType, timeFrame, userStats }: ChartVisualizationProps) => {
    const renderChart = () => {
      switch (chartType) {
        case 'line':
          return <LineChart chartData={chartData} chartConfig={chartConfig} skills={skills} timeFrame={timeFrame} />;
        case 'bar':
          return <BarChart chartData={chartData} chartConfig={chartConfig} skills={skills} timeFrame={timeFrame} />;
        case 'pie':
          return <PieChart chartData={chartData} chartConfig={chartConfig} skills={skills} />;
        case 'radar':
          return (
            <RadarChart
              chartData={chartData}
              chartConfig={chartConfig}
              skills={skills}
              timeFrame={timeFrame}
              userStats={userStats}
            />
          );
        case 'radial':
          return <RadialChart chartData={chartData} chartConfig={chartConfig} skills={skills} />;
        default:
          return <AreaChart chartData={chartData} chartConfig={chartConfig} skills={skills} timeFrame={timeFrame} />;
      }
    };

    return (
      <ChartContainer config={chartConfig} className="aspect-auto h-[250px] w-full">
        {renderChart()}
      </ChartContainer>
    );
  },
);

ChartVisualization.displayName = 'ChartVisualization';

export { ChartVisualization };
