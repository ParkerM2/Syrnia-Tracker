import { usePerformanceCard } from './usePerformanceCard';
import { StatTable } from '../StatTable';
import { Card, CardContent, CardHeader, CardTitle } from '@app/components';
import { memo } from 'react';
import type { StatRow } from '../StatTable';

interface PerformanceCardProps {
  title: string;
  rows: StatRow[];
  className?: string;
}

/**
 * Reusable performance card component
 * Wraps StatTable in a Card with title
 */
const PerformanceCard = memo(({ title, rows, className }: PerformanceCardProps) => {
  const { title: displayTitle, rows: displayRows } = usePerformanceCard(title, rows);

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="text-lg">{displayTitle}</CardTitle>
      </CardHeader>
      <CardContent>
        <StatTable rows={displayRows} />
      </CardContent>
    </Card>
  );
});

PerformanceCard.displayName = 'PerformanceCard';

export { PerformanceCard };
