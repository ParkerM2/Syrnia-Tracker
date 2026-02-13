import { Card, CardContent, CardHeader, CardTitle } from "@app/components";
import { memo } from "react";
import type { TimePeriod } from "@app/types";

interface PeriodSummaryCardProps {
  selectedPeriod: TimePeriod;
  skills: Record<string, number>;
}

const PeriodSummaryCard = memo(({ selectedPeriod, skills }: PeriodSummaryCardProps) => {
  const skillEntries = Object.entries(skills) as [string, number][];

  if (skillEntries.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Statistics ({selectedPeriod})</CardTitle>
        </CardHeader>
        <CardContent />
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Statistics ({selectedPeriod})</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-1">
          {skillEntries
            .sort(([, a], [, b]) => b - a)
            .map(([skill, exp]) => (
              <div key={skill} className="flex justify-between">
                <span className="text-sm">{skill}</span>
                <span className="text-sm font-medium">{exp.toLocaleString()} exp</span>
              </div>
            ))}
        </div>
      </CardContent>
    </Card>
  );
});

PeriodSummaryCard.displayName = "PeriodSummaryCard";

export default PeriodSummaryCard;
