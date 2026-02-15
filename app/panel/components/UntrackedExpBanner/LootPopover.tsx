import { Button, Input, Popover, PopoverContent, PopoverTrigger, Select } from "@app/components";
import { memo, useCallback, useState } from "react";

interface LootPopoverProps {
  knownItems: string[];
  loot: Array<{ name: string; quantity: number }>;
  onAdd: (name: string, quantity: number) => void;
  onRemove: (name: string) => void;
}

const LootPopover = memo(({ knownItems, loot, onAdd, onRemove }: LootPopoverProps) => {
  const [selectedItem, setSelectedItem] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [open, setOpen] = useState(false);

  const handleAdd = useCallback(() => {
    if (!selectedItem || quantity <= 0) return;
    onAdd(selectedItem, quantity);
    setSelectedItem("");
    setQuantity(1);
  }, [selectedItem, quantity, onAdd]);

  return (
    <div className="flex items-center gap-1">
      {/* Show existing loot as removable pills */}
      {loot.map(item => (
        <span
          key={item.name}
          className="bg-accent/20 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium text-accent-foreground">
          {item.quantity}x {item.name}
          <button
            type="button"
            onClick={() => onRemove(item.name)}
            className="ml-0.5 text-muted-foreground hover:text-destructive">
            ×
          </button>
        </span>
      ))}

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="sm" className="h-6 px-1.5 text-xs text-muted-foreground">
            +Loot
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-56 p-3" align="end">
          <div className="flex flex-col gap-2">
            <p className="text-xs font-semibold">Add Loot</p>
            <Select value={selectedItem} onChange={e => setSelectedItem(e.target.value)} className="h-8 text-xs">
              <option value="">Select item...</option>
              {knownItems.map(item => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </Select>
            <Input
              type="number"
              min={1}
              value={quantity}
              onChange={e => setQuantity(parseInt(e.target.value) || 1)}
              className="h-8 text-xs"
              placeholder="Qty"
            />
            <Button size="sm" className="h-7 text-xs" onClick={handleAdd} disabled={!selectedItem}>
              Add
            </Button>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
});

LootPopover.displayName = "LootPopover";

export { LootPopover };
