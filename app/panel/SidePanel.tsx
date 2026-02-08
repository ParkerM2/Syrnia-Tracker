import './SidePanel.css';
import Dashboard from './components/Dashboard';
import DataView from './components/DataView';
import Header from './components/Header';
import LootMap from './components/LootMap/index';
import Performance from './components/Performance';
import Profile from './components/Profile';
import Settings from './components/Settings';
import TrackedHistory from './components/TrackedHistory';
import DISPLAY from './constants/Tabs';
import { useGlobalDataSync } from './hooks/useGlobalDataSync';
import { QueryProvider } from './providers/QueryProvider';
import { cn, ErrorDisplay, LoadingSpinner, ThemeToggle } from '@app/components';
import { withErrorBoundary, withSuspense } from '@app/hoc';
import { useStorage } from '@app/hooks';
import { exampleThemeStorage } from '@app/utils/storage';
import { customThemesStorage } from '@app/utils/storage/custom-themes-storage';
import { getTheme, applyTheme, applyCustomTheme, isCustomThemeName, getCustomThemeId } from '@app/utils/themes';
import { useState, useEffect } from 'react';

/**
 * Inner component that uses QueryClient
 */
const SidePanelContent = () => {
  const storageData = useStorage(exampleThemeStorage);
  const customThemesState = useStorage(customThemesStorage);
  const isLight = storageData?.isLight ?? false;
  const [display, setDisplay] = useState(DISPLAY.DASHBOARD);

  // Set up global data sync listeners (always active regardless of current tab)
  useGlobalDataSync();

  // Apply dark mode class and theme colors to document root
  useEffect(() => {
    const root = document.documentElement;
    const shouldBeDark = storageData ? !isLight : true;

    if (shouldBeDark) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }

    // Apply theme colors
    if (storageData?.themeName) {
      if (isCustomThemeName(storageData.themeName)) {
        const themeId = getCustomThemeId(storageData.themeName);
        const customThemes = customThemesState?.themes ?? [];
        const custom = customThemes.find(t => t.id === themeId);
        if (custom) {
          applyCustomTheme(custom, shouldBeDark);
        }
      } else {
        const theme = getTheme(storageData.themeName);
        if (theme) {
          applyTheme(theme, shouldBeDark);
        }
      }
    }
  }, [isLight, storageData, customThemesState]);

  const renderComponent = (screen: string) => {
    switch (screen) {
      case DISPLAY.DASHBOARD:
        return <Dashboard />;
      case DISPLAY.PROFILE:
        return <Profile />;
      case DISPLAY.STATS:
        return <Performance />;
      case DISPLAY.LOOT:
        return <LootMap />;
      case DISPLAY.HISTORY:
        return <TrackedHistory />;
      case DISPLAY.SETTINGS:
        return <Settings />;
      case DISPLAY.DATA_VIEW:
        return <DataView />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <div className={cn('App min-h-screen bg-background p-8 text-foreground')}>
      <Header display={display} setDisplay={setDisplay} />
      {renderComponent(display)}
      <ThemeToggle />
    </div>
  );
};

const SidePanel = () => (
  <QueryProvider>
    <SidePanelContent />
  </QueryProvider>
);

export default withErrorBoundary(withSuspense(SidePanel, <LoadingSpinner />), ErrorDisplay);
