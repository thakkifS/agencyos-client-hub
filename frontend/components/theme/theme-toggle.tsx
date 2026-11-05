"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "./theme-context";

export function ThemeToggle({ className = "" }: { className?: string }) {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} appearance`}
      className={`group relative inline-flex h-9 w-9 items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[var(--secondary)] hover:text-[var(--foreground)] hover:border-blue-500/50 transition-all cursor-pointer focus-visible:outline-2 focus-visible:outline-[var(--primary)] shadow-xs ${className}`}
    >
      {theme === "dark" ? (
        <Sun size={17} className="text-amber-400 transition-transform group-hover:rotate-45" aria-hidden="true" />
      ) : (
        <Moon size={17} className="text-blue-600 transition-transform group-hover:-rotate-12" aria-hidden="true" />
      )}
    </button>
  );
}

export default ThemeToggle;

