import ExpChart from './ExpChart';
import { useDashboard } from './useDashboard';
import { TrendDownIcon, TrendUpIcon } from '@app/assets/icons';
import { cn, Card, CardContent, CardHeader, CardDescription } from '@app/components';
import { memo } from 'react';

/**
 * Large Metric Card Component - styled like the image design
 */
interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  trend?: { value: number; isPositive: boolean };
  icon?: React.ReactNode;
  className?: string;
  lootItems?: { imageUrl: string; name: string; quantity: number }[];
}

const MetricCard = memo(({ title, value, subtitle, trend, lootItems }: MetricCardProps) => (
  <Card className="pt-2">
    <CardHeader className="text-md flex h-fit flex-row items-center justify-between py-2 font-bold">
      <p className="text-left text-lg font-bold">{title}</p>
      <div className="flex flex-row items-end gap-1">
        <div className="border-foreground/20 dark:border-foreground/40 flex flex-row items-center gap-1 rounded-md border bg-green-500/20 px-2 py-1 dark:bg-teal-500/20">
          <TrendUpIcon className="h-4 w-4 text-green-400" />
          <p className="text-lg font-medium text-green-400">+{value}</p>
        </div>
        {trend && (
          <div className="border-foreground/20 dark:border-foreground/40 flex flex-col items-end gap-1 rounded-md border bg-green-500/20 px-2 py-1 dark:bg-teal-500/20">
            <div
              className={cn(
                'flex items-center gap-1 text-lg font-semibold',
                trend.isPositive ? 'text-foreground' : 'text-red-500',
              )}>
              {trend.isPositive ? (
                <TrendUpIcon className="h-4 w-4 text-foreground" />
              ) : (
                <TrendDownIcon className="h-4 w-4 text-foreground" />
              )}
              {trend.isPositive ? '+' : ''}
              {trend.value}%
            </div>
          </div>
        )}
      </div>
    </CardHeader>
    <p className="pb-2 text-sm text-muted-foreground">{subtitle}</p>
    {lootItems && lootItems.length > 0 && (
      <CardContent>
        <CardDescription>
          <div className="mt-4 flex flex-wrap gap-2">
            {lootItems.map(item => (
              <div key={item.name} className="bg-muted/40 relative flex h-10 w-10 items-center justify-center rounded">
                <img src={item.imageUrl} alt={item.name} className="h-8 w-8 object-contain" />
                <span className="absolute left-0.5 top-0.5 text-[10px] font-semibold text-white drop-shadow-[0_1px_1px_rgba(0,0,0,0.8)]">
                  {item.quantity.toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        </CardDescription>
      </CardContent>
    )}
  </Card>
));
MetricCard.displayName = 'MetricCard';

/**
 * Dashboard Component
 * Pure JSX component - all logic is in useDashboard hook
 */
const Dashboard = memo(() => {
  const { loading, hasAnyData, trend, mainSkillCard, otherSkillsCards, previousLootCard, currentLootCard } =
    useDashboard();

  if (loading) {
    return <div className={cn('p-4 text-lg font-semibold')}>Loading tracked data...</div>;
  }

  if (!hasAnyData) {
    return (
      <div className={cn('flex flex-col gap-4')}>
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-sm text-muted-foreground">No tracked data found.</p>
            <p className="mt-2 text-xs text-muted-foreground">
              Start playing to track your experience, drops, and stats.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className={cn('flex flex-col gap-6')}>
      {/* Top Metric Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Main Skill Card */}
        {/* {mainSkillCard && ( */}
        <MetricCard
          trend={trend}
          title={mainSkillCard?.skill || 'Main Skill'}
          value={mainSkillCard?.expPerHour || '0'}
          subtitle={mainSkillCard?.subtitle || ''}
          className="col-span-1"
        />
        {/* )} */}

        {/* Other Tracked Skills */}
        {otherSkillsCards.map(skillCard => (
          <MetricCard
            key={skillCard.skill}
            title={skillCard.skill}
            value={skillCard.expPerHour}
            subtitle={skillCard.subtitle}
          />
        ))}

        {/* Current Hour Loot */}
        {currentLootCard && (
          <MetricCard
            title={currentLootCard.title || 'Current Drops'}
            value={currentLootCard.value}
            subtitle={currentLootCard.subtitle}
            lootItems={currentLootCard.lootItems}
          />
        )}

        {/* Previous Hour Loot Card */}
        {previousLootCard && (
          <MetricCard
            title={previousLootCard.title}
            value={previousLootCard.value}
            subtitle={previousLootCard.subtitle}
            className="col-span-2 [&_p]:text-green-500"
            lootItems={previousLootCard.lootItems}
          />
        )}
      </div>
      {/* Exp Chart - Heatmap of exp/loot */}
      <ExpChart />
    </div>
  );
});

Dashboard.displayName = 'Dashboard';

export default Dashboard;
