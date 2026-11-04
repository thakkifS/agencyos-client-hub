"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowRight, Check, ClipboardCheck, LoaderCircle, MessageSquareText, ShieldCheck, UsersRound } from "lucide-react";
import { Button } from "@/components/ui/button";

const capabilities = [
  { icon: UsersRound, label: "A shared workspace for every client" },
  { icon: ClipboardCheck, label: "Structured requirements with approval history" },
  { icon: MessageSquareText, label: "Communications and activity in context" },
];

export default function LoginPage() {
  const router = useRouter();
  const [opening, setOpening] = useState(false);
  const isProduction = process.env.NODE_ENV === "production";

  function continueToDemo() {
    if (isProduction || opening) return;
    setOpening(true);
    router.push("/overview");
  }

  return <main className="login-backdrop relative min-h-screen overflow-hidden px-4 py-6 sm:px-8 sm:py-10">
    <div className="relative mx-auto grid min-h-[calc(100vh-3rem)] w-full max-w-6xl items-center gap-8 lg:grid-cols-[1.1fr_.9fr] lg:gap-16">
      <section className="mx-auto w-full max-w-xl py-4 lg:py-10">
        <Image src="/agencyos-mark.jpeg" alt="Agency OS — Agency Operating System" width={480} height={156} priority className="mb-9 h-auto w-60 sm:w-72" />
        <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-blue-700">Client operations, connected</p>
        <h1 className="max-w-lg text-4xl font-semibold leading-tight tracking-tight text-[var(--foreground)] sm:text-5xl">Keep every client conversation moving forward.</h1>
        <p className="mt-5 max-w-lg text-base leading-7 text-[var(--secondary)]">Agency OS brings client context, requirements and approvals into one clear operating workspace.</p>
        <ul className="mt-8 space-y-4">{capabilities.map(({ icon: Icon, label }) => <li key={label} className="flex items-center gap-3 text-sm font-medium text-[var(--foreground)]"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-blue-100 bg-white/75 text-blue-700 shadow-sm"><Icon size={17} aria-hidden="true"/></span>{label}</li>)}</ul>
        <p className="mt-10 text-xs text-[var(--secondary)]">Neirah Tech · Agency Operating System</p>
      </section>

      <section className="login-card-enter glass-panel mx-auto w-full max-w-md rounded-3xl p-5 sm:p-8 lg:p-9" aria-labelledby="login-heading">
        <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-700"><ShieldCheck size={23} aria-hidden="true"/></div>
        <p className="text-xs font-semibold uppercase tracking-[0.13em] text-blue-700">Workspace access</p>
        <h2 id="login-heading" className="mt-2 text-2xl font-semibold tracking-tight">Welcome to Agency OS</h2>
        <p className="mt-2 text-sm leading-6 text-[var(--secondary)]">The shared Agency OS identity provider is not connected to this standalone project.</p>

        {isProduction ? <div role="status" className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900"><strong>Sign-in unavailable.</strong> Connect the approved identity provider before enabling production access.</div> : <>
          <div className="mt-6 rounded-xl border border-blue-100 bg-white/70 p-4">
            <p className="flex items-center gap-2 text-sm font-semibold text-[var(--foreground)]"><Check size={16} className="text-green-700" aria-hidden="true"/>Development preview only</p>
            <p className="mt-2 text-sm leading-6 text-[var(--secondary)]">This preview does not authenticate a person or protect frontend routes. Client Hub API access still depends on the server-configured local development actor. No email or password is collected here.</p>
          </div>
          <Button onClick={continueToDemo} disabled={opening} className="mt-6 h-11 w-full justify-center rounded-xl text-sm">{opening ? <><LoaderCircle size={17} className="animate-spin" aria-hidden="true"/>Opening preview…</> : <>Continue to development preview <ArrowRight size={17} aria-hidden="true"/></>}</Button>
          <p className="mt-4 text-center text-xs leading-5 text-[var(--secondary)]">For local use only. This is not production sign-in.</p>
        </>}
      </section>
    </div>
  </main>;
}
