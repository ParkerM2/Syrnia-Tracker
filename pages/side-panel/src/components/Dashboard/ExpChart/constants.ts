import type { TimeFrameOption } from './types';

export const TIME_FRAME_OPTIONS: TimeFrameOption[] = [
  { value: '6h', label: 'Last 6 Hours', hours: 6 },
  { value: '12h', label: 'Last 12 Hours', hours: 12 },
  { value: '24h', label: 'Last 24 Hours', hours: 24 },
  { value: '7d', label: 'Last 7 Days', hours: 168 },
  { value: '30d', label: 'Last 30 Days', hours: 720 },
];

export const SKILL_COLORS = [
  'hsl(221.2 83.2% 53.3%)', // Blue
  'hsl(142.1 76.2% 36.3%)', // Green
  'hsl(346.8 77.2% 49.8%)', // Red
  'hsl(47.9 95.8% 53.1%)', // Yellow
  'hsl(262.1 83.3% 57.8%)', // Purple
  'hsl(199.4 89.1% 48.2%)', // Cyan
  'hsl(24.6 95% 53.1%)', // Orange
  'hsl(280 100% 70%)', // Pink
];
