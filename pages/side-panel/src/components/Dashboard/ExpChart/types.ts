export type TimeFrame = '6h' | '12h' | '24h' | '7d' | '30d';

export type ChartType = 'line' | 'bar' | 'pie' | 'radar' | 'radial';

export interface TimeFrameOption {
  value: TimeFrame;
  label: string;
  hours: number;
}

export interface ChartDataPoint {
  date: string;
  [skill: string]: string | number;
}

export interface ChartDataResult {
  chartData: ChartDataPoint[];
  chartConfig: Record<string, { label: string; color: string }>;
  skillTotals: Record<string, number>;
  allAvailableSkills: string[];
  timeFrame: TimeFrame;
}
