/* eslint-disable func-style */
import { cn } from "@app/utils/cn";
import type * as React from "react";

type BadgeBaseProps = {
  isActive?: boolean;
};

type BadgeAsButton = BadgeBaseProps & {
  as: "button";
} & React.ButtonHTMLAttributes<HTMLButtonElement>;

type BadgeAsAnchor = BadgeBaseProps & {
  as: "a";
} & React.AnchorHTMLAttributes<HTMLAnchorElement>;

type BadgeAsDiv = BadgeBaseProps & {
  as?: "div";
} & React.HTMLAttributes<HTMLDivElement>;

type BadgeProps = BadgeAsButton | BadgeAsAnchor | BadgeAsDiv;

function Badge({ className, isActive = false, as: Component = "div", ...props }: BadgeProps) {
  return (
    <Component
      className={cn(
        "inline-flex items-center justify-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-all focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
        "cursor-pointer hover:scale-105 active:scale-95",
        // Active/Selected state: filled with primary color, subtle ring (persists on hover)
        isActive
          ? "hover:bg-primary/90 hover:ring-primary/30 border-transparent bg-primary text-primary-foreground shadow-sm ring-2 ring-primary"
          : // Inactive state: border and ring visible
            "ring-border/50 border-border bg-transparent text-foreground ring-1 hover:border-border hover:ring-border",
        className,
      )}
      {...(props as Record<string, unknown>)}
    />
  );
}

export { Badge };
export type { BadgeProps };
