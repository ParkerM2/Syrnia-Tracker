import { ImportIcon } from "@app/assets/icons";
import { CardHeader, CardTitle, Button, IconButton } from "@app/components";
import { memo } from "react";

interface ChartHeaderProps {
  userName: string;
  skillsCount: number;
  onSkillFilterClick: () => void;
  onTimeFilterClick: () => void;
  onImportClick: () => void;
  timeFrameLabel: string;
  children?: React.ReactNode;
}

const ChartHeader = memo(
  ({
    userName,
    skillsCount,
    onSkillFilterClick,
    onTimeFilterClick,
    onImportClick,
    timeFrameLabel,
    children,
  }: ChartHeaderProps) => (
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
              {timeFrameLabel}
            </Button>
            <IconButton
              onClick={onImportClick}
              variant="outline"
              size="icon"
              label="Import Stats"
              className="flex-shrink-0"
              Icon={ImportIcon}
            />
          </div>
        </div>
        {children}
      </div>
    </CardHeader>
  ),
);

ChartHeader.displayName = "ChartHeader";

export { ChartHeader };
