import DISPLAY from "../../constants/Tabs";
import { Badge, cn } from "@app/components";
import * as RadixIcons from "@radix-ui/react-icons";

interface HeaderProps {
  headerText?: string;
  display: string;
  setDisplay: (value: string) => void;
}

const tabs = [
  { key: DISPLAY.DASHBOARD, label: "Dashboard", Icon: RadixIcons.HomeIcon },
  { key: DISPLAY.CALENDAR, label: "Calendar", Icon: RadixIcons.CalendarIcon },
  { key: DISPLAY.PROFILE, label: "Profile", Icon: RadixIcons.PersonIcon },
  { key: DISPLAY.STATS, label: "Performance", Icon: RadixIcons.BarChartIcon },
  { key: DISPLAY.LOOT, label: "Loot", Icon: RadixIcons.CubeIcon },
  { key: DISPLAY.HISTORY, label: "History", Icon: RadixIcons.ClockIcon },
  { key: DISPLAY.DATA_VIEW, label: "Data", Icon: RadixIcons.TableIcon },
  { key: DISPLAY.SETTINGS, label: "Settings", Icon: RadixIcons.GearIcon },
];

const Header: React.FC<HeaderProps> = ({ display, setDisplay }) => (
  <div className={cn("flex w-full flex-row items-center justify-center pb-4 transition-all duration-300")}>
    <div className="flex flex-row flex-wrap items-center justify-center gap-2 min-[700px]:gap-5">
      {tabs.map(({ key, label, Icon }) => {
        const isSelected = display === key;
        return (
          <Badge
            key={key}
            as="button"
            type="button"
            onClick={() => setDisplay(key)}
            isActive={isSelected}
            className="h-10 w-10 p-0 min-[700px]:h-auto min-[700px]:w-auto min-[700px]:px-2.5 min-[700px]:py-0.5"
            aria-label={label}
            aria-selected={isSelected}
            role="tab">
            <Icon className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
            <span className="hidden whitespace-nowrap min-[700px]:inline">{label}</span>
          </Badge>
        );
      })}
    </div>
  </div>
);

export default Header;
