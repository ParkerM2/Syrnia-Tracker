import { cn } from "@app/utils/cn";
import { memo, useState } from "react";

interface ItemImageProps {
  src: string;
  name: string;
  quantity?: number;
  prefix?: string;
  className?: string;
}

/**
 * Reusable item image with optional quantity badge (top-left).
 * Renders a fallback with the item name when the image fails to load.
 */
const ItemImage = memo(({ src, name, quantity, prefix, className }: ItemImageProps) => {
  const [error, setError] = useState(false);

  return (
    <div className={cn("relative flex items-center justify-center", className)}>
      {!error ? (
        <img src={src} alt={name} className="h-full w-full object-contain" onError={() => setError(true)} />
      ) : (
        <div className="flex h-full w-full items-center justify-center rounded bg-muted">
          <span className="truncate px-0.5 text-[8px] font-medium text-muted-foreground">{name}</span>
        </div>
      )}
      {quantity != null && !error && (
        <span className="absolute left-0.5 top-0 text-[9px] font-bold text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
          {prefix}
          {quantity.toLocaleString()}
        </span>
      )}
    </div>
  );
});

ItemImage.displayName = "ItemImage";

export { ItemImage };
