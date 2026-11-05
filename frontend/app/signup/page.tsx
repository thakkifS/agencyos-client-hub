"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { ArrowRight, Building2, Lock, Mail, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { useAuth } from "@/lib/auth/auth-context";

export default function SignupPage() {
  const { signup } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [agencyName, setAgencyName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await signup({ name: name.trim(), email: email.trim(), agencyName: agencyName.trim(), password });
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not create the agency workspace.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="login-backdrop flex min-h-screen flex-col justify-between p-5 sm:p-8 lg:p-12">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between">
        <div className="flex items-center gap-3">
          <Image src="/agencyos-logo.svg" alt="Agency OS" width={180} height={52} className="h-auto w-36 object-contain dark:hidden sm:w-44" priority />
          <Image src="/agencyos-logo-dark.svg" alt="Agency OS" width={180} height={52} className="hidden h-auto w-36 object-contain dark:block sm:w-44" priority />
        </div>
        <ThemeToggle />
      </header>

      <section className="mx-auto my-12 w-full max-w-xl">
        <div className="glass-modal rounded-3xl p-6 shadow-xl sm:p-9">
          <div className="mb-7">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--primary)]">Workspace onboarding</p>
            <h1 className="mt-2 text-2xl font-bold tracking-tight text-[var(--foreground)] sm:text-3xl">Create your agency workspace</h1>
            <p className="mt-2 text-sm leading-6 text-[var(--secondary)]">Your account will be the agency owner. Invite and manage teammates after setup.</p>
          </div>

          {error && <p role="alert" className="mb-5 rounded-xl border border-[var(--error)]/25 bg-[var(--error)]/10 p-3 text-sm text-[var(--error)]">{error}</p>}

          <form onSubmit={submit} className="space-y-4">
            <Field id="agency-name" label="Agency name" icon={<Building2 size={16} />} value={agencyName} onChange={setAgencyName} placeholder="Your agency" minLength={2} maxLength={150} />
            <Field id="owner-name" label="Your name" icon={<UserRound size={16} />} value={name} onChange={setName} placeholder="Full name" maxLength={100} />
            <Field id="work-email" label="Work email" icon={<Mail size={16} />} value={email} onChange={setEmail} placeholder="you@agency.com" type="email" autoComplete="email" />
            <Field id="account-password" label="Password" icon={<Lock size={16} />} value={password} onChange={setPassword} placeholder="At least 12 characters" type="password" autoComplete="new-password" minLength={12} maxLength={100} />
            <p className="text-xs text-[var(--secondary)]">Use 12 or more characters. Your password is hashed before storage.</p>
            <Button type="submit" disabled={submitting} className="mt-2 h-11 w-full text-sm font-semibold">{submitting ? "Creating workspace…" : "Create workspace"}<ArrowRight size={16} /></Button>
          </form>
          <p className="mt-6 text-center text-sm text-[var(--secondary)]">Already have an account? <Link href="/login" className="font-semibold text-[var(--primary)] hover:underline">Sign in</Link></p>
        </div>
      </section>

      <footer className="pb-2 text-center text-xs text-[var(--secondary)]">Agency OS · Client operating workspace</footer>
    </main>
  );
}

function Field({ id, label, icon, value, onChange, placeholder, type = "text", autoComplete, minLength, maxLength }: {
  id: string; label: string; icon: React.ReactNode; value: string; onChange: (value: string) => void;
  placeholder: string; type?: string; autoComplete?: string; minLength?: number; maxLength?: number;
}) {
  return <div>
    <label htmlFor={id} className="text-sm font-semibold text-[var(--foreground)]">{label}</label>
    <div className="relative mt-1.5">
      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--secondary)]">{icon}</span>
      <input id={id} required type={type} autoComplete={autoComplete} minLength={minLength} maxLength={maxLength} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className="h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] pl-10 pr-3.5 text-sm text-[var(--foreground)] placeholder:text-[var(--secondary)] focus-visible:outline-2 focus-visible:outline-[var(--primary)]" />
    </div>
  </div>;
}
