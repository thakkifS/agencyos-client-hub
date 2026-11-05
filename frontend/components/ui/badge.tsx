import type { HTMLAttributes, ReactNode } from "react";
import { joinClasses } from "@/lib/utils/classes";

export type BadgeVariant =
  | "primary"
  | "success"
  | "warning"
  | "error"
  | "neutral"
  | "outline";

type BadgeProps = HTMLAttributes<HTMLSpanElement> & {
  variant?: BadgeVariant;
  children: ReactNode;
  dot?: boolean;
};

export function Badge({
  variant = "neutral",
  dot = false,
  className,
  children,
  ...props
}: BadgeProps) {
  const variants: Record<BadgeVariant, string> = {
    primary: "bg-[var(--primary)]/10 text-[var(--primary)] border-[var(--primary)]/25",
    success: "bg-[var(--success)]/10 text-[var(--success)] border-[var(--success)]/25",
    warning: "bg-[var(--warning)]/10 text-[var(--warning)] border-[var(--warning)]/25",
    error: "bg-[var(--error)]/10 text-[var(--error)] border-[var(--error)]/25",
    neutral: "bg-[var(--surface-elevated)] text-[var(--secondary)] border-[var(--border)]",
    outline: "bg-transparent text-[var(--secondary)] border-[var(--border)]",
  };

  const dotColors: Record<BadgeVariant, string> = {
    primary: "bg-[var(--primary)]",
    success: "bg-[var(--success)]",
    warning: "bg-[var(--warning)]",
    error: "bg-[var(--error)]",
    neutral: "bg-[var(--secondary)]",
    outline: "bg-[var(--secondary)]",
  };

  return (
    <span
      className={joinClasses(
        "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border tracking-wide select-none backdrop-blur-xs",
        variants[variant],
        className
      )}
      {...props}
    >
      {dot && (
        <span
          className={joinClasses("h-1.5 w-1.5 rounded-full shrink-0", dotColors[variant])}
          aria-hidden="true"
        />
      )}
      {children}
    </span>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const normalized = status.toUpperCase();
  switch (normalized) {
    case "CONFIRMED":
    case "ACCEPTED":
      return <Badge variant="success" dot>{normalized.replace("_", " ")}</Badge>;
    case "UNDER_REVIEW":
    case "CHANGES_REQUESTED":
    case "CLARIFICATION":
      return <Badge variant="warning" dot>{normalized.replace("_", " ")}</Badge>;
    case "ACTIVE":
      return <Badge variant="primary" dot>Active</Badge>;
    case "DRAFT":
    case "PENDING":
      return <Badge variant="neutral" dot>{normalized.replace("_", " ")}</Badge>;
    case "ARCHIVED":
    case "INACTIVE":
      return <Badge variant="outline">{normalized.replace("_", " ")}</Badge>;
    default:
      return <Badge variant="neutral">{status.replaceAll("_", " ")}</Badge>;
  }
}

export default Badge;
