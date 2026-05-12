"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { createDecartClient } from "@decartai/sdk";
import { SUBSCRIBE_TOKEN_CHANNEL } from "@/lib/constants";

const HANDOFF_TIMEOUT_MS = 2000;

/**
 * Clean output page for OBS capture.
 * Subscribes to the active session via subscribe token from the main page.
 */
export default function OutputPage() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [hasStream, setHasStream] = useState(false);
  const [status, setStatus] = useState("Initializing…");
  const [error, setError] = useState<string | null>(null);
  const startedRef = useRef(false);

  const attachStream = useCallback((stream: MediaStream) => {
    if (videoRef.current) {
      videoRef.current.srcObject = stream;
      setHasStream(true);
    }
  }, []);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;

    let cleanup: (() => void) | undefined;
    let cancelled = false;

    const acquireToken = (): Promise<string | null> => {
      // Fast path: opener exposed the token synchronously.
      try {
        const fromOpener = (window.opener as Window | null)?.__subscribeToken;
        if (fromOpener) return Promise.resolve(fromOpener);
      } catch {
        // Cross-origin — fall through to BroadcastChannel.
      }

      if (typeof BroadcastChannel === "undefined") return Promise.resolve(null);

      return new Promise((resolve) => {
        const channel = new BroadcastChannel(SUBSCRIBE_TOKEN_CHANNEL);
        const timer = setTimeout(() => {
          channel.close();
          resolve(null);
        }, HANDOFF_TIMEOUT_MS);
        channel.onmessage = (e) => {
          if (e.data?.type === "token") {
            clearTimeout(timer);
            channel.close();
            resolve(e.data.token ?? null);
          }
        };
        channel.postMessage({ type: "request" });
      });
    };

    (async () => {
      setStatus("Looking for active session…");
      const subscribeToken = await acquireToken();
      if (cancelled) return;

      if (!subscribeToken) {
        setError(
          "No active session in the main window. Start a session, then click Pop Out."
        );
        return;
      }

      setStatus("Subscribing to session…");

      try {
        const tokenRes = await fetch("/api/token", { method: "POST" });
        if (!tokenRes.ok) throw new Error("Failed to get token");
        const { apiKey } = await tokenRes.json();

        const client = createDecartClient({ apiKey });
        const subClient = await client.realtime.subscribe({
          token: subscribeToken,
          onRemoteStream: (stream) => {
            attachStream(stream);
          },
        });

        setStatus("Live");

        const checkOpener = setInterval(() => {
          try {
            if (window.opener && (window.opener as Window).closed) {
              setError("Main window was closed.");
              subClient.disconnect();
              clearInterval(checkOpener);
            }
          } catch {
            clearInterval(checkOpener);
          }
        }, 2000);

        cleanup = () => {
          subClient.disconnect();
          clearInterval(checkOpener);
        };
      } catch (err) {
        setError(err instanceof Error ? err.message : "Subscribe failed");
      }
    })();

    return () => {
      cancelled = true;
      cleanup?.();
    };
  }, [attachStream]);

  return (
    <div className="flex h-screen w-screen items-center justify-center overflow-hidden bg-black">
      {error ? (
        <p className="px-8 text-center text-sm text-[var(--ink-dim)]">
          {error}
        </p>
      ) : !hasStream ? (
        <div className="flex flex-col items-center gap-3">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-[var(--border)] border-t-[var(--ink)]" />
          <p className="text-xs text-[var(--ink-faint)]">{status}</p>
        </div>
      ) : null}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className={`max-h-screen max-w-screen object-contain ${
          hasStream ? "" : "hidden"
        }`}
      />
    </div>
  );
}
