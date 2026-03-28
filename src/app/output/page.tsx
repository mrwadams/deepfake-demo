"use client";

import { Suspense, useEffect, useRef, useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { createDecartClient, models } from "@decartai/sdk";
import { DECART_MODEL } from "@/lib/constants";
import { PRESET_FACES, loadPresetImage } from "@/lib/faces";

export default function OutputPage() {
  return (
    <Suspense
      fallback={
        <div className="h-screen w-screen bg-black flex items-center justify-center">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-white/20 border-t-violet-500" />
        </div>
      }
    >
      <OutputContent />
    </Suspense>
  );
}

/**
 * Clean output page for OBS capture.
 *
 * Two modes:
 * 1. Pop-out from main page: subscribes to the active session via subscribe token
 *    (own WebRTC connection, resilient to main window being backgrounded)
 * 2. Standalone (OBS Browser Source): runs its own full WebRTC connection.
 *    Accepts optional ?face=<id> query param to auto-select a preset face.
 */
function OutputContent() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [hasStream, setHasStream] = useState(false);
  const [status, setStatus] = useState("Initializing...");
  const [error, setError] = useState<string | null>(null);
  const searchParams = useSearchParams();
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

    // Mode 1: Pop-out — subscribe to the active session
    let subscribeToken: string | null = null;
    let apiKey: string | null = null;
    try {
      subscribeToken = (window.opener as Window | null)?.__subscribeToken ?? null;
      // We need an API key for the subscribe client
    } catch {
      // Cross-origin — fall through to standalone
    }

    if (subscribeToken) {
      setStatus("Subscribing to session...");

      (async () => {
        try {
          // Get a client token for the subscribe connection
          const tokenRes = await fetch("/api/token", { method: "POST" });
          if (!tokenRes.ok) throw new Error("Failed to get token");
          const tokenData = await tokenRes.json();
          apiKey = tokenData.apiKey;

          const client = createDecartClient({ apiKey: apiKey! });
          const subClient = await client.realtime.subscribe({
            token: subscribeToken!,
            onRemoteStream: (stream) => {
              attachStream(stream);
            },
          });

          setStatus("Live");

          // Watch for opener closing
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
    }

    // Mode 2: Standalone — run own WebRTC connection
    setStatus("Starting camera...");

    (async () => {
      try {
        const localStream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 1280 }, height: { ideal: 720 }, frameRate: { ideal: 30 } },
          audio: false,
        });

        setStatus("Authenticating...");
        const tokenRes = await fetch("/api/token", { method: "POST" });
        if (!tokenRes.ok) throw new Error("Failed to get token");
        const tokenData = await tokenRes.json();

        setStatus("Connecting to Decart...");
        const client = createDecartClient({ apiKey: tokenData.apiKey });
        const rtClient = await client.realtime.connect(localStream, {
          model: models.realtime(DECART_MODEL),
          onRemoteStream: (stream) => {
            attachStream(stream);
          },
        });

        const faceId = searchParams.get("face");
        if (faceId) {
          const preset = PRESET_FACES.find((f) => f.id === faceId);
          if (preset) {
            setStatus(`Loading face: ${preset.name}...`);
            const image = await loadPresetImage(preset);
            await rtClient.set({ prompt: preset.prompt, image, enhance: true });
          }
        }

        setStatus("Live");

        cleanup = () => {
          rtClient.disconnect();
          localStream.getTracks().forEach((t) => t.stop());
        };
      } catch (err) {
        setError(err instanceof Error ? err.message : "Connection failed");
      }
    })();

    return () => cleanup?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
