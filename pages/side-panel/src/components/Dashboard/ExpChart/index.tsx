import { ChartHeader } from './ChartHeader';
import { ChartVisualization } from './ChartVisualization';
import { SkillFilterDialog } from './SkillFilterDialog';
import { SkillPills } from './SkillPills';
import { TimeFrameFilterDialog } from './TimeFrameFilterDialog';
import { useChartData } from './useChartData';
import { useUserStatsQuery } from '@extension/shared';
import { Card, CardContent, Button } from '@extension/ui';
import { memo, useState, useEffect, useMemo } from 'react';
import type { TimeFrame, ChartType } from './types';

// Icon components
const LineChartIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round">
    <path d="M3 3v18h18" />
    <path d="m19 9-5 5-4-4-3 3" />
  </svg>
);

const BarChartIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round">
    <path d="M12 20V10" />
    <path d="M18 20V4" />
    <path d="M6 20v-4" />
  </svg>
);

const PieChartIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round">
    <path d="M21.21 15.89A10 10 0 1 1 8 2.83" />
    <path d="M22 12A10 10 0 0 0 12 2v10z" />
  </svg>
);

const RadarIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round">
    <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
  </svg>
);

const RadialIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round">
    <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

/**
 * Chart component showing exp gains over time with one line per skill
 * Follows MVP pattern with separated concerns:
 * - Data processing: useChartData hook
 * - UI components: ChartHeader, SkillPills, ChartVisualization, Dialogs
 * - State management: Local state for filters
 */
const ExpChart = memo(() => {
  const { userStats } = useUserStatsQuery();
  const [selectedSkills, setSelectedSkills] = useState<Set<string>>(new Set());
  const [timeFrame, setTimeFrame] = useState<TimeFrame>('24h');
  const [chartType, setChartType] = useState<ChartType>('line');
  const [skillFilterOpen, setSkillFilterOpen] = useState(false);
  const [timeFilterOpen, setTimeFilterOpen] = useState(false);

  const userName = userStats?.username || 'Player';

  // Data processing hook (Model)
  const {
    chartData,
    chartConfig,
    skillTotals,
    allAvailableSkills,
    timeFrame: dataTimeFrame,
  } = useChartData({
    timeFrame,
    selectedSkills,
  });

  // Get all skills from userStats (like radar chart does) - this includes all possible skills
  const allSkillsFromStats = useMemo(
    () => (userStats?.skills ? Object.keys(userStats.skills).sort() : allAvailableSkills),
    [userStats, allAvailableSkills],
  );

  // Initialize selected skills to all available skills when data loads
  useEffect(() => {
    if (allSkillsFromStats.length > 0 && selectedSkills.size === 0) {
      setSelectedSkills(new Set(allSkillsFromStats));
    }
  }, [allSkillsFromStats, selectedSkills.size]);

  // Event handlers (Presenter logic)
  const handleSkillToggle = (skill: string) => {
    const newSelected = new Set(selectedSkills);
    if (newSelected.has(skill)) {
      newSelected.delete(skill);
    } else {
      newSelected.add(skill);
    }
    setSelectedSkills(newSelected);
  };

  const handleSelectAllSkills = () => {
    setSelectedSkills(new Set(allSkillsFromStats));
  };

  const handleDeselectAllSkills = () => {
    setSelectedSkills(new Set());
  };

  const handleTimeFrameSelect = (newTimeFrame: TimeFrame) => {
    setTimeFrame(newTimeFrame);
  };

  const handleImportClick = () => {
    // Open stats page in a new tab
    chrome.tabs.create({
      url: 'https://www.syrnia.com/theGame/includes2/stats.php',
    });
  };

  const skills = Object.keys(chartConfig);

  // Loading state
  if (chartData.length === 0 && allAvailableSkills.length === 0) {
    return (
      <Card className="py-4 sm:py-0">
        <ChartHeader
          userName={userName}
          skillsCount={0}
          onSkillFilterClick={() => setSkillFilterOpen(true)}
          onTimeFilterClick={() => setTimeFilterOpen(true)}
          onImportClick={handleImportClick}
          timeFrame={timeFrame}
        />
        <CardContent>
          <div className="text-muted-foreground flex h-[250px] items-center justify-center">Loading chart data...</div>
        </CardContent>
      </Card>
    );
  }

  // Empty state
  if (chartData.length === 0 || skills.length === 0) {
    return (
      <Card className="py-4 sm:py-0">
        <ChartHeader
          userName={userName}
          skillsCount={0}
          onSkillFilterClick={() => setSkillFilterOpen(true)}
          onTimeFilterClick={() => setTimeFilterOpen(true)}
          onImportClick={handleImportClick}
          timeFrame={timeFrame}
        />
        <CardContent>
          <div className="text-muted-foreground flex h-[250px] items-center justify-center">No data available</div>
        </CardContent>
      </Card>
    );
  }

  // Main view (View)
  return (
    <>
      <Card className="py-4 sm:py-0">
        <ChartHeader
          userName={userName}
          skillsCount={skills.length}
          onSkillFilterClick={() => setSkillFilterOpen(true)}
          onTimeFilterClick={() => setTimeFilterOpen(true)}
          onImportClick={handleImportClick}
          timeFrame={timeFrame}>
          <SkillPills skills={skills} chartConfig={chartConfig} />
        </ChartHeader>
        <CardContent className="px-2 sm:p-6">
          <div className="border-border bg-card relative rounded-lg border p-4">
            <ChartVisualization
              chartData={chartData}
              chartConfig={chartConfig}
              skills={skills}
              chartType={chartType}
              timeFrame={dataTimeFrame}
              userStats={userStats}
            />
            {/* Chart Type Buttons - Bottom Right */}
            <div className="border-border bg-background/80 absolute bottom-4 right-4 flex gap-1 rounded-lg border p-1 backdrop-blur-sm">
              <Button
                variant="ghost"
                size="icon"
                className={`h-8 w-8 ${chartType === 'line' ? 'text-green-500' : ''}`}
                onClick={() => setChartType('line')}
                aria-label="Line Chart"
                title="Line Chart">
                <LineChartIcon />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className={`h-8 w-8 ${chartType === 'bar' ? 'text-green-500' : ''}`}
                onClick={() => setChartType('bar')}
                aria-label="Bar Chart"
                title="Bar Chart">
                <BarChartIcon />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className={`h-8 w-8 ${chartType === 'pie' ? 'text-green-500' : ''}`}
                onClick={() => setChartType('pie')}
                aria-label="Pie Chart"
                title="Pie Chart">
                <PieChartIcon />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className={`h-8 w-8 ${chartType === 'radar' ? 'text-green-500' : ''}`}
                onClick={() => setChartType('radar')}
                aria-label="Radar Chart"
                title="Radar Chart">
                <RadarIcon />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className={`h-8 w-8 ${chartType === 'radial' ? 'text-green-500' : ''}`}
                onClick={() => setChartType('radial')}
                aria-label="Radial Chart"
                title="Radial Chart">
                <RadialIcon />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <SkillFilterDialog
        open={skillFilterOpen}
        onOpenChange={setSkillFilterOpen}
        allAvailableSkills={allSkillsFromStats}
        selectedSkills={selectedSkills}
        skillTotals={skillTotals}
        onSkillToggle={handleSkillToggle}
        onSelectAll={handleSelectAllSkills}
        onDeselectAll={handleDeselectAllSkills}
      />

      <TimeFrameFilterDialog
        open={timeFilterOpen}
        onOpenChange={setTimeFilterOpen}
        currentTimeFrame={timeFrame}
        onTimeFrameSelect={handleTimeFrameSelect}
      />
    </>
  );
});

ExpChart.displayName = 'ExpChart';

export default ExpChart;
