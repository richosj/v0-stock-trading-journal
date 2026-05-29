"use client";

import { useState, useEffect, createContext, useContext, ReactNode } from "react";
import { Lock } from "lucide-react";
import type { AuthSession } from "@/lib/auth/shared";

interface AuthContextType {
  isAuthenticated: boolean;
  session: AuthSession | null;
  login: (password: string) => Promise<{ ok: boolean; message?: string }>;
  logout: () => Promise<void>;
  refreshSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshSession = async () => {
    try {
      const response = await fetch("/api/auth/session", {
        cache: "no-store",
      });

      if (!response.ok) {
        setSession(null);
        return;
      }

      const payload = await response.json();
      setSession(payload.session ?? null);
    } catch {
      setSession(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refreshSession();
  }, []);

  const login = async (password: string) => {
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ pin: password.trim() }),
      });

      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        return {
          ok: false,
          message: payload?.hint ?? payload?.error ?? "비밀번호가 올바르지 않습니다.",
        };
      }

      setSession(payload?.session ?? null);
      return { ok: true };
    } catch {
      return { ok: false, message: "로그인 요청에 실패했습니다. 잠시 후 다시 시도하세요." };
    }
  };

  const logout = async () => {
    await fetch("/api/auth/logout", {
      method: "POST",
    }).catch(() => null);
    setSession(null);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-muted-foreground text-sm">로딩 중...</div>
      </div>
    );
  }

  if (!session) {
    return <PasswordScreen onLogin={login} />;
  }

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated: true,
        session,
        login,
        logout,
        refreshSession,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

function PasswordScreen({
  onLogin,
}: {
  onLogin: (password: string) => Promise<{ ok: boolean; message?: string }>;
}) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    const result = await onLogin(password);
    setSubmitting(false);

    if (!result.ok) {
      setError(result.message ?? "비밀번호가 올바르지 않습니다.");
      setPassword("");
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="rounded-xl border border-border bg-card p-8">
          <div className="flex flex-col items-center gap-4 mb-6">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
              <Lock className="w-6 h-6 text-primary" />
            </div>
            <div className="text-center">
              <h1 className="text-xl font-bold text-foreground">매매 복기 일지</h1>
              <p className="text-sm text-muted-foreground mt-1">
                비밀번호를 입력하세요
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <input
                type="tel"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value.replace(/\D/g, ""));
                  setError(null);
                }}
                placeholder="4자리 PIN"
                className="w-full rounded-lg border border-border bg-secondary/60 px-4 py-3 text-sm text-foreground text-center tracking-[0.3em] placeholder:text-muted-foreground placeholder:tracking-normal focus:outline-none focus:ring-2 focus:ring-primary/50"
                autoFocus
                autoComplete="one-time-code"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={8}
              />
              {error ? (
                <p className="text-loss text-xs mt-2 text-center leading-5">{error}</p>
              ) : null}
            </div>
            <button
              type="submit"
              disabled={submitting}
              className="w-full px-4 py-3 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors"
            >
              {submitting ? "확인 중..." : "로그인"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
