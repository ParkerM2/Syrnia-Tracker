import type { TimeFrameOption } from "@app/types";

export const SKILLS_ARRAY = [
  "Attack",
  "Defence",
  "Strength",
  "Health",
  "Mining",
  "Smithing",
  "Fishing",
  "Woodcutting",
  "Construction",
  "Trading",
  "Thieving",
  "Speed",
  "Cooking",
  "Magic",
  "Farming",
];

export const UPDATE_SCREEN_DATA = "update_screen_data" as const;
export const REQUEST_SCREEN_DATA = "request_screen_data" as const;
export const UPDATE_USER_STATS = "update_user_stats" as const;

export const TIME_FRAME_OPTIONS: TimeFrameOption[] = [
  { value: "6h", label: "Last 6 Hours", hours: 6 },
  { value: "12h", label: "Last 12 Hours", hours: 12 },
  { value: "24h", label: "Last 24 Hours", hours: 24 },
  { value: "7d", label: "Last 7 Days", hours: 168 },
  { value: "30d", label: "Last 30 Days", hours: 720 },
  { value: "90d", label: "Last 3 Months", hours: 2160 },
];

// Teal/cyan color palette matching screenshot
export const SKILL_COLORS = [
  "hsl(180 77.11% 60.59%)", // Primary teal/cyan
  "hsl(180 70% 55%)", // Slightly darker teal
  "hsl(180 75% 65%)", // Slightly lighter teal
  "hsl(180 65% 50%)", // Darker teal
  "hsl(180 80% 70%)", // Lighter teal
  "hsl(180 72% 58%)", // Medium teal
  "hsl(180 68% 52%)", // Dark teal
  "hsl(180 78% 68%)", // Light teal
];
