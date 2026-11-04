"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Activity, ClipboardList, FolderOpen, LayoutDashboard, Menu, MessageSquareText, UsersRound, X } from "lucide-react";

const navigation = [
  { label: "Overview", href: "/overview", icon: LayoutDashboard, key: "overview" },
  { label: "Clients", href: "/clients", icon: UsersRound, key: "clients" },
  { label: "Requirements", href: "/overview#requirements", icon: ClipboardList, key: "requirements" },
  { label: "Communications", href: "/overview#communications", icon: MessageSquareText, key: "communications" },
  { label: "Files & References", href: "/overview#files", icon: FolderOpen, key: "files" },
  { label: "Activity Timeline", href: "/overview#activity", icon: Activity, key: "activity" },
];

function sectionFromLocation(pathname: string) {
  if (pathname.startsWith("/clients") || pathname === "/") return "clients";
  if (pathname === "/overview") {
    const hash = window.location.hash.slice(1);
    return navigation.some((item) => item.key === hash) ? hash : "overview";
  }
  return "overview";
}

export function AppShell({ children, pageTitle = "Client Hub" }: { children: React.ReactNode; pageTitle?: string }) {
  const pathname = usePathname();
  const [activeKey, setActiveKey] = useState("overview");
  const [mobileOpen, setMobileOpen] = useState(false);
  const mobileTriggerRef = useRef<HTMLButtonElement>(null);
  const mobileDialogRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const syncActive = () => setActiveKey(sectionFromLocation(pathname));
    syncActive();
    window.addEventListener("hashchange", syncActive);
    window.addEventListener("popstate", syncActive);
    return () => { window.removeEventListener("hashchange", syncActive); window.removeEventListener("popstate", syncActive); };
  }, [pathname]);

  useEffect(() => {
    if (!mobileOpen) return;
    const dialog = mobileDialogRef.current;
    const trigger = mobileTriggerRef.current;
    const focusable = () => dialog?.querySelectorAll<HTMLElement>('a[href], button:not([disabled])') ?? [];
    dialog?.querySelector<HTMLElement>('button[aria-label="Close navigation"]')?.focus();
    const handleKeydown = (event: KeyboardEvent) => {
      if (event.key === "Escape") { setMobileOpen(false); return; }
      if (event.key !== "Tab") return;
      const elements = Array.from(focusable());
      if (!elements.length) return;
      const first = elements[0], last = elements[elements.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    window.addEventListener("keydown", handleKeydown);
    return () => {
      window.removeEventListener("keydown", handleKeydown);
      trigger?.focus();
    };
  }, [mobileOpen]);

  function handleNavigate(key: string) {
    setActiveKey(key);
    setMobileOpen(false);
  }

  const links = (mobile = false) => <nav aria-label={mobile ? "Mobile main navigation" : "Main navigation"} className="space-y-1">
    {navigation.map(({ label, href, icon: Icon, key }) => <Link key={key} href={href} onClick={() => handleNavigate(key)} aria-current={activeKey === key ? "page" : undefined} className={`app-nav-link flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--primary)] ${activeKey === key ? "bg-blue-50 text-blue-700" : "text-[var(--secondary)] hover:bg-slate-50 hover:text-[var(--foreground)]"}`}><Icon size={17} strokeWidth={1.8} aria-hidden="true"/><span>{label}</span>{activeKey === key && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-blue-600" aria-hidden="true"/>}</Link>)}
  </nav>;

  return <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
    <aside className="app-shell-glass fixed inset-y-0 left-0 z-30 hidden w-[264px] flex-col border-r border-[var(--border)] lg:flex">
      <div className="flex h-[76px] items-center border-b border-[var(--border)] px-5"><Image src="/agencyos-mark.jpeg" alt="Agency OS — Agency Operating System" width={200} height={65} className="h-auto w-[190px] object-contain" priority/></div>
      <div className="px-3 pt-7"><p className="px-3 pb-3 text-xs font-semibold uppercase tracking-[0.15em] text-[var(--secondary)]">Client Hub</p>{links()}</div>
      <div className="mt-auto border-t border-[var(--border)] p-3"><div className="flex items-center gap-3 rounded-xl bg-[var(--background)] p-3"><div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-100 text-xs font-semibold text-blue-700">NT</div><div className="min-w-0"><p className="truncate text-sm font-semibold">Neirah Tech</p><p className="text-xs text-[var(--secondary)]">Development workspace</p></div></div></div>
    </aside>

    <div className="lg:pl-[264px]">
      <header className="app-shell-glass sticky top-0 z-20 flex h-[68px] items-center justify-between border-b border-[var(--border)] px-4 sm:px-7">
        <div className="flex min-w-0 items-center gap-3">
          <button ref={mobileTriggerRef} type="button" onClick={() => setMobileOpen(true)} aria-label="Open Client Hub navigation" aria-expanded={mobileOpen} aria-controls="mobile-client-hub-navigation" className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--border)] bg-white text-[var(--secondary)] transition-colors hover:bg-[var(--background)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--primary)] lg:hidden"><Menu size={19} aria-hidden="true"/></button>
          <div className="flex min-w-0 items-center gap-3 lg:hidden"><Image src="/agencyos-mark.jpeg" alt="Agency OS" width={132} height={43} className="h-[36px] w-[110px] object-contain" priority/><span className="hidden border-l border-[var(--border)] pl-3 text-sm font-medium sm:inline">{pageTitle}</span></div>
          <div className="hidden items-center gap-2 text-sm text-[var(--secondary)] lg:flex"><span>Client Hub</span><span className="text-[var(--border)]">/</span><span className="font-medium text-[var(--foreground)]">{pageTitle}</span></div>
        </div>
        <div className="ml-auto flex items-center gap-3"><span aria-hidden="true" className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-xs font-semibold text-blue-700">NT</span><span className="hidden text-left sm:block"><span className="block text-sm font-semibold">Neirah Tech</span><span className="block text-xs text-[var(--secondary)]">Development workspace</span></span></div>
      </header>
      <main className="mx-auto w-full max-w-[1500px] px-4 py-6 sm:px-7 sm:py-8">{children}</main>
    </div>

    {mobileOpen && <div className="mobile-nav-backdrop fixed inset-0 z-50 lg:hidden"><button type="button" aria-label="Close navigation" onClick={() => setMobileOpen(false)} className="absolute inset-0 h-full w-full bg-slate-950/40"/><aside ref={mobileDialogRef} id="mobile-client-hub-navigation" role="dialog" aria-modal="true" aria-label="Client Hub navigation" className="mobile-nav-drawer relative flex h-full w-[min(86vw,340px)] flex-col border-r border-[var(--border)] bg-white p-4 shadow-2xl"><div className="flex h-12 items-center justify-between"><Image src="/agencyos-mark.jpeg" alt="Agency OS" width={132} height={43} className="h-[36px] w-[110px] object-contain"/><button type="button" onClick={() => setMobileOpen(false)} aria-label="Close navigation" className="flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--border)] text-[var(--secondary)] hover:bg-[var(--background)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--primary)]"><X size={18} aria-hidden="true"/></button></div><p className="px-3 pb-3 pt-7 text-xs font-semibold uppercase tracking-[0.15em] text-[var(--secondary)]">Client Hub</p>{links(true)}<div className="mt-auto rounded-xl bg-[var(--background)] p-3 text-sm font-medium">Neirah Tech<span className="mt-1 block text-xs font-normal text-[var(--secondary)]">Development workspace</span></div></aside></div>}
  </div>;
}
