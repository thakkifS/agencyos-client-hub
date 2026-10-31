import type { ButtonHTMLAttributes, ReactNode } from "react";
import { joinClasses } from "@/lib/utils/classes";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary";
  children: ReactNode;
};

export function Button({ variant = "primary", className, children, ...props }: ButtonProps) {
  return <button className={joinClasses("inline-flex h-9 items-center justify-center gap-2 rounded-md px-3.5 text-xs font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600", variant === "primary" ? "bg-blue-600 text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60" : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60", className)} {...props}>{children}</button>;
}
