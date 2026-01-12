import { TIME_FRAME_OPTIONS } from './constants';
import { CardHeader, CardTitle, Button } from '@extension/ui';
import { memo } from 'react';
import type { TimeFrame } from './types';

interface ChartHeaderProps {
  userName: string;
  skillsCount: number;
  onSkillFilterClick: () => void;
  onTimeFilterClick: () => void;
  onImportClick: () => void;
  timeFrame: TimeFrame;
  children?: React.ReactNode;
}

const ImportIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="7 10 12 15 17 10" />
    <line x1="12" y1="15" x2="12" y2="3" />
  </svg>
);

const ChartHeader = memo(
  ({
    userName,
    skillsCount,
    onSkillFilterClick,
    onTimeFilterClick,
    onImportClick,
    timeFrame,
    children,
  }: ChartHeaderProps) => {
    const currentTimeFrameLabel = TIME_FRAME_OPTIONS.find(opt => opt.value === timeFrame)?.label || 'Last 24 Hours';

    return (
      <CardHeader className="flex flex-col items-stretch border-b py-4 sm:flex-row sm:py-6">
        <div className="flex flex-1 flex-col justify-center gap-3 px-6">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>{userName}</CardTitle>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={onSkillFilterClick}>
                Skills ({skillsCount})
              </Button>
              <Button variant="outline" size="sm" onClick={onTimeFilterClick}>
                {currentTimeFrameLabel}
              </Button>
              <Button variant="outline" size="icon" onClick={onImportClick} title="Import Stats">
                <ImportIcon />
              </Button>
            </div>
          </div>
          {children}
        </div>
      </CardHeader>
    );
  },
);

ChartHeader.displayName = 'ChartHeader';

export { ChartHeader };
