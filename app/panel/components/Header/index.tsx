import DISPLAY from "../../constants/Tabs";
import { Badge, cn, Popover, PopoverTrigger, PopoverContent } from "@app/components";
import * as RadixIcons from "@radix-ui/react-icons";
import { useState } from "react";

interface HeaderProps {
  headerText?: string;
  display: string;
  setDisplay: (value: string) => void;
}

const tabIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  [DISPLAY.DASHBOARD]: RadixIcons.HomeIcon,
  [DISPLAY.CALENDAR]: RadixIcons.CalendarIcon,
  [DISPLAY.PROFILE]: RadixIcons.PersonIcon,
  [DISPLAY.STATS]: RadixIcons.BarChartIcon,
  [DISPLAY.LOOT]: RadixIcons.CubeIcon,
  [DISPLAY.HISTORY]: RadixIcons.ClockIcon,
  [DISPLAY.SETTINGS]: RadixIcons.GearIcon,
  [DISPLAY.DATA_VIEW]: RadixIcons.TableIcon,
};

const Header: React.FC<HeaderProps> = ({ display, setDisplay }) => {
  const [desktopPopoverOpen, setDesktopPopoverOpen] = useState(false);
  const [mobilePopoverOpen, setMobilePopoverOpen] = useState(false);

  // Main tabs (excluding settings)
  const mainTabs = [
    { key: DISPLAY.DASHBOARD, label: "Dashboard" },
    { key: DISPLAY.CALENDAR, label: "Calendar" },
    { key: DISPLAY.PROFILE, label: "Profile" },
    { key: DISPLAY.STATS, label: "Performance" },
    { key: DISPLAY.LOOT, label: "Loot" },
    { key: DISPLAY.HISTORY, label: "History" },
  ];

  // Settings dropdown items (only shown in dropdown)
  const settingsDropdownItems = [
    { key: DISPLAY.DATA_VIEW, label: "Data View" },
    { key: DISPLAY.SETTINGS, label: "Settings" },
  ];

  // All tabs including settings for popover menu
  const allTabs = [...mainTabs, ...settingsDropdownItems];

  const handleTabSelect = (tabKey: string, isMobile: boolean = false) => {
    setDisplay(tabKey);
    if (isMobile) {
      setMobilePopoverOpen(false);
    } else {
      setDesktopPopoverOpen(false);
    }
  };

  return (
    <div className={cn("flex w-full flex-row items-center pb-4 transition-all duration-300")}>
      {/* Tab Navigation - Responsive Badge Row */}
      {/* Above 700: normal layout with main tabs and settings dropdown */}
      <div className="hidden w-full flex-row flex-wrap items-center justify-center gap-2 min-[700px]:flex min-[700px]:gap-5">
        {mainTabs.map(tab => {
          const isSelected = display === tab.key;
          const IconComponent = tabIcons[tab.key] || RadixIcons.DotFilledIcon;

          return (
            <Badge
              key={tab.key}
              as="button"
              type="button"
              onClick={() => setDisplay(tab.key)}
              isActive={isSelected}
              className="h-10 w-10 p-0 min-[700px]:h-auto min-[700px]:w-auto min-[700px]:px-2.5 min-[700px]:py-0.5"
              aria-label={tab.label}
              aria-selected={isSelected}
              role="tab">
              <IconComponent className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
              <span className="hidden whitespace-nowrap min-[700px]:inline">{tab.label}</span>
            </Badge>
          );
        })}

        {/* Settings dropdown for desktop */}
        <Popover open={desktopPopoverOpen} onOpenChange={setDesktopPopoverOpen}>
          <PopoverTrigger asChild>
            <Badge
              as="button"
              type="button"
              isActive={display === DISPLAY.SETTINGS || display === DISPLAY.DATA_VIEW}
              className="h-10 w-10 p-0 min-[700px]:h-auto min-[700px]:w-auto min-[700px]:px-2.5 min-[700px]:py-0.5"
              aria-label="Settings"
              aria-selected={display === DISPLAY.SETTINGS || display === DISPLAY.DATA_VIEW}>
              <RadixIcons.GearIcon className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
              <span className="hidden whitespace-nowrap min-[700px]:inline">Settings</span>
            </Badge>
          </PopoverTrigger>
          <PopoverContent align="center" className="w-40 p-2">
            <div className="flex flex-col justify-start gap-y-2">
              {settingsDropdownItems.map(item => {
                const IconComponent = tabIcons[item.key] || RadixIcons.DotFilledIcon;
                const isSelected = display === item.key;
                return (
                  <Badge
                    key={item.key}
                    as="button"
                    type="button"
                    onClick={() => handleTabSelect(item.key, false)}
                    isActive={isSelected}
                    aria-label={item.label}
                    aria-selected={isSelected}
                    role="tab">
                    <IconComponent className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
                    <span className="inline w-full whitespace-nowrap text-left">{item.label}</span>
                  </Badge>
                );
              })}
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {/* Below 700: centered badges with text, settings dropdown on right */}
      <div className="flex w-full items-center justify-between gap-2 min-[700px]:hidden">
        {/* Centered badges with text */}
        <div className="flex flex-1 flex-wrap items-center justify-center gap-2">
          {mainTabs.map(tab => {
            const isSelected = display === tab.key;
            const IconComponent = tabIcons[tab.key] || RadixIcons.DotFilledIcon;

            return (
              <Badge
                key={tab.key}
                as="button"
                type="button"
                onClick={() => setDisplay(tab.key)}
                isActive={isSelected}
                className="px-2.5 py-0.5"
                aria-label={tab.label}
                aria-selected={isSelected}
                role="tab">
                <IconComponent className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
              </Badge>
            );
          })}
        </div>

        {/* Settings popover on the right */}
        <Popover open={mobilePopoverOpen} onOpenChange={setMobilePopoverOpen}>
          <PopoverTrigger asChild>
            <Badge
              as="button"
              type="button"
              isActive={display === DISPLAY.SETTINGS || display === DISPLAY.DATA_VIEW}
              className="h-10 w-10 flex-shrink-0 p-0 min-[700px]:hidden"
              aria-label="Settings"
              aria-selected={display === DISPLAY.SETTINGS || display === DISPLAY.DATA_VIEW}>
              <RadixIcons.GearIcon className="h-4 w-4" aria-hidden="true" />
            </Badge>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-40 p-2">
            <div className="flex flex-col justify-start gap-y-2">
              {allTabs.map(tab => {
                const IconComponent = tabIcons[tab.key] || RadixIcons.DotFilledIcon;
                const isSelected = display === tab.key;
                return (
                  <Badge
                    key={tab.key}
                    as="button"
                    type="button"
                    onClick={() => handleTabSelect(tab.key, true)}
                    isActive={isSelected}
                    aria-label={tab.label}
                    aria-selected={isSelected}
                    role="tab">
                    <IconComponent className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
                    <span className="inline w-full whitespace-nowrap text-left">{tab.label}</span>
                  </Badge>
                );
              })}
            </div>
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
};

export default Header;
