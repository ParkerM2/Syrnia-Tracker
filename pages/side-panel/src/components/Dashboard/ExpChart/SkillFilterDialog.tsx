import { useFormatting } from '@extension/shared';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  Button,
} from '@extension/ui';
import { memo } from 'react';

interface SkillFilterDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  allAvailableSkills: string[];
  selectedSkills: Set<string>;
  skillTotals: Record<string, number>;
  onSkillToggle: (skill: string) => void;
  onSelectAll: () => void;
  onDeselectAll: () => void;
}

const SkillFilterDialog = memo(
  ({
    open,
    onOpenChange,
    allAvailableSkills,
    selectedSkills,
    skillTotals,
    onSkillToggle,
    onSelectAll,
    onDeselectAll,
  }: SkillFilterDialogProps) => {
    const { formatExp } = useFormatting();

    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Select Skills to Display</DialogTitle>
            <DialogDescription>
              Choose which skills to show on the chart. At least one skill must be selected.
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-[400px] space-y-2 overflow-y-auto py-4">
            <div className="flex gap-2 pb-2">
              <Button variant="outline" size="sm" onClick={onSelectAll}>
                Select All
              </Button>
              <Button variant="outline" size="sm" onClick={onDeselectAll}>
                Deselect All
              </Button>
            </div>
            {allAvailableSkills.map(skill => (
              <label
                key={skill}
                className="border-border bg-card hover:bg-accent flex cursor-pointer items-center gap-2 rounded-md border p-3 transition-colors">
                <input
                  type="checkbox"
                  checked={selectedSkills.has(skill)}
                  onChange={() => onSkillToggle(skill)}
                  className="border-border bg-background h-4 w-4 rounded"
                />
                <span className="flex-1 font-medium">{skill}</span>
                {skillTotals[skill] !== undefined && (
                  <span className="text-muted-foreground text-sm">{formatExp(skillTotals[skill])}</span>
                )}
              </label>
            ))}
          </div>
          <DialogFooter>
            <Button onClick={() => onOpenChange(false)}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  },
);

SkillFilterDialog.displayName = 'SkillFilterDialog';

export { SkillFilterDialog };
