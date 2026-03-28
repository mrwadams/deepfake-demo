"use client";

import { useState, useCallback, useEffect } from "react";
import { getStoredPassword, setStoredPassword } from "@/hooks/use-token";

interface PasswordGateProps {
  children: React.ReactNode;
}

export function PasswordGate({ children }: PasswordGateProps) {
  const [mounted, setMounted] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);

  // Only check sessionStorage after mount to avoid SSR/hydration issues
  useEffect(() => {
    setAuthenticated(!!getStoredPassword());
    setMounted(true);
  }, []);
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setChecking(true);
      setError(null);

      try {
        const res = await fetch("/api/token", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ password }),
        });

        if (res.status === 401) {
          setError("Wrong password");
          setChecking(false);
          return;
        }

        if (!res.ok) {
          setError("Server error — check configuration");
          setChecking(false);
          return;
        }

        // Password is correct — store it for the session
        setStoredPassword(password);
        setAuthenticated(true);
      } catch {
        setError("Connection failed");
      }
      setChecking(false);
    },
    [password]
  );

  if (!mounted) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-950">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-white/20 border-t-violet-500" />
      </div>
    );
  }

  if (authenticated) {
    return <>{children}</>;
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-950 p-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm space-y-4 rounded-2xl border border-white/10 bg-white/5 p-8"
      >
        <h1 className="text-xl font-bold text-white">Deepfake Demo</h1>
        <p className="text-sm text-white/50">Enter the demo password to continue.</p>

        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          autoFocus
          className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder:text-white/30 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500"
        />

        {error && (
          <p className="text-sm text-red-400">{error}</p>
        )}

        <button
          type="submit"
          disabled={checking || !password}
          className="w-full rounded-lg bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-violet-500 transition-colors disabled:opacity-50"
        >
          {checking ? "Checking..." : "Enter"}
        </button>
      </form>
    </div>
  );
}
