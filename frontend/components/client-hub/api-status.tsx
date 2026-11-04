"use client";

import { useEffect, useState } from "react";
import { getHealth } from "@/lib/api/client";

type State = "checking" | "connected" | "unavailable";

export function ApiStatus() {
  const [state, setState] = useState<State>("checking");
  useEffect(() => {
    let active = true;
    getHealth().then(() => { if (active) setState("connected"); }).catch(() => { if (active) setState("unavailable"); });
    return () => { active = false; };
  }, []);

  const labels: Record<State, string> = { checking: "Checking API", connected: "API connected", unavailable: "API unavailable" };
  const styles: Record<State, string> = { checking: "bg-amber-50 text-amber-700", connected: "bg-green-50 text-green-700", unavailable: "bg-slate-100 text-[var(--secondary)]" };
  return <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${styles[state]}`}><span className={`h-1.5 w-1.5 rounded-full ${state === "connected" ? "bg-green-600" : state === "unavailable" ? "bg-slate-400" : "bg-amber-500"}`} />{labels[state]}</span>;
}
