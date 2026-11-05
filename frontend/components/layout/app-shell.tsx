"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  Activity,
  ClipboardList,
  FolderOpen,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageSquareText,
  ShieldCheck,
  User,
  UsersRound,
  X,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { joinClasses } from "@/lib/utils/classes";
import { useAuth } from "@/lib/auth/auth-context";
import { ThemeToggle } from "@/components/theme/theme-toggle";

interface NavItem {
  label: string;
  href: string;
  icon: typeof LayoutDashboard;
  key: string;
}

const mainNavItems: NavItem[] = [
  { label: "Overview", href: "/overview", icon: LayoutDashboard, key: "overview" },
  { label: "Clients", href: "/clients", icon: UsersRound, key: "clients" },
];

const moduleNavItems: NavItem[] = [
  { label: "Requirements", href: "/overview#requirements", icon: ClipboardList, key: "requirements" },
  { label: "Communications", href: "/overview#communications", icon: MessageSquareText, key: "communications" },
  { label: "Files & References", href: "/overview#files", icon: FolderOpen, key: "files" },
  { label: "Activity Timeline", href: "/overview#activity", icon: Activity, key: "activity" },
];

const allNavItems = [...mainNavItems, ...moduleNavItems];

function sectionFromLocation(pathname: string): string {
  if (pathname.startsWith("/clients") || pathname === "/") return "clients";
  if (pathname === "/overview") {
    if (typeof window !== "undefined") {
      const hash = window.location.hash.slice(1);
      if (allNavItems.some((item) => item.key === hash)) return hash;
    }
    return "overview";
  }
  return "overview";
}

export function AppShell({
  children,
  pageTitle = "Client Hub",
  breadcrumb,
}: {
  children: ReactNode;
  pageTitle?: string;
  breadcrumb?: { label: string; href?: string }[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, loading, logout } = useAuth();

  const [activeKey, setActiveKey] = useState("overview");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);

  const mobileTriggerRef = useRef<HTMLButtonElement>(null);
  const mobileDialogRef = useRef<HTMLElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);

  // Authentication Route Protection:
  // If not loading and no authenticated user exists, redirect to login
  useEffect(() => {
    if (!loading && !user && pathname !== "/login") {
      router.push("/login");
    }
  }, [loading, user, pathname, router]);

  useEffect(() => {
    const syncActive = () => setActiveKey(sectionFromLocation(pathname));
    syncActive();
    window.addEventListener("hashchange", syncActive);
    window.addEventListener("popstate", syncActive);
    return () => {
      window.removeEventListener("hashchange", syncActive);
      window.removeEventListener("popstate", syncActive);
    };
  }, [pathname]);

  // Close user dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setUserDropdownOpen(false);
      }
    }
    if (userDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [userDropdownOpen]);

  // Mobile drawer keyboard focus management
  useEffect(() => {
    if (!mobileOpen) return;
    const dialog = mobileDialogRef.current;
    const trigger = mobileTriggerRef.current;

    dialog?.querySelector<HTMLElement>('button[aria-label="Close navigation"]')?.focus();

    const handleKeydown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMobileOpen(false);
        return;
      }
      if (event.key !== "Tab") return;

      const focusables = dialog?.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled])'
      ) ?? [];
      const elements = Array.from(focusables);
      if (!elements.length) return;

      const first = elements[0];
      const last = elements[elements.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    window.addEventListener("keydown", handleKeydown);
    document.body.style.overflow = "hidden";

    return () => {
      window.removeEventListener("keydown", handleKeydown);
      document.body.style.overflow = "";
      trigger?.focus();
    };
  }, [mobileOpen]);

  function handleNavigate(key: string) {
    setActiveKey(key);
    setMobileOpen(false);
  }

  const userInitials = user?.name
    ? user.name
        .split(" ")
        .map((p) => p[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()
    : "NT";

  const renderNavSection = (items: NavItem[], sectionTitle?: string) => (
    <div className="space-y-1">
      {sectionTitle && (
        <p className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--secondary)]">
          {sectionTitle}
        </p>
      )}
      {items.map(({ label, href, icon: Icon, key }) => {
        const isActive = activeKey === key;
        return (
          <Link
            key={key}
            href={href}
            onClick={() => handleNavigate(key)}
            aria-current={isActive ? "page" : undefined}
            className={joinClasses(
              "app-nav-link group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-xs sm:text-sm font-medium transition-all duration-160",
              "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--primary)]",
              isActive
                ? "bg-blue-600/10 text-blue-600 dark:text-blue-400 font-semibold border border-blue-500/20 shadow-xs"
                : "text-[var(--secondary)] hover:bg-[var(--surface-elevated)]/60 hover:text-[var(--foreground)]"
            )}
          >
            <span
              className={joinClasses(
                "flex h-8 w-8 items-center justify-center rounded-lg transition-colors",
                isActive
                  ? "bg-blue-600/20 text-blue-600 dark:text-blue-400"
                  : "bg-slate-200/50 dark:bg-slate-800/60 text-[var(--secondary)] group-hover:text-[var(--foreground)]"
              )}
            >
              <Icon size={16} strokeWidth={isActive ? 2.2 : 1.8} aria-hidden="true" />
            </span>
            <span className="truncate">{label}</span>
            {isActive && (
              <span
                className="ml-auto h-1.5 w-1.5 rounded-full bg-blue-600 dark:bg-blue-400 ring-2 ring-blue-300 dark:ring-blue-900"
                aria-hidden="true"
              />
            )}
          </Link>
        );
      })}
    </div>
  );

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)] flex flex-col transition-colors duration-200">
      {/* Desktop Fixed Sidebar */}
      <aside
        aria-label="Main sidebar"
        className="app-shell-glass fixed inset-y-0 left-0 z-30 hidden w-[270px] flex-col border-r border-[var(--border)] lg:flex"
      >
        {/* Brand Header */}
        <div className="flex h-[76px] items-center border-b border-[var(--border)] px-5">
          <Link href="/overview" className="flex items-center gap-2 group">
            <Image src="/agencyos-logo.svg" alt="Agency OS" width={190} height={55} className="h-auto w-[180px] object-contain transition-opacity group-hover:opacity-90 dark:hidden" priority />
            <Image src="/agencyos-logo-dark.svg" alt="Agency OS" width={190} height={55} className="hidden h-auto w-[180px] object-contain transition-opacity group-hover:opacity-90 dark:block" priority />
          </Link>
        </div>

        {/* Product context badge */}
        <div className="px-5 pt-4 pb-2">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-blue-500/10 border border-blue-500/20 text-[11px] font-semibold text-blue-600 dark:text-blue-400">
            <span className="h-1.5 w-1.5 rounded-full bg-blue-500 animate-pulse" aria-hidden="true" />
            Client Hub · Operating Suite
          </div>
        </div>

        {/* Navigation items grouped */}
        <div className="flex-1 overflow-y-auto px-3 py-3 space-y-6">
          <nav aria-label="Main navigation" className="space-y-5">
            {renderNavSection(mainNavItems, "Navigation")}
            {renderNavSection(moduleNavItems, "Hub Modules")}
          </nav>
        </div>

        {/* Actor & Workspace Footer */}
        <div className="mt-auto border-t border-[var(--border)] p-3">
          <div className="flex items-center gap-3 rounded-2xl bg-[var(--surface)]/70 border border-[var(--border)] p-3 shadow-xs">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-blue-800 text-xs font-bold text-white shadow-xs">
              {userInitials}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-semibold text-[var(--foreground)]">
                {user?.name || "Neirah Tech"}
              </p>
              <p className="truncate text-[11px] text-[var(--secondary)] flex items-center gap-1">
                <ShieldCheck size={11} className="text-[var(--success)] shrink-0" aria-hidden="true" />
                {user?.agencyName || "Agency Workspace"}
              </p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Container */}
      <div className="lg:pl-[270px] flex-1 flex flex-col">
        {/* Top Header Bar */}
        <header className="app-shell-glass sticky top-0 z-20 flex h-[68px] items-center justify-between border-b border-[var(--border)] px-4 sm:px-8">
          <div className="flex min-w-0 items-center gap-3">
            {/* Mobile Hamburger */}
            <button
              ref={mobileTriggerRef}
              type="button"
              onClick={() => setMobileOpen(true)}
              aria-label="Open navigation drawer"
              aria-expanded={mobileOpen}
              aria-controls="mobile-client-hub-navigation"
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[var(--secondary)] transition-colors hover:bg-[var(--surface-elevated)] focus-visible:outline-2 focus-visible:outline-[var(--primary)] lg:hidden cursor-pointer"
            >
              <Menu size={19} aria-hidden="true" />
            </button>

            {/* Mobile Brand */}
            <div className="flex min-w-0 items-center gap-2 lg:hidden">
              <Image
              src="/agencyos-logo.svg"
                alt="Agency OS"
                width={120}
                height={38}
                className="h-[32px] w-[100px] object-contain dark:hidden"
                priority
              />
              <Image src="/agencyos-logo-dark.svg" alt="Agency OS" width={120} height={38} className="hidden h-[32px] w-[100px] object-contain dark:block" priority />
              <span className="hidden sm:inline-block text-[var(--border)]">|</span>
              <span className="hidden sm:inline-block text-xs font-medium text-[var(--secondary)] truncate max-w-[140px]">
                {pageTitle}
              </span>
            </div>

            {/* Desktop Breadcrumb Hierarchy */}
            <nav aria-label="Breadcrumb" className="hidden lg:flex items-center gap-2 text-xs text-[var(--secondary)]">
              <Link href="/overview" className="hover:text-[var(--primary)] transition-colors font-medium">
                Client Hub
              </Link>
              <ChevronRight size={13} className="text-[var(--border)]" aria-hidden="true" />
              {breadcrumb && breadcrumb.length > 0 ? (
                breadcrumb.map((crumb, idx) => (
                  <span key={crumb.label} className="flex items-center gap-2">
                    {crumb.href ? (
                      <Link href={crumb.href} className="hover:text-[var(--primary)] transition-colors">
                        {crumb.label}
                      </Link>
                    ) : (
                      <span className="font-semibold text-[var(--foreground)]">{crumb.label}</span>
                    )}
                    {idx < breadcrumb.length - 1 && (
                      <ChevronRight size={13} className="text-[var(--border)]" aria-hidden="true" />
                    )}
                  </span>
                ))
              ) : (
                <span className="font-semibold text-[var(--foreground)]">{pageTitle}</span>
              )}
            </nav>
          </div>

          {/* Top Bar Controls: Theme Switch & User Dropdown */}
          <div className="ml-auto flex items-center gap-2.5 sm:gap-3.5">
            {/* Light / Dark Mode Toggle */}
            <ThemeToggle />

            {/* User Profile & Logout Menu */}
            <div className="relative" ref={userMenuRef}>
              <button
                type="button"
                onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                aria-expanded={userDropdownOpen}
                aria-haspopup="true"
                className="flex items-center gap-2.5 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-1.5 sm:px-3 sm:py-1.5 hover:bg-[var(--surface-elevated)] transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-[var(--primary)]"
              >
                <div
                  className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-blue-800 text-xs font-bold text-white shadow-xs"
                  aria-hidden="true"
                >
                  {userInitials}
                </div>
                <div className="hidden sm:flex flex-col text-left">
                  <span className="text-xs font-semibold text-[var(--foreground)] leading-tight truncate max-w-[130px]">
                    {user?.name || "Administrator"}
                  </span>
                  <span className="text-[10px] text-[var(--secondary)] leading-tight truncate max-w-[130px]">
                    {user?.email || ""}
                  </span>
                </div>
                <ChevronDown size={14} className="text-slate-400 hidden sm:block" />
              </button>

              {/* User Menu Dropdown */}
              {userDropdownOpen && (
                <div
                  role="menu"
                  className="glass-modal absolute right-0 mt-2 w-60 rounded-2xl border border-[var(--border)] p-2 shadow-xl animate-fade-in z-50 text-xs"
                >
                  <div className="p-2.5 border-b border-[var(--border)]">
                    <p className="font-bold text-sm text-[var(--foreground)] truncate">
                      {user?.name || "Authenticated User"}
                    </p>
                    <p className="text-[11px] text-[var(--secondary)] truncate mt-0.5">
                      {user?.email}
                    </p>
                    <p className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 mt-1">
                      {user?.agencyName || "Neirah Tech Workspace"}
                    </p>
                  </div>

                  <div className="pt-1.5">
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        setUserDropdownOpen(false);
                        void logout();
                      }}
                      className="w-full flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold text-[var(--error)] hover:bg-red-500/10 transition-colors cursor-pointer"
                    >
                      <LogOut size={14} />
                      <span>Sign Out</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="mx-auto w-full max-w-[1560px] flex-1 px-4 py-6 sm:px-8 sm:py-8 animate-fade-in">
          {children}
        </main>
      </div>

      {/* Mobile Navigation Drawer */}
      {mobileOpen && (
        <div className="mobile-nav-backdrop fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-slate-950/50 backdrop-blur-xs transition-opacity"
            onClick={() => setMobileOpen(false)}
            aria-hidden="true"
          />
          <aside
            ref={mobileDialogRef}
            id="mobile-client-hub-navigation"
            role="dialog"
            aria-modal="true"
            aria-label="Client Hub navigation"
            className="mobile-nav-drawer relative flex h-full w-[min(88vw,330px)] flex-col border-r border-[var(--border)] bg-[var(--surface)] p-5 shadow-2xl"
          >
            {/* Drawer Top */}
            <div className="flex h-12 items-center justify-between border-b border-[var(--border)] pb-3">
              <Image
                src="/agencyos-logo.svg"
                alt="Agency OS"
                width={140}
                height={45}
                className="h-[36px] w-[116px] object-contain dark:hidden"
              />
              <Image src="/agencyos-logo-dark.svg" alt="Agency OS" width={140} height={45} className="hidden h-[36px] w-[116px] object-contain dark:block" />
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                aria-label="Close navigation"
                className="flex h-9 w-9 items-center justify-center rounded-xl border border-[var(--border)] text-[var(--secondary)] hover:bg-[var(--surface-elevated)] focus-visible:outline-2 focus-visible:outline-[var(--primary)] cursor-pointer"
              >
                <X size={18} aria-hidden="true" />
              </button>
            </div>

            {/* Mobile Nav Links */}
            <div className="flex-1 overflow-y-auto py-5 space-y-6">
              <nav aria-label="Mobile navigation" className="space-y-5">
                {renderNavSection(mainNavItems, "Navigation")}
                {renderNavSection(moduleNavItems, "Hub Modules")}
              </nav>
            </div>

            {/* Drawer Footer with User & Logout */}
            <div className="mt-auto border-t border-[var(--border)] pt-4 space-y-3">
              <div className="flex items-center justify-between rounded-xl bg-[var(--surface-elevated)] p-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-700 text-xs font-bold text-white">
                    {userInitials}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-[var(--foreground)] truncate">
                      {user?.name || "Neirah Tech"}
                    </p>
                    <p className="text-[10px] text-[var(--secondary)] truncate">
                      {user?.email}
                    </p>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setMobileOpen(false);
                  void logout();
                }}
                className="w-full flex items-center justify-center gap-2 rounded-xl border border-red-200/40 bg-red-500/10 p-2.5 text-xs font-semibold text-[var(--error)] hover:bg-red-500/20 transition-colors"
              >
                <LogOut size={14} />
                <span>Sign Out</span>
              </button>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}

export default AppShell;
