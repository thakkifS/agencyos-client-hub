"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  apiGetMe,
  apiLogin,
  apiLogout,
  apiSignup,
  type AuthUser,
} from "@/lib/api/client";

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (input: { name: string; email: string; agencyName: string; password: string }) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const isPublicAuthPage = pathname === "/login" || pathname === "/signup";
  const loading = !isPublicAuthPage && authLoading;

  const refreshUser = useCallback(async () => {
    try {
      const result = await apiGetMe();
      setUser(result.user);
    } catch {
      setUser(null);
    } finally {
      setAuthLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isPublicAuthPage) return;
    let active = true;
    apiGetMe()
      .then((result) => {
        if (active) setUser(result.user);
      })
      .catch(() => {
        if (active) setUser(null);
      })
      .finally(() => {
        if (active) setAuthLoading(false);
      });
    return () => {
      active = false;
    };
  }, [isPublicAuthPage]);

  async function login(email: string, password: string) {
    const result = await apiLogin(email, password);
    setUser(result.user);
    router.push("/overview");
  }

  async function signup(input: { name: string; email: string; agencyName: string; password: string }) {
    const result = await apiSignup(input);
    setUser(result.user);
    router.push("/overview");
  }

  async function logout() {
    try {
      await apiLogout();
    } catch {
      // Continue client cleanup even if network fails
    } finally {
      setUser(null);
      router.push("/login");
    }
  }

  return (
    <AuthContext.Provider
      value={{ user, loading, login, signup, logout, refreshUser }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

