import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@app/components";
import { TIME_FRAME_OPTIONS } from "@app/constants";
import { memo } from "react";
import type { TimeFrame } from "@app/types";

interface TimeFrameFilterDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentTimeFrame: TimeFrame;
  onTimeFrameSelect: (timeFrame: TimeFrame) => void;
}

const TimeFrameFilterDialog = memo(
  ({ open, onOpenChange, currentTimeFrame, onTimeFrameSelect }: TimeFrameFilterDialogProps) => {
    const handleSelect = (timeFrame: TimeFrame) => {
      onTimeFrameSelect(timeFrame);
      onOpenChange(false);
    };

    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Select Time Frame</DialogTitle>
            <DialogDescription>Choose the time period to display on the chart.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-4">
            {TIME_FRAME_OPTIONS.map(option => (
              <button
                key={option.value}
                onClick={() => handleSelect(option.value)}
                className={`w-full rounded-md border border-border bg-card p-3 text-left transition-colors ${
                  currentTimeFrame === option.value ? "bg-primary/10 border-primary text-primary" : "hover:bg-accent"
                }`}>
                <div className="font-medium">{option.label}</div>
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    );
  },
);

TimeFrameFilterDialog.displayName = "TimeFrameFilterDialog";

export { TimeFrameFilterDialog };
