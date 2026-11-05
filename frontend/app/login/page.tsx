"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Eye,
  EyeOff,
  Lock,
  Mail,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Quote,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth/auth-context";
import { apiGetGoogleAuthUrl } from "@/lib/api/client";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import Link from "next/link";

export default function LoginPage() {
  const router = useRouter();
  const { user, login } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [googleStatus, setGoogleStatus] = useState<{
    configured: boolean;
    url?: string;
    message?: string;
  } | null>(null);

  // If already logged in, redirect to overview
  useEffect(() => {
    if (user) {
      router.push("/overview");
    }
  }, [user, router]);

  // Check Google OAuth availability on mount
  useEffect(() => {
    apiGetGoogleAuthUrl()
      .then((status) => setGoogleStatus(status))
      .catch(() => setGoogleStatus({ configured: false }));
  }, []);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || !password) {
      setError("Please enter both email and password.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      await login(email.trim(), password);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Invalid email or password. Please check your credentials."
      );
    } finally {
      setLoading(false);
    }
  }

  function handleGoogleLogin() {
    if (googleStatus?.configured && googleStatus.url) {
      window.location.href = googleStatus.url;
    } else {
      setError("Google sign in is currently unavailable. Please use your agency account or contact your administrator.");
    }
  }

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const errorCode = params.get("error");
    if (errorCode === "google_auth_failed") {
      window.setTimeout(() => setError("Google sign in could not be completed. Confirm the OAuth redirect URL and account configuration, then try again."), 0);
      window.history.replaceState({}, "", "/login");
    }
  }, []);

  return (
    <main className="login-backdrop relative min-h-screen overflow-hidden flex flex-col justify-between p-4 sm:p-8 lg:p-12">
      {/* Top Bar with Brand & Theme Toggle */}
      <header className="relative z-10 mx-auto flex w-full max-w-6xl items-center justify-between pb-6">
        <div className="flex items-center gap-3">
          <Image src="/agencyos-logo.svg" alt="Agency OS" width={180} height={52} className="h-auto w-36 object-contain dark:hidden sm:w-44" priority />
          <Image src="/agencyos-logo-dark.svg" alt="Agency OS" width={180} height={52} className="hidden h-auto w-36 object-contain dark:block sm:w-44" priority />
        </div>
        <div className="flex items-center gap-3">
          <ThemeToggle />
        </div>
      </header>

      {/* Main Container */}
      <div className="relative z-10 mx-auto grid w-full max-w-6xl items-center gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:gap-16 py-6">
        {/* Left Column: Story & Security Context */}
        <section className="space-y-6">
          <div className="inline-flex items-center gap-2 rounded-full border border-blue-500/30 bg-blue-500/10 px-3.5 py-1 text-xs font-semibold text-[var(--primary)] backdrop-blur-md">
            <Sparkles size={13} aria-hidden="true" />
            Agency OS Enterprise Authentication Gateway
          </div>

          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-[var(--foreground)] leading-[1.15]">
            Secure, tenant-isolated operations for modern agencies.
          </h1>

          <p className="max-w-xl text-xs sm:text-sm leading-relaxed text-[var(--secondary)]">
            Access client workspaces, manage multi-stakeholder requirements, and track immutable
            approved revisions with enterprise-grade session protection and role-based permissions.
          </p>

          {/* Quick-fill Demo Box for Interviewer Demonstration */}
          <div className="max-w-lg rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm">
            <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-[var(--foreground)]">
              <ShieldCheck size={17} className="text-[var(--primary)]" aria-hidden="true" />
              Your workspace, securely connected
            </div>
            <p className="text-sm leading-6 text-[var(--secondary)]">
              Sign in with the account provided by your Agency OS administrator. Demo accounts and credentials are not shown here.
            </p>
          </div>

          <blockquote className="relative max-w-lg overflow-hidden rounded-2xl border border-[var(--primary)]/20 bg-[var(--primary)]/[0.045] p-5 sm:p-6">
            <Quote size={22} className="mb-3 text-[var(--primary)]" aria-hidden="true" />
            <p className="text-lg font-semibold leading-7 tracking-tight text-[var(--foreground)] sm:text-xl">
              “Great client partnerships begin with clarity.”
            </p>
            <footer className="mt-3 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--secondary)]">
              The Agency OS principle
            </footer>
          </blockquote>
        </section>

        {/* Right Column: Premium Frosted Glass Login Card */}
        <section
          aria-labelledby="login-form-heading"
          className="login-card-enter glass-modal rounded-3xl p-6 sm:p-9 shadow-2xl relative"
        >
          <div className="flex items-center justify-between border-b border-[var(--border)] pb-5">
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-blue-800 text-white shadow-xs">
                <ShieldCheck size={22} aria-hidden="true" />
              </span>
              <div>
                <h2 id="login-form-heading" className="text-lg font-bold text-[var(--foreground)]">
                  Sign In to Agency OS
                </h2>
                <p className="text-xs text-[var(--secondary)]">
                  Enter your agency workspace credentials
                </p>
              </div>
            </div>
          </div>

          {/* Error Alert */}
          {error && (
            <div
              role="alert"
              className="mt-5 flex items-start gap-2.5 rounded-2xl border border-[var(--error)]/25 bg-[var(--error)]/10 p-3.5 text-xs text-[var(--error)] animate-fade-in"
            >
              <ShieldAlert size={16} className="text-[var(--error)] shrink-0 mt-0.5" />
              <div className="flex-1 leading-relaxed">{error}</div>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleLogin} className="mt-5 space-y-4">
            <div>
              <label
                htmlFor="login-email"
                className="block text-xs font-semibold text-[var(--foreground)]"
              >
                Work Email Address
              </label>
              <div className="relative mt-1.5">
                <Mail
                  size={15}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                  aria-hidden="true"
                />
                <input
                  id="login-email"
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@agency.com"
                  className="h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] pl-10 pr-3.5 text-xs sm:text-sm text-[var(--foreground)] placeholder:text-slate-400 focus-visible:outline-2 focus-visible:outline-[var(--primary)] transition-all"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between">
                <label
                  htmlFor="login-password"
                  className="block text-xs font-semibold text-[var(--foreground)]"
                >
                  Password
                </label>
              </div>
              <div className="relative mt-1.5">
                <Lock
                  size={15}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                  aria-hidden="true"
                />
                <input
                  id="login-password"
                  type={showPassword ? "text" : "password"}
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] pl-10 pr-10 text-xs sm:text-sm text-[var(--foreground)] placeholder:text-slate-400 focus-visible:outline-2 focus-visible:outline-[var(--primary)] transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-[var(--foreground)] transition-colors p-1"
                >
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full h-11 rounded-xl text-xs sm:text-sm font-semibold shadow-md shadow-blue-500/20 mt-2"
            >
              {loading ? (
                <>
                  <RefreshCw size={15} className="animate-spin" /> Verifying Credentials…
                </>
              ) : (
                <>
                  Sign In to Workspace <ArrowRight size={15} />
                </>
              )}
            </Button>
          </form>

          <div className="mt-5 border-t border-[var(--border)] pt-4 text-center">
            {googleStatus?.configured && <button type="button" onClick={handleGoogleLogin} className="mb-4 flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] text-sm font-semibold text-[var(--foreground)] transition-colors hover:bg-[var(--surface-elevated)]">Continue with Google <ArrowRight size={15} aria-hidden="true" /></button>}
            {googleStatus && !googleStatus.configured && <p className="mb-3 text-xs text-[var(--secondary)]">Google sign-in is not configured. Email and password sign-in remain available.</p>}
            <p className="text-sm text-[var(--secondary)]">Need an account? <Link href="/signup" className="font-semibold text-[var(--primary)] hover:underline">Create your agency workspace</Link></p>
          </div>
        </section>
      </div>

      {/* Footer */}
      <footer className="relative z-10 mx-auto w-full max-w-6xl text-center text-xs text-[var(--secondary)] pt-4">
        <span>Agency OS · Client operating workspace</span>
      </footer>
    </main>
  );
}
