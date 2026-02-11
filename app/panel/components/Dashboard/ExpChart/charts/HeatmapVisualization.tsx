import { HeatmapChart } from "./HeatmapChart";
import type { PeriodStats, TimePeriod } from "@app/types";

interface HeatmapVisualizationProps {
  data: PeriodStats[];
  selectedPeriod: TimePeriod;
}

const buildTimeline = (data: PeriodStats[], selectedPeriod: TimePeriod): PeriodStats[] => {
  if (selectedPeriod === "month") {
    const map = new Map<string, PeriodStats>();
    data.forEach(item => {
      const key = `${item.date.getUTCFullYear()}-${item.date.getUTCMonth()}`;
      if (!map.has(key)) {
        map.set(key, item);
      }
    });

    const referenceDate = data.length > 0 ? data[data.length - 1].date : new Date();
    const year = referenceDate.getUTCFullYear();
    const result: PeriodStats[] = [];

    for (let month = 0; month < 12; month++) {
      const bucketDate = new Date(Date.UTC(year, month, 1, 0, 0, 0, 0));
      const key = `${year}-${month}`;
      const existing = map.get(key);
      if (existing) {
        result.push(existing);
      } else {
        result.push({
          periodKey: key,
          date: bucketDate,
          totalGainedExp: 0,
          skills: {},
          hpUsed: null,
          dropStats: {},
          lootItems: [],
          totalDrops: 0,
          totalDropAmount: 0,
          totalDropValue: 0,
          hpValue: 0,
          netProfit: 0,
        });
      }
    }

    return result;
  }

  const sorted = [...data].sort((a, b) => a.date.getTime() - b.date.getTime());
  const referenceDate = sorted.length > 0 ? sorted[sorted.length - 1].date : new Date();

  const map = new Map<string, PeriodStats>();
  sorted.forEach(item => {
    let key: string;
    if (selectedPeriod === "hour") {
      key = `${item.date.getUTCFullYear()}-${item.date.getUTCMonth()}-${item.date.getUTCDate()}-${item.date.getUTCHours()}`;
    } else if (selectedPeriod === "day") {
      key = `${item.date.getUTCFullYear()}-${item.date.getUTCMonth()}-${item.date.getUTCDate()}`;
    } else {
      const weekStart = new Date(item.date);
      const day = weekStart.getUTCDay();
      weekStart.setUTCDate(weekStart.getUTCDate() - day);
      weekStart.setUTCHours(0, 0, 0, 0);
      key = `${weekStart.getUTCFullYear()}-${weekStart.getUTCMonth()}-${weekStart.getUTCDate()}`;
    }
    if (!map.has(key)) {
      map.set(key, item);
    }
  });

  const result: PeriodStats[] = [];

  if (selectedPeriod === "hour") {
    const base = new Date(
      Date.UTC(referenceDate.getUTCFullYear(), referenceDate.getUTCMonth(), referenceDate.getUTCDate(), 0, 0, 0, 0),
    );
    for (let hour = 0; hour < 24; hour++) {
      const bucketDate = new Date(base);
      bucketDate.setUTCHours(hour, 0, 0, 0);
      const key = `${bucketDate.getUTCFullYear()}-${bucketDate.getUTCMonth()}-${bucketDate.getUTCDate()}-${bucketDate.getUTCHours()}`;
      const existing = map.get(key);
      if (existing) {
        result.push(existing);
      } else {
        result.push({
          periodKey: key,
          date: bucketDate,
          totalGainedExp: 0,
          skills: {},
          hpUsed: null,
          dropStats: {},
          lootItems: [],
          totalDrops: 0,
          totalDropAmount: 0,
          totalDropValue: 0,
          hpValue: 0,
          netProfit: 0,
        });
      }
    }
  } else if (selectedPeriod === "day") {
    const year = referenceDate.getUTCFullYear();
    const month = referenceDate.getUTCMonth();
    const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
    for (let day = 1; day <= daysInMonth; day++) {
      const bucketDate = new Date(Date.UTC(year, month, day, 0, 0, 0, 0));
      const key = `${year}-${month}-${day}`;
      const existing = map.get(key);
      if (existing) {
        result.push(existing);
      } else {
        result.push({
          periodKey: key,
          date: bucketDate,
          totalGainedExp: 0,
          skills: {},
          hpUsed: null,
          dropStats: {},
          lootItems: [],
          totalDrops: 0,
          totalDropAmount: 0,
          totalDropValue: 0,
          hpValue: 0,
          netProfit: 0,
        });
      }
    }
  } else {
    const year = referenceDate.getUTCFullYear();
    const yearStart = new Date(Date.UTC(year, 0, 1, 0, 0, 0, 0));
    const firstWeekStart = new Date(yearStart);
    const day = firstWeekStart.getUTCDay();
    firstWeekStart.setUTCDate(firstWeekStart.getUTCDate() - day);
    firstWeekStart.setUTCHours(0, 0, 0, 0);

    for (let i = 0; i < 52; i++) {
      const bucketDate = new Date(firstWeekStart);
      bucketDate.setUTCDate(bucketDate.getUTCDate() + i * 7);
      const key = `${bucketDate.getUTCFullYear()}-${bucketDate.getUTCMonth()}-${bucketDate.getUTCDate()}`;
      const existing = map.get(key);
      if (existing) {
        result.push(existing);
      } else {
        result.push({
          periodKey: key,
          date: bucketDate,
          totalGainedExp: 0,
          skills: {},
          hpUsed: null,
          dropStats: {},
          lootItems: [],
          totalDrops: 0,
          totalDropAmount: 0,
          totalDropValue: 0,
          hpValue: 0,
          netProfit: 0,
        });
      }
    }
  }

  return result;
};

export const HeatmapVisualization = ({ data, selectedPeriod }: HeatmapVisualizationProps) => {
  const normalizedData = buildTimeline(data, selectedPeriod);
  return (
    <div className="mt-2 grid grid-cols-1 gap-2 lg:grid-cols-2">
      <HeatmapChart
        data={normalizedData}
        valueKey="totalGainedExp"
        title="Exp Gained"
        selectedPeriod={selectedPeriod}
        formatter={val => `${val.toLocaleString()} XP`}
      />
      <HeatmapChart
        data={normalizedData}
        valueKey="netProfit"
        title="Net Profit"
        selectedPeriod={selectedPeriod}
        formatter={val => `${val.toLocaleString()} Gold`}
      />
    </div>
  );
};
