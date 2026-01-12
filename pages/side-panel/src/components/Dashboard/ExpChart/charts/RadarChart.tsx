import { ChartTooltip, ChartTooltipContent } from '@extension/ui';
import { memo, useMemo } from 'react';
import { Radar, RadarChart as RechartsRadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis } from 'recharts';
import type { ChartDataPoint, TimeFrame } from '../types';
import type { ChartConfig } from '@extension/ui';

interface RadarChartProps {
  chartData: ChartDataPoint[];
  chartConfig: ChartConfig;
  skills: string[];
  timeFrame: TimeFrame;
  userStats?: { skills?: Record<string, { gainedThisWeek?: string }> } | null;
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

const RadarChart = memo(({ chartData, chartConfig, skills, timeFrame, userStats }: RadarChartProps) => {
  // For radar chart, use all skills from userStats.skills if available
  // This ensures we show all possible skills, not just tracked ones
  // Structure data like shadcn example: [{ subject: "Skill", exp: value }, ...]
  const allSkillsFromStats = useMemo(
    () => (userStats?.skills ? Object.keys(userStats.skills).sort() : skills),
    [userStats, skills],
  );

  // Create radar data matching shadcn pattern
  // For short timeframes (6h, 12h), show accumulated gains from tracked data
  // For longer timeframes, use tracked data or fallback to gainedThisWeek
  const radarData = useMemo(
    () =>
      allSkillsFromStats.map(skill => {
        // Calculate accumulated exp from tracked chart data
        const trackedTotal = chartData.reduce((sum, point) => sum + (Number(point[skill]) || 0), 0);

        let exp = trackedTotal;

        // For short timeframes, always use tracked data (accumulated gains)
        // For longer timeframes, fallback to gainedThisWeek if no tracked data
        if (exp === 0 && (timeFrame === '7d' || timeFrame === '30d') && userStats?.skills?.[skill]?.gainedThisWeek) {
          const weeklyExp = parseInt(userStats.skills[skill].gainedThisWeek?.replace(/,/g, '') || '0', 10);
          exp = isNaN(weeklyExp) ? 0 : weeklyExp;
        }

        return {
          subject: skill,
          exp: exp,
        };
      }),
    [allSkillsFromStats, chartData, timeFrame, userStats],
  );

  // Get max value for domain
  const maxValue = useMemo(() => Math.max(...radarData.map(d => d.exp), 1), [radarData]);

  // Use a single color for the radar polygon
  const primaryColor = useMemo(() => {
    if (allSkillsFromStats.length === 0) return 'hsl(var(--primary))';
    const skillConfig = chartConfig[allSkillsFromStats[0]];
    return typeof skillConfig === 'object' && 'color' in skillConfig ? skillConfig.color : 'hsl(var(--primary))';
  }, [allSkillsFromStats, chartConfig]);

  return (
    <RechartsRadarChart data={radarData} {...commonProps}>
      <PolarGrid stroke="hsl(var(--border))" />
      <PolarAngleAxis dataKey="subject" tick={{ className: 'text-xs fill-muted-foreground' }} />
      <PolarRadiusAxis
        angle={90}
        domain={[0, maxValue]}
        tick={{ className: 'text-xs fill-muted-foreground' }}
        tickFormatter={value => value.toLocaleString()}
      />
      <ChartTooltip content={<ChartTooltipContent />} />
      <Radar name="Exp" dataKey="exp" stroke={primaryColor} fill={primaryColor} fillOpacity={0.6} strokeWidth={2} />
    </RechartsRadarChart>
  );
});

RadarChart.displayName = 'RadarChart';

export { RadarChart };
