import '@src/Popup.css';
import {
  useStorage,
  withErrorBoundary,
  withSuspense,
  useHourlyExp,
  useTrackedDataQuery,
  useHourStats,
  useFormatting,
  useScreenData,
} from '@extension/shared';
import { exampleThemeStorage } from '@extension/storage';
import { cn, ErrorDisplay, LoadingSpinner, Button } from '@extension/ui';
import { useMemo, useEffect } from 'react';

const Popup = () => {
  const storageData = useStorage(exampleThemeStorage);
  const isLight = storageData?.isLight ?? false;
  const hourlyExp = useHourlyExp();
  const { loading, dataByHour } = useTrackedDataQuery();
  const { formatExp } = useFormatting();
  const screenData = useScreenData();

  // Apply dark mode class to document root immediately on mount and when theme changes
  useEffect(() => {
    const root = document.documentElement;
    const shouldBeDark = storageData ? !isLight : true;

    if (shouldBeDark) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [isLight, storageData]);

  // Get current hour
  const currentHour = useMemo(() => hourlyExp?.currentHour ?? new Date().getHours(), [hourlyExp?.currentHour]);

  // Get hour data for calculating skill stats
  const currentHourData = useMemo(() => {
    try {
      if (!dataByHour || currentHour === undefined || currentHour === null) {
        return [];
      }
      const now = new Date();
      const data = dataByHour(currentHour, now);
      if (!Array.isArray(data)) {
        return [];
      }
      return [...data].sort((a, b) => new Date(a?.timestamp || 0).getTime() - new Date(b?.timestamp || 0).getTime());
    } catch (error) {
      console.error('[Popup] Error processing current hour data:', error);
      return [];
    }
  }, [dataByHour, currentHour]);

  // Use the reusable hook for hour stats
  const now = useMemo(() => new Date(), []);
  const currentHourStats = useHourStats(currentHour, now);

  // Get current skill from screen data
  const currentSkill = useMemo(() => screenData?.actionText.currentActionText || '', [screenData]);

  // Helper function to get skill info
  const getSkillInfo = (skill: string, skillData: { skillLevel: string; expForNextLevel: string }) => {
    const isCurrentSkill = skill === currentSkill;

    if (isCurrentSkill && screenData?.actionText.currentActionText === skill) {
      return {
        level: screenData?.actionText.skillLevel || skillData?.skillLevel || '',
        expForNextLevel: screenData?.actionText.expForNextLevel || skillData?.expForNextLevel || '',
      };
    }

    return {
      level: skillData?.skillLevel || '',
      expForNextLevel: skillData?.expForNextLevel || '',
    };
  };

  // Get tracked skills for current hour
  const currentHourTrackedSkills = useMemo(
    () =>
      Object.entries(currentHourStats.expBySkill)
        .map(([skill, gainedExp]) => {
          // Find the most recent entry for this skill to get level info
          const mostRecent = currentHourData
            .filter(row => row.skill === skill)
            .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0];

          return {
            skill,
            gainedExp,
            lastUpdate: mostRecent?.timestamp || '',
            skillLevel: mostRecent?.skillLevel || '',
            expForNextLevel: mostRecent?.expForNextLevel || '',
          };
        })
        .sort((a, b) => new Date(b.lastUpdate).getTime() - new Date(a.lastUpdate).getTime()),
    [currentHourStats.expBySkill, currentHourData],
  );

  const openSidePanel = async () => {
    try {
      const currentWindow = await chrome.windows.getCurrent();
      if (currentWindow.id !== undefined) {
        await chrome.sidePanel.open({ windowId: currentWindow.id });
        // Close the popup after opening side panel
        if (window.close) {
          window.close();
        }
      }
    } catch (error) {
      console.error('Error opening side panel:', error);
    }
  };

  if (loading) {
    return (
      <div className={cn('App bg-background text-foreground flex items-center justify-center')}>
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className={cn('App bg-background text-foreground flex flex-col')}>
      <div className="flex-1 overflow-y-auto p-4">
        {currentHourTrackedSkills.length > 0 ? (
          <div className="flex flex-col gap-3">
            <h2 className="text-foreground mb-2 text-lg font-semibold">Current Hour Stats</h2>
            <div className="grid grid-cols-2 gap-2">
              {currentHourTrackedSkills.map(skillData => {
                const skillInfo = getSkillInfo(skillData.skill, {
                  skillLevel: skillData.skillLevel,
                  expForNextLevel: skillData.expForNextLevel,
                });
                return (
                  <div
                    key={skillData.skill}
                    className="hover:bg-accent flex flex-col rounded-lg border p-3 transition-colors">
                    <p className="text-muted-foreground truncate text-xs font-medium">
                      {skillData.skill}
                      {skillInfo.level ? ` Lv${skillInfo.level}` : ''}
                    </p>
                    <p className="mt-1 text-base font-bold text-green-500">+{formatExp(skillData.gainedExp)}</p>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="text-muted-foreground flex h-full items-center justify-center">
            <p>No current stats</p>
          </div>
        )}
      </div>
      <div className="border-border bg-card border-t p-3">
        <Button onClick={openSidePanel} className="w-full" variant="default">
          Open Side Panel
        </Button>
      </div>
    </div>
  );
};

export default withErrorBoundary(withSuspense(Popup, <LoadingSpinner />), ErrorDisplay);
