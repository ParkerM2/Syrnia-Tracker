import { HeatmapVisualization } from "./charts/HeatmapVisualization";
import { useExpChart } from "./hooks/useExpChart";
import { Card, CardContent, CardHeader, CardTitle, Tabs, TabsList, TabsTrigger } from "@app/components";
import { memo } from "react";

const ExpChart = memo(() => {
  const { userName, periodBreakdown, selectedPeriod, handlePeriodChange, showLoading } = useExpChart();

  if (showLoading) {
    return (
      <Card className="py-4 sm:py-0">
        <CardHeader className="flex flex-col items-stretch border-b py-4 sm:flex-row sm:py-6">
          <div className="flex flex-1 flex-col justify-center gap-3 px-6">
            <div className="flex items-center justify-between">
              <CardTitle>{userName}</CardTitle>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex h-[250px] items-center justify-center text-muted-foreground">Loading chart data...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <Tabs value={selectedPeriod} onValueChange={handlePeriodChange}>
          <TabsList>
            <TabsTrigger value="hour">Hour</TabsTrigger>
            <TabsTrigger value="day">Day</TabsTrigger>
            <TabsTrigger value="week">Week</TabsTrigger>
            <TabsTrigger value="month">Month</TabsTrigger>
          </TabsList>
        </Tabs>
      </CardHeader>
      <CardContent>
        <HeatmapVisualization data={periodBreakdown} selectedPeriod={selectedPeriod} />
      </CardContent>
    </Card>
  );
});

ExpChart.displayName = "ExpChart";

export default ExpChart;
