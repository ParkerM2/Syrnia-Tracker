import { LineChart } from "./LineChart";
import { useChartData } from "../hooks/useChartData";
import { Card, CardContent, CardHeader, CardTitle, ChartContainer, cn } from "@app/components";
import { memo, useState, useMemo } from "react";
import type { TimeFrame } from "@app/types";

/**
 * Simple Exp Chart Component - matches screenshot design
 * Shows exp/hr over time with lines for each tracked skill
 */
const SimpleExpChart = memo(() => {
  const [timeFrame, setTimeFrame] = useState<TimeFrame>("24h");

  // Get chart data - we'll select all skills after getting the list
  const initialData = useChartData({
    timeFrame: "24h",
    selectedSkills: new Set(),
  });

  // Get chart data with all available skills selected
  const { chartData, chartConfig } = useChartData({
    timeFrame,
    selectedSkills: new Set(initialData.allAvailableSkills), // Show all skills
  });

  const skills = Object.keys(chartConfig);

  // Time frame options - focus on hourly view
  const timeFrameOptions: Array<{ value: TimeFrame; label: string }> = [
    { value: "24h", label: "Last 24 hours" },
    { value: "7d", label: "Last 7 days" },
    { value: "30d", label: "Last 30 days" },
  ];

  // Get subtitle text based on timeframe
  const subtitle = useMemo(() => {
    switch (timeFrame) {
      case "24h":
        return "Hourly exp data for the past 24 hours";
      case "7d":
        return "Total for the last 7 days";
      case "30d":
        return "Total for the last 30 days";
      default:
        return "Hourly exp data";
    }
  }, [timeFrame]);

  if (chartData.length === 0 || skills.length === 0) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Exp per Hour</CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
            </div>
            <div className="flex gap-2">
              {timeFrameOptions.map(option => (
                <button
                  key={option.value}
                  onClick={() => setTimeFrame(option.value)}
                  className={cn(
                    "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                    timeFrame === option.value
                      ? "bg-primary text-primary-foreground"
                      : "bg-card text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                  )}>
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex h-[250px] items-center justify-center text-muted-foreground">No data available</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Exp per Hour</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
          </div>
          <div className="flex gap-2">
            {timeFrameOptions.map(option => (
              <button
                key={option.value}
                onClick={() => setTimeFrame(option.value)}
                className={cn(
                  "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                  timeFrame === option.value
                    ? "bg-primary text-primary-foreground"
                    : "bg-card text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                )}>
                {option.label}
              </button>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="relative w-full rounded-lg border border-border bg-card p-4">
          <ChartContainer config={chartConfig} className="h-[250px] w-full min-w-0">
            <LineChart chartData={chartData} chartConfig={chartConfig} skills={skills} timeFrame={timeFrame} />
          </ChartContainer>
        </div>
      </CardContent>
    </Card>
  );
});

SimpleExpChart.displayName = "SimpleExpChart";

export default SimpleExpChart;
