import { Tabs, TabsList, TabsTrigger, cn } from '@extension/ui';
import DISPLAY from '@src/constants/Tabs';

interface HeaderProps {
  headerText?: string;
  display: string;
  setDisplay: (value: string) => void;
}

const Header: React.FC<HeaderProps> = ({ headerText = 'Loot Tracker and Calculator', display, setDisplay }) => {
  // Available tabs - only show tabs that have components implemented
  const availableTabs = [
    { key: DISPLAY.DASHBOARD, label: 'Dashboard' },
    { key: DISPLAY.STATS, label: 'Performance' },
    { key: DISPLAY.LOOT, label: 'Loot' },
    { key: DISPLAY.HISTORY, label: 'History' },
  ];

  return (
    <div className={cn('flex w-full flex-col pb-4')}>
      <div className="flex h-14 w-full flex-row items-center justify-between border-b-2 pb-6">
        <h1 className="text-xl font-semibold tracking-widest">{headerText}</h1>
      </div>

      {/* Tab Navigation */}
      <Tabs value={display} onValueChange={setDisplay} className="w-full">
        <TabsList className="w-full justify-start">
          {availableTabs.map(tab => (
            <TabsTrigger key={tab.key} value={tab.key}>
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>
    </div>
  );
};

export default Header;
