import { useGlobalDataSync } from "./useGlobalDataSync";
import Calendar from "../components/Calendar";
import Dashboard from "../components/Dashboard";
import DataView from "../components/DataView";
import LootMap from "../components/LootMap/index";
import Performance from "../components/Performance";
import Profile from "../components/Profile";
import Settings from "../components/Settings";
import TrackedHistory from "../components/TrackedHistory";
import DISPLAY from "../constants/Tabs";
import { useStorage } from "@app/hooks";
import { exampleThemeStorage } from "@app/utils/storage";
import { customThemesStorage } from "@app/utils/storage/custom-themes-storage";
import { injectThemeStylesheet, setActiveTheme } from "@app/utils/themes";
import { useMemo, useState, useEffect } from "react";

const SCREEN_MAP: Record<string, React.ComponentType> = {
  [DISPLAY.DASHBOARD]: Dashboard,
  [DISPLAY.CALENDAR]: Calendar,
  [DISPLAY.PROFILE]: Profile,
  [DISPLAY.STATS]: Performance,
  [DISPLAY.LOOT]: LootMap,
  [DISPLAY.HISTORY]: TrackedHistory,
  [DISPLAY.SETTINGS]: Settings,
  [DISPLAY.DATA_VIEW]: DataView,
};

export const useSidePanel = () => {
  const storageData = useStorage(exampleThemeStorage);
  const customThemesState = useStorage(customThemesStorage);
  const isLight = storageData?.isLight ?? false;
  const [display, setDisplay] = useState(DISPLAY.DASHBOARD);

  useGlobalDataSync();

  useEffect(() => {
    const isDark = storageData ? !isLight : true;
    const customs = customThemesState?.themes ?? [];
    injectThemeStylesheet(customs);
    setActiveTheme(storageData?.themeName, isDark, customs);
  }, [isLight, storageData, customThemesState]);

  const ActiveScreen = useMemo(() => SCREEN_MAP[display] ?? Dashboard, [display]);

  return { display, setDisplay, ActiveScreen };
};
