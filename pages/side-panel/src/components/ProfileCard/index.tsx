import { useUserStatsQuery, useFormatting, useHourStats, useHourlyExp } from '@extension/shared';
import { cn, Card, CardContent, Button, Progress } from '@extension/ui';
import { useCallback, useMemo, useState } from 'react';

const STATS_PAGE_URL = 'https://www.syrnia.com/theGame/includes2/stats.php';

/**
 * Normalize skill name for image URL
 * Converts skill name to lowercase for URL matching
 */
const getSkillImageUrl = (skillName: string): string => {
  const normalized = skillName.toLowerCase();
  return `https://www.syrnia.com/images/skills/skills37/${normalized}.jpg`;
};

interface SkillCardProps {
  skill: string;
  level: number;
  totalExp: number;
  expForNext: number;
  expLeft: number;
  percentToNext: number;
  displayHourExp: number;
  gainedThisWeek: number | null;
  levelGainedThisWeek: string;
}

const SkillCard = ({
  skill,
  level,
  totalExp,
  expForNext,
  expLeft,
  percentToNext,
  displayHourExp,
  gainedThisWeek,
  levelGainedThisWeek,
}: SkillCardProps) => {
  const { formatExp } = useFormatting();
  const [isExpanded, setIsExpanded] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);

  return (
    <Card className="min-w-[200px] flex-1">
      <CardContent className="p-4">
        {/* Header: Image, Level, Skill Name, +Hour, +Week */}
        <div className="mb-2 flex items-center gap-2">
          <div className="flex items-center gap-2">
            <img
              src={getSkillImageUrl(skill)}
              alt={`${skill}${level > 0 ? ` - Level ${level}` : ''}`}
              className="h-10 w-10 flex-shrink-0 rounded object-cover"
              onLoad={() => setImageLoaded(true)}
              onError={e => {
                setImageError(true);
                // Hide image if it fails to load
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
            {level > 0 && <span className="text-base font-bold">{level}</span>}
          </div>
          <div className="flex flex-1 items-center justify-end gap-2">
            {(!imageLoaded || imageError) && <span className="mr-auto text-base font-semibold">{skill}</span>}
            <div className="flex flex-col items-end gap-0.5">
              {displayHourExp > 0 && (
                <span className="text-sm font-semibold text-green-500">+{formatExp(displayHourExp)}</span>
              )}
              {gainedThisWeek !== null && (
                <span className="text-xs font-semibold text-blue-500">+{formatExp(gainedThisWeek)}</span>
              )}
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        {expForNext > 0 && (
          <div className="mb-2 flex flex-col gap-1">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">{formatExp(expLeft)} exp left</span>
              <span className="text-muted-foreground">{percentToNext.toFixed(1)}%</span>
            </div>
            <Progress value={percentToNext} />
          </div>
        )}

        {/* Expandable Stats Section */}
        {(totalExp > 0 || expForNext > 0 || parseInt(levelGainedThisWeek, 10) > 0) && (
          <div className="border-t pt-2">
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="text-muted-foreground hover:text-foreground w-full text-left text-xs transition-colors">
              {isExpanded ? '▼ Hide details' : '▶ Show details'}
            </button>
            {isExpanded && (
              <div className="mt-2 flex flex-col gap-1 text-left text-sm">
                <div>
                  <span className="text-muted-foreground">Total Exp: </span>
                  <span className="font-semibold">{formatExp(totalExp)}</span>
                </div>
                {expForNext > 0 && (
                  <div>
                    <span className="text-muted-foreground">Exp Left: </span>
                    <span className="font-semibold">{formatExp(expLeft)}</span>
                  </div>
                )}
                {parseInt(levelGainedThisWeek, 10) > 0 && (
                  <div>
                    <span className="text-muted-foreground">Levels (Week): </span>
                    <span className="font-semibold text-purple-500">+{levelGainedThisWeek}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

const ProfileCard = () => {
  const { userStats, loading } = useUserStatsQuery();

  // Get tracked current hour exp (from tracked_data_csv)
  const hourlyExp = useHourlyExp();
  const currentHour = useMemo(() => hourlyExp?.currentHour ?? new Date().getHours(), [hourlyExp?.currentHour]);
  const now = useMemo(() => new Date(), []);
  const currentHourStats = useHourStats(currentHour, now);

  const handleOpenStatsPage = useCallback(() => {
    chrome.tabs.create({ url: STATS_PAGE_URL });
  }, []);

  if (loading) {
    return <div className={cn('p-4 text-lg font-semibold')}>Loading profile data...</div>;
  }

  if (!userStats) {
    return (
      <div className={cn('flex flex-col gap-4 p-4')}>
        <p className="text-muted-foreground text-sm">
          Open player stats in new tab, after data displays feel free to close.
        </p>
        <Button onClick={handleOpenStatsPage} className="w-full">
          Open Player Stats
        </Button>
      </div>
    );
  }

  const skills = Object.values(userStats.skills);
  const sortedSkills = [...skills].sort((a, b) => {
    const levelA = parseInt(a.level || '0', 10);
    const levelB = parseInt(b.level || '0', 10);
    return levelB - levelA;
  });

  return (
    <div className={cn('flex flex-col gap-4')}>
      {/* Skills List */}
      <div className="flex flex-wrap gap-3">
        {sortedSkills.map(skill => {
          const level = parseInt(skill.level || '0', 10);
          const totalExp = parseInt(skill.totalExp || '0', 10);
          const expForNext = parseInt(skill.expForNextLevel || '0', 10);
          const expLeft = parseInt(skill.expLeft || '0', 10);
          const percentToNext = skill.percentToNext || 0;
          const gainedThisHour = skill.gainedThisHour ? parseInt(skill.gainedThisHour, 10) : null;
          const gainedThisWeek = skill.gainedThisWeek ? parseInt(skill.gainedThisWeek, 10) : null;
          const levelGainedThisWeek = skill.levelGainedThisWeek || '0';

          // Get tracked current hour exp
          const trackedHourExp = currentHourStats.expBySkill[skill.skill] || 0;
          const statsPageHourExp = gainedThisHour;
          const displayHourExp = trackedHourExp > 0 ? trackedHourExp : statsPageHourExp || 0;

          return (
            <SkillCard
              key={skill.skill}
              skill={skill.skill}
              level={level}
              totalExp={totalExp}
              expForNext={expForNext}
              expLeft={expLeft}
              percentToNext={percentToNext}
              displayHourExp={displayHourExp}
              gainedThisWeek={gainedThisWeek}
              levelGainedThisWeek={levelGainedThisWeek}
            />
          );
        })}
      </div>

      {/* Refresh Button */}
      <Button onClick={handleOpenStatsPage} variant="outline" className="w-full">
        Refresh Stats
      </Button>
    </div>
  );
};

export default ProfileCard;
