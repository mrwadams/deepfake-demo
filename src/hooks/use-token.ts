"use client";

import { useState, useCallback } from "react";
import { TokenResponse } from "@/types";

// Single-shot token fetch. The Decart SDK consumes the apiKey once at WebRTC
// connect time and exposes no method to update it mid-session, so there's no
// auto-refresh — the server mints tokens with TTL covering the full session.
export function useToken() {
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async (): Promise<string | null> => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/token", { method: "POST" });
      if (!res.ok) throw new Error("Token request failed");
      const data: TokenResponse = await res.json();
      setToken(data.apiKey);
      setIsLoading(false);
      return data.apiKey;
    } catch {
      setError("Failed to get authentication token");
      setIsLoading(false);
      return null;
    }
  }, []);

  const activate = useCallback(() => refresh(), [refresh]);

  const deactivate = useCallback(() => {
    setToken(null);
  }, []);

  return { token, isLoading, error, activate, deactivate, refresh };
}
