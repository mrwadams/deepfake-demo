"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { createDecartClient } from "@decartai/sdk";

/**
 * Clean output page for OBS capture.
 * Subscribes to the active session via subscribe token from the main page.
 */
export default function OutputPage() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [hasStream, setHasStream] = useState(false);
  const [status, setStatus] = useState("Initializing...");
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

    let subscribeToken: string | null = null;
    try {
      subscribeToken = (window.opener as Window | null)?.__subscribeToken ?? null;
    } catch {
      // Cross-origin — can't access opener
    }

    if (!subscribeToken) {
      setError("No active session. Open this page from the main app using the Pop Out button.");
      return;
    }

    setStatus("Subscribing to session...");

    (async () => {
      try {
        const tokenRes = await fetch("/api/token", { method: "POST" });
        if (!tokenRes.ok) throw new Error("Failed to get token");
        const { apiKey } = await tokenRes.json();

        const client = createDecartClient({ apiKey });
        const subClient = await client.realtime.subscribe({
          token: subscribeToken!,
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

    return () => cleanup?.();
  }, [attachStream]);

  return (
    <div className="h-screen w-screen bg-black flex items-center justify-center overflow-hidden">
      {error ? (
        <p className="text-white/50 text-sm text-center px-8">{error}</p>
      ) : !hasStream ? (
        <div className="flex flex-col items-center gap-3">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-white/20 border-t-violet-500" />
          <p className="text-white/30 text-sm">{status}</p>
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
