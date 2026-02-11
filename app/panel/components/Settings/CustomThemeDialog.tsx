import {
  cn,
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
} from "@app/components";
import { memo } from "react";

interface CustomThemeDialogProps {
  open: boolean;
  editingId: string | null;
  name: string;
  css: string;
  error: string | null;
  onNameChange: (name: string) => void;
  onCssChange: (css: string) => void;
  onSave: () => void;
  onClose: () => void;
}

const CustomThemeDialog = memo<CustomThemeDialogProps>(
  ({ open, editingId, name, css, error, onNameChange, onCssChange, onSave, onClose }) => (
    <Dialog open={open} onOpenChange={isOpen => !isOpen && onClose()}>
      <DialogContent className="max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editingId ? "Edit Custom Theme" : "Add Custom Theme"}</DialogTitle>
          <DialogDescription>
            Paste CSS variables from tweakcn.com or similar. Supports any color format (hsl, hex, oklch, rgb).
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label>Theme Name</Label>
            <Input value={name} onChange={e => onNameChange(e.target.value)} placeholder="My Custom Theme" />
          </div>

          <div className="flex flex-col gap-2">
            <Label>CSS Variables</Label>
            <textarea
              value={css}
              onChange={e => onCssChange(e.target.value)}
              placeholder={`:root {\n  --background: hsl(0 0% 100%);\n  --foreground: hsl(222 84% 5%);\n  /* ... */\n}\n\n.dark {\n  --background: hsl(222 84% 5%);\n  --foreground: hsl(210 40% 98%);\n  /* ... */\n}`}
              rows={12}
              className={cn(
                "flex w-full rounded-md border border-input px-3 py-2 text-sm text-foreground ring-offset-background",
                "bg-transparent",
                "placeholder:text-muted-foreground",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                "resize-y font-mono",
              )}
            />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={onSave}>{editingId ? "Update" : "Save"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  ),
);

CustomThemeDialog.displayName = "CustomThemeDialog";

export default CustomThemeDialog;
