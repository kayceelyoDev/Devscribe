import * as React from "react";
import { cn } from "@/lib/utils";

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "default" | "secondary" | "outline" | "ghost";
  size?: "default" | "sm" | "lg";
};

export function Button({ className, variant = "default", size = "default", ...props }: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center rounded-md font-medium transition focus:outline-none disabled:cursor-not-allowed disabled:opacity-50",
        variant === "default" && "bg-violet-500 text-white hover:bg-violet-400",
        variant === "secondary" && "bg-zinc-800 text-zinc-100 hover:bg-zinc-700",
        variant === "outline" && "border border-zinc-700 bg-transparent text-zinc-100 hover:bg-zinc-900",
        variant === "ghost" && "bg-transparent text-zinc-200 hover:bg-zinc-800",
        size === "sm" && "h-8 px-3 text-xs",
        size === "lg" && "h-11 px-5 text-sm",
        size === "default" && "h-10 px-4 text-sm",
        className,
      )}
      {...props}
    />
  );
}
