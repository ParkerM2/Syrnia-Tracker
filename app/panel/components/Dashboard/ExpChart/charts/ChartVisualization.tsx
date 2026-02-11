import { AreaChart } from "./AreaChart";
import { BarChart } from "./BarChart";
import { LineChart } from "./LineChart";
import { PieChart } from "./PieChart";
import { RadarChart } from "./RadarChart";
import { RadialChart } from "./RadialChart";
import { ChartContainer } from "@app/components";
import { memo } from "react";
import type { ChartConfig } from "@app/components";
import type { ChartDataPoint, ChartType, TimeFrame } from "@app/types";

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
        case "line":
          return <LineChart chartData={chartData} chartConfig={chartConfig} skills={skills} timeFrame={timeFrame} />;
        case "bar":
          return <BarChart chartData={chartData} chartConfig={chartConfig} skills={skills} timeFrame={timeFrame} />;
        case "pie":
          return <PieChart chartData={chartData} chartConfig={chartConfig} skills={skills} />;
        case "radar":
          return (
            <RadarChart
              chartData={chartData}
              chartConfig={chartConfig}
              skills={skills}
              timeFrame={timeFrame}
              userStats={userStats}
            />
          );
        case "radial":
          return <RadialChart chartData={chartData} chartConfig={chartConfig} skills={skills} />;
        default:
          return <AreaChart chartData={chartData} chartConfig={chartConfig} skills={skills} timeFrame={timeFrame} />;
      }
    };

    return (
      <ChartContainer config={chartConfig} className="h-[250px] w-full min-w-0">
        {renderChart()}
      </ChartContainer>
    );
  },
);

ChartVisualization.displayName = "ChartVisualization";

export { ChartVisualization };
