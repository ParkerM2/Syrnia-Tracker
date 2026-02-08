import { HeatmapVisualization } from './HeatmapVisualization';
import { useExpChart } from './useExpChart';
import { ImportIcon } from '@app/assets/icons';
import { Card, CardContent, CardHeader, CardTitle, IconButton, Tabs, TabsList, TabsTrigger } from '@app/components';
import { memo } from 'react';

const ExpChart = memo(() => {
  const { userName, periodBreakdown, selectedPeriod, handlePeriodChange, handleImportClick, showLoading } =
    useExpChart();

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
    <Card className="py-4 sm:py-0">
      <CardHeader className="flex flex-col items-stretch border-b py-4 sm:flex-row sm:py-6">
        <div className="flex flex-1 flex-col justify-center gap-3 px-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Tabs value={selectedPeriod} onValueChange={handlePeriodChange}>
                <TabsList>
                  <TabsTrigger value="hour">Hour</TabsTrigger>
                  <TabsTrigger value="day">Day</TabsTrigger>
                  <TabsTrigger value="week">Week</TabsTrigger>
                  <TabsTrigger value="month">Month</TabsTrigger>
                </TabsList>
              </Tabs>
              <IconButton
                onClick={handleImportClick}
                variant="outline"
                size="icon"
                label="Import Stats"
                className="flex-shrink-0"
                Icon={ImportIcon}
              />
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="px-2 sm:p-6">
        <HeatmapVisualization data={periodBreakdown} selectedPeriod={selectedPeriod} />
      </CardContent>
    </Card>
  );
});

ExpChart.displayName = 'ExpChart';

export default ExpChart;
