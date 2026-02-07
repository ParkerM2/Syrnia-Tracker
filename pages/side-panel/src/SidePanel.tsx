import '@src/SidePanel.css';
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
import { withErrorBoundary, withSuspense, useStorage, getTheme, applyTheme } from '@extension/shared';
import { exampleThemeStorage } from '@extension/storage';
import { cn, ErrorDisplay, LoadingSpinner, ThemeToggle } from '@extension/ui';
import { useState, useEffect } from 'react';

/**
 * Inner component that uses QueryClient
 */
const SidePanelContent = () => {
  const storageData = useStorage(exampleThemeStorage);
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
      const theme = getTheme(storageData.themeName);
      if (theme) {
        applyTheme(theme, shouldBeDark);
      }
    }
  }, [isLight, storageData]);

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
    <div className={cn('App bg-background text-foreground min-h-screen p-8')}>
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
