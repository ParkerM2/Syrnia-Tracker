import '@src/SidePanel.css';
import Dashboard from './components/Dashboard';
import Header from './components/Header';
import LootMap from './components/LootMap/index';
import Stats from './components/Stats';
import TrackedHistory from './components/TrackedHistory';
import DISPLAY from './constants/Tabs';
import { withErrorBoundary, withSuspense, useStorage } from '@extension/shared';
import { exampleThemeStorage } from '@extension/storage';
import { cn, ErrorDisplay, LoadingSpinner, ThemeToggle } from '@extension/ui';
import { useState, useEffect } from 'react';

const SidePanel = () => {
  const storageData = useStorage(exampleThemeStorage);
  const isLight = storageData?.isLight ?? false;
  const [display, setDisplay] = useState(DISPLAY.DASHBOARD);

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

  const renderComponent = (screen: string) => {
    switch (screen) {
      case DISPLAY.DASHBOARD:
        return <Dashboard />;
      case DISPLAY.STATS:
        return <Stats />;
      case DISPLAY.LOOT:
        return <LootMap />;
      case DISPLAY.HISTORY:
        return <TrackedHistory />;
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

export default withErrorBoundary(withSuspense(SidePanel, <LoadingSpinner />), ErrorDisplay);
