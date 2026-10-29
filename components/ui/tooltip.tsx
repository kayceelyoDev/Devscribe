"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export function TooltipProvider({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

export function Tooltip({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = React.useState(false);
  return (
    <div
      className="relative inline-block"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      {React.Children.map(children, (child) => {
        if (React.isValidElement(child) && (child.type as any).displayName === "TooltipContent") {
          return open ? child : null;
        }
        return child;
      })}
    </div>
  );
}

export function TooltipTrigger({
  children,
  asChild,
  className,
}: {
  children: React.ReactNode;
  asChild?: boolean;
  className?: string;
}) {
  return <span className={cn("inline-flex", className)}>{children}</span>;
}

export function TooltipContent({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "absolute bottom-full left-1/2 z-50 mb-2 -translate-x-1/2 whitespace-nowrap rounded-md bg-zinc-800 px-2.5 py-1 text-xs text-zinc-100 shadow-md ring-1 ring-zinc-700 animate-in fade-in-0",
        className
      )}
    >
      {children}
    </div>
  );
}
TooltipContent.displayName = "TooltipContent";
