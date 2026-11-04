import type { ButtonHTMLAttributes, ReactNode } from "react";
import { joinClasses } from "@/lib/utils/classes";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "destructive";
  children: ReactNode;
};

export function Button({ variant = "primary", className, children, ...props }: ButtonProps) {
  const variants = {
    primary: "bg-[var(--primary)] text-white hover:bg-[var(--primary-dark)]",
    secondary: "border border-[var(--border)] bg-[var(--surface)] text-[var(--secondary)] hover:bg-[var(--background)]",
    ghost: "text-[var(--secondary)] hover:bg-[var(--background)]",
    destructive: "bg-[var(--error)] text-white hover:brightness-90",
  };
  return <button className={joinClasses("inline-flex h-9 items-center justify-center gap-2 rounded-md px-3.5 text-xs font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--primary)] disabled:cursor-not-allowed disabled:opacity-60", variants[variant], className)} {...props}>{children}</button>;
}
