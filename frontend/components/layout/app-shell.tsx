import Image from "next/image";
import Link from "next/link";
import { Bell, ChevronDown, CircleHelp, Command, LayoutDashboard, MessageSquareText, Search, Settings2, UsersRound } from "lucide-react";

const navigation = [
  { label: "Overview", href: "/", icon: LayoutDashboard },
  { label: "Client Hub", href: "/clients", icon: UsersRound, active: true },
  { label: "Communications", href: "/clients", icon: MessageSquareText },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[252px] flex-col border-r border-[var(--border)] bg-white lg:flex">
        <div className="flex h-[72px] items-center border-b border-[var(--border)] px-5">
          <Image src="/agencyos-mark.jpeg" alt="Agency OS — Agency Operating System" width={200} height={65} className="h-auto w-[190px] object-contain" priority />
        </div>
        <div className="px-3 pt-6">
          <p className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">Workspace</p>
          <nav aria-label="Main navigation" className="space-y-1">
            {navigation.map(({ label, href, icon: Icon, active }) => <Link key={label} href={href} aria-current={active ? "page" : undefined} className={`flex items-center gap-3 rounded-md px-3 py-2.5 text-[13px] font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 ${active ? "bg-blue-50 text-blue-700" : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"}`}><Icon size={17} strokeWidth={1.8} aria-hidden="true" />{label}</Link>)}
          </nav>
        </div>
        <div className="mt-auto space-y-1 border-t border-[var(--border)] p-3">
          <Link href="#help" className="flex items-center gap-3 rounded-md px-3 py-2.5 text-[13px] text-slate-600 hover:bg-slate-50"><CircleHelp size={17} />Help center</Link>
          <Link href="#settings" className="flex items-center gap-3 rounded-md px-3 py-2.5 text-[13px] text-slate-600 hover:bg-slate-50"><Settings2 size={17} />Settings</Link>
          <div className="mt-2 flex items-center gap-3 rounded-lg bg-slate-50 p-3"><div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-xs font-semibold text-blue-700">NT</div><div className="min-w-0 flex-1"><p className="truncate text-xs font-semibold">Neirah Tech</p><p className="text-[11px] text-slate-500">Agency workspace</p></div><ChevronDown size={15} className="text-slate-400" /></div>
        </div>
      </aside>
      <div className="lg:pl-[252px]">
        <header className="sticky top-0 z-20 flex h-[64px] items-center justify-between border-b border-[var(--border)] bg-white/95 px-4 backdrop-blur sm:px-7">
          <div className="flex items-center lg:hidden"><Image src="/agencyos-mark.jpeg" alt="Agency OS" width={132} height={43} className="h-[38px] w-[118px] object-contain" priority /></div>
          <div className="hidden items-center gap-2 text-xs text-slate-500 sm:flex"><span>Workspace</span><span className="text-slate-300">/</span><span className="font-medium text-slate-800">Client Hub</span></div>
          <div className="ml-auto flex items-center gap-2 sm:gap-4">
            <button aria-label="Search" className="hidden h-9 items-center gap-8 rounded-md border border-[var(--border)] px-3 text-xs text-slate-500 hover:border-slate-300 md:flex"><span className="flex items-center gap-2"><Search size={14}/>Search</span><span className="flex items-center gap-1 rounded border border-slate-200 px-1 py-0.5 text-[10px]"><Command size={10}/>K</span></button>
            <button aria-label="Notifications" className="relative rounded-md p-2 text-slate-500 hover:bg-slate-100"><Bell size={17}/><span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-blue-600"/></button>
            <div className="hidden h-7 border-l border-slate-200 sm:block"/><button className="flex items-center gap-2 rounded-md p-1.5 hover:bg-slate-50"><span className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-200 text-xs font-semibold text-slate-700">DU</span><span className="hidden text-left sm:block"><span className="block text-xs font-semibold">Demo user</span><span className="block text-[10px] text-slate-500">Authentication pending</span></span><ChevronDown size={14} className="hidden text-slate-400 sm:block"/></button>
          </div>
        </header>
        <nav aria-label="Mobile navigation" className="flex gap-1 overflow-x-auto border-b border-[var(--border)] bg-white px-3 py-2 lg:hidden">
          {navigation.map(({ label, href, icon: Icon, active }) => <Link key={label} href={href} aria-current={active ? "page" : undefined} className={`inline-flex shrink-0 items-center gap-2 rounded-md px-3 py-2 text-xs font-medium ${active ? "bg-blue-50 text-blue-700" : "text-slate-600 hover:bg-slate-50"}`}><Icon size={15}/>{label}</Link>)}
        </nav>
        <main className="mx-auto w-full max-w-[1440px] px-4 py-7 sm:px-7 sm:py-9">{children}</main>
      </div>
    </div>
  );
}
