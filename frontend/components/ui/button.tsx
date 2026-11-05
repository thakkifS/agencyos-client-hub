import type { ButtonHTMLAttributes, ReactNode } from "react";
import { joinClasses } from "@/lib/utils/classes";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "destructive" | "outline";
export type ButtonSize = "sm" | "md" | "lg";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  children: ReactNode;
};

export function Button({
  variant = "primary",
  size = "md",
  className,
  children,
  ...props
}: ButtonProps) {
  const variants: Record<ButtonVariant, string> = {
    primary:
      "bg-[var(--primary)] text-white hover:bg-[var(--primary-dark)] shadow-sm shadow-blue-500/25 active:scale-[0.98]",
    secondary:
      "border border-[var(--border)] bg-[var(--surface)] text-[var(--secondary)] hover:bg-[var(--surface-elevated)] hover:text-[var(--foreground)] active:scale-[0.98] shadow-xs",
    ghost:
      "text-[var(--secondary)] hover:bg-[var(--surface-elevated)]/70 hover:text-[var(--foreground)] active:scale-[0.98]",
    destructive:
      "bg-[var(--error)] text-white hover:brightness-90 shadow-sm shadow-red-500/20 active:scale-[0.98]",
    outline:
      "border border-[var(--primary)] text-[var(--primary)] hover:bg-blue-500/10 active:scale-[0.98]",
  };

  const sizes: Record<ButtonSize, string> = {
    sm: "h-8 px-2.5 text-xs rounded-lg gap-1.5",
    md: "h-9 px-3.5 text-xs rounded-xl gap-2",
    lg: "h-10 px-4 text-sm rounded-xl gap-2.5",
  };

  return (
    <button
      className={joinClasses(
        "inline-flex items-center justify-center font-medium transition-all duration-150 cursor-pointer select-none",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--primary)]",
        "disabled:cursor-not-allowed disabled:opacity-50 disabled:pointer-events-none",
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}

export default Button;
