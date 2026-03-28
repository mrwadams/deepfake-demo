"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { TokenResponse } from "@/types";
import { TOKEN_REFRESH_BUFFER_SECONDS } from "@/lib/constants";

export function useToken() {
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const activeRef = useRef(false);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const refresh = useCallback(async (): Promise<string | null> => {
    setIsLoading(true);
    setError(null);
    clearTimer();

    try {
      const res = await fetch("/api/token", { method: "POST" });
      if (!res.ok) {
        throw new Error("Token request failed");
      }
      const data: TokenResponse = await res.json();
      setToken(data.apiKey);

      // Schedule auto-refresh before expiry
      if (activeRef.current) {
        const expiresAt = new Date(data.expiresAt).getTime();
        const refreshIn = expiresAt - Date.now() - TOKEN_REFRESH_BUFFER_SECONDS * 1000;
        if (refreshIn > 0) {
          timerRef.current = setTimeout(() => {
            refresh();
          }, refreshIn);
        }
      }

      setIsLoading(false);
      return data.apiKey;
    } catch {
      setError("Failed to get authentication token");
      setIsLoading(false);
      return null;
    }
  }, [clearTimer]);

  const activate = useCallback(() => {
    activeRef.current = true;
    return refresh();
  }, [refresh]);

  const deactivate = useCallback(() => {
    activeRef.current = false;
    clearTimer();
    setToken(null);
  }, [clearTimer]);

  useEffect(() => {
    return () => {
      activeRef.current = false;
      clearTimer();
    };
  }, [clearTimer]);

  return { token, isLoading, error, activate, deactivate, refresh };
}
