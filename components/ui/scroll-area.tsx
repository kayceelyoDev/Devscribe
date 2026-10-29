import * as React from "react";
import { cn } from "@/lib/utils";

export function ScrollArea({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("relative overflow-auto scrollbar-thin scrollbar-thumb-zinc-700", className)}
      {...props}
    >
      {children}
    </div>
  );
}
