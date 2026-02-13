import DISPLAY from "../../constants/Tabs";
import {
  Badge,
  Button,
  Card,
  cn,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@app/components";
import { useStorage } from "@app/hooks";
import { ZOOM_MAX, ZOOM_MIN, ZOOM_STEP, zoomStorage } from "@app/utils/storage";
import * as RadixIcons from "@radix-ui/react-icons";
import { useLayoutEffect, useRef, useState } from "react";

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

type NavMode = "full" | "compact" | "menu";

const wraps = (el: HTMLElement) => {
  const children = Array.from(el.children) as HTMLElement[];
  if (children.length < 2) return false;
  const top = children[0].offsetTop;
  return children.some(c => c.offsetTop !== top);
};

const Header: React.FC<HeaderProps> = ({ display, setDisplay }) => {
  const compactRef = useRef<HTMLDivElement>(null);
  const fullRef = useRef<HTMLDivElement>(null);
  const [mode, setMode] = useState<NavMode>("compact");
  const { zoomLevel } = useStorage(zoomStorage);

  useLayoutEffect(() => {
    const compactEl = compactRef.current;
    const fullEl = fullRef.current;
    if (!compactEl || !fullEl) return;

    const check = () => {
      if (!wraps(fullEl)) setMode("full");
      else if (!wraps(compactEl)) setMode("compact");
      else setMode("menu");
    };

    check();

    const observer = new ResizeObserver(check);
    observer.observe(compactEl);
    return () => observer.disconnect();
  }, []);

  return (
    <>
      {/* Floating hamburger menu — visible only in menu mode */}
      {mode === "menu" && (
        <div className="fixed right-4 top-4 z-50">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                className="h-12 w-12 rounded-full border-2 bg-background shadow-lg hover:bg-accent"
                aria-label="Navigation menu">
                <RadixIcons.HamburgerMenuIcon className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" sideOffset={8}>
              {tabs.map(({ key, label, Icon }) => (
                <DropdownMenuItem
                  key={key}
                  onClick={() => setDisplay(key)}
                  className={cn(display === key && "bg-accent text-accent-foreground")}>
                  <Icon className="h-4 w-4" />
                  <span>{label}</span>
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
              <div className="flex items-center justify-between px-2 py-1.5">
                <span className="text-xs text-muted-foreground">Zoom</span>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    disabled={zoomLevel <= ZOOM_MIN}
                    onClick={() => zoomStorage.setZoomLevel(zoomLevel - ZOOM_STEP)}>
                    <RadixIcons.MinusIcon className="h-3 w-3" />
                  </Button>
                  <span className="w-8 text-center text-xs">{zoomLevel}%</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    disabled={zoomLevel >= ZOOM_MAX}
                    onClick={() => zoomStorage.setZoomLevel(zoomLevel + ZOOM_STEP)}>
                    <RadixIcons.PlusIcon className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}

      <div className="relative">
        {/* Hidden measurement gauges — always present, same width as visible nav */}
        <div
          className="pointer-events-none invisible absolute inset-x-0 top-0 overflow-hidden"
          style={{ maxHeight: 0 }}
          aria-hidden="true">
          <Card className="p-3">
            <div ref={fullRef} className="flex flex-row flex-wrap items-center justify-center gap-5">
              {tabs.map(({ key, label, Icon }) => (
                <Badge key={key} className="h-auto w-auto px-2.5 py-0.5" tabIndex={-1}>
                  <Icon className="h-4 w-4 flex-shrink-0" />
                  <span className="whitespace-nowrap">{label}</span>
                </Badge>
              ))}
            </div>
          </Card>
          <Card className="p-3">
            <div ref={compactRef} className="flex flex-row flex-wrap items-center justify-center gap-2">
              {tabs.map(({ key, Icon }) => (
                <Badge key={key} className="h-10 w-10 p-0" tabIndex={-1}>
                  <Icon className="h-4 w-4 flex-shrink-0" />
                </Badge>
              ))}
            </div>
          </Card>
        </div>

        {/* Visible nav — collapses to zero height in menu mode but stays measurable */}
        <div className={cn(mode === "menu" && "max-h-0 overflow-hidden")}>
          <Card className="p-3">
            <div
              className={cn(
                "flex flex-row flex-wrap items-center justify-center",
                mode === "full" ? "gap-5" : "gap-2",
              )}>
              {tabs.map(({ key, label, Icon }) => {
                const isSelected = display === key;
                return (
                  <Badge
                    key={key}
                    as="button"
                    type="button"
                    onClick={() => setDisplay(key)}
                    isActive={isSelected}
                    className={cn(mode === "full" ? "h-auto w-auto px-2.5 py-0.5" : "h-10 w-10 p-0")}
                    aria-label={label}
                    aria-selected={isSelected}
                    role="tab">
                    <Icon className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
                    {mode === "full" && <span className="whitespace-nowrap">{label}</span>}
                  </Badge>
                );
              })}
            </div>
          </Card>
        </div>
      </div>
    </>
  );
};

export default Header;
