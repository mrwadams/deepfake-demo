"use client";

import { useState, useCallback } from "react";

export type ActivateResult =
  | { ok: true; apiKey: string }
  | {
      ok: false;
      code: "NO_API_KEY" | "INVALID_KEY" | "TOKEN_FAILED" | "NETWORK";
      message: string;
    };

// Single-shot token fetch. The Decart SDK consumes the apiKey once at WebRTC
// connect time and exposes no method to update it mid-session, so there's no
// auto-refresh — the server mints tokens with TTL covering the full session.
export function useToken() {
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(
    async (userApiKey?: string | null): Promise<ActivateResult> => {
      setIsLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/token", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(userApiKey ? { apiKey: userApiKey } : {}),
        });
        const data = await res.json().catch(() => ({}));
        setIsLoading(false);
        if (!res.ok) {
          const code: "NO_API_KEY" | "INVALID_KEY" | "TOKEN_FAILED" =
            data?.code === "NO_API_KEY" || data?.code === "INVALID_KEY"
              ? data.code
              : "TOKEN_FAILED";
          const message =
            typeof data?.error === "string"
              ? data.error
              : "Token request failed";
          setError(message);
          return { ok: false, code, message };
        }
        setToken(data.apiKey);
        return { ok: true, apiKey: data.apiKey };
      } catch {
        setIsLoading(false);
        const message = "Failed to get authentication token";
        setError(message);
        return { ok: false, code: "NETWORK", message };
      }
    },
    []
  );

  const activate = useCallback(
    (userApiKey?: string | null) => refresh(userApiKey),
    [refresh]
  );

  const deactivate = useCallback(() => {
    setToken(null);
    setError(null);
  }, []);

  return { token, isLoading, error, activate, deactivate, refresh };
}
