"use client";

import { useState, useEffect, createContext, useContext, ReactNode } from "react";
import { Lock } from "lucide-react";
import type { AuthSession } from "@/lib/auth/shared";

interface AuthContextType {
  isAuthenticated: boolean;
  session: AuthSession | null;
  login: (password: string) => Promise<boolean>;
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

  const login = async (password: string): Promise<boolean> => {
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ pin: password }),
      });

      if (!response.ok) {
        return false;
      }

      const payload = await response.json();
      setSession(payload.session ?? null);
      return true;
    } catch {
      return false;
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
  onLogin: (password: string) => Promise<boolean>;
}) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    const success = await onLogin(password);
    setSubmitting(false);

    if (!success) {
      setError(true);
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
                type="password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setError(false);
                }}
                placeholder="비밀번호"
                className="w-full rounded-lg border border-border bg-secondary/60 px-4 py-3 text-sm text-foreground text-center tracking-widest placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                autoFocus
                inputMode="numeric"
                maxLength={4}
              />
              {error && (
                <p className="text-loss text-xs mt-2 text-center">
                  비밀번호가 틀렸습니다.
                </p>
              )}
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
