"use client";

import { useEffect, useState } from "react";
import { getHealth } from "@/lib/api/client";

type State = "checking" | "connected" | "unavailable";

export function ApiStatus() {
  const [state, setState] = useState<State>("checking");

  useEffect(() => {
    let active = true;
    getHealth()
      .then(() => {
        if (active) setState("connected");
      })
      .catch(() => {
        if (active) setState("unavailable");
      });
    return () => {
      active = false;
    };
  }, []);

  const labels: Record<State, string> = {
    checking: "Checking API",
    connected: "API Online",
    unavailable: "API Offline",
  };

  const styles: Record<State, string> = {
    checking: "bg-[var(--warning)]/10 text-[var(--warning)] border-[var(--warning)]/25",
    connected: "bg-[var(--success)]/10 text-[var(--success)] border-[var(--success)]/25",
    unavailable: "bg-[var(--surface-elevated)] text-[var(--secondary)] border-[var(--border)]",
  };

  const dotColors: Record<State, string> = {
    checking: "bg-[var(--warning)] animate-pulse",
    connected: "bg-[var(--success)]",
    unavailable: "bg-[var(--secondary)]",
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold border tracking-wide select-none ${styles[state]}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${dotColors[state]}`} aria-hidden="true" />
      {labels[state]}
    </span>
  );
}

export default ApiStatus;
