"use client";

import { Suspense, useEffect, useRef, useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { createDecartClient, models } from "@decartai/sdk";
import { DECART_MODEL } from "@/lib/constants";
import { PRESET_FACES, loadPresetImage } from "@/lib/faces";
import { getStoredPassword } from "@/hooks/use-token";

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
 * 1. Pop-out from main page: reads stream from window.opener.__remoteStream
 * 2. Standalone (OBS Browser Source): runs its own WebRTC connection.
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

  // Try pop-out mode first, fall back to standalone
  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;

    // Mode 1: Pop-out — try to get stream from opener
    let gotOpenerStream = false;
    try {
      const openerStream = (window.opener as Window | null)?.__remoteStream;
      if (openerStream) {
        attachStream(openerStream);
        gotOpenerStream = true;
      }
    } catch {
      // Cross-origin — fall through to standalone
    }

    if (gotOpenerStream) {
      // Watch for opener closing
      const checkOpener = setInterval(() => {
        try {
          if (window.opener && (window.opener as Window).closed) {
            setError("Main window was closed.");
            clearInterval(checkOpener);
          }
        } catch {
          clearInterval(checkOpener);
        }
      }, 2000);
      return () => clearInterval(checkOpener);
    }

    // Mode 2: Standalone — run own WebRTC connection
    setStatus("Starting camera...");
    let cleanup: (() => void) | undefined;

    (async () => {
      try {
        // Get webcam
        const localStream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 1280 }, height: { ideal: 720 }, frameRate: { ideal: 30 } },
          audio: false,
        });

        // Get token
        setStatus("Authenticating...");
        const tokenRes = await fetch("/api/token", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ password: getStoredPassword() }),
        });
        if (tokenRes.status === 401) throw new Error("Invalid password — open the main page first to authenticate");
        if (!tokenRes.ok) throw new Error("Failed to get token");
        const { apiKey } = await tokenRes.json();

        // Connect to Decart
        setStatus("Connecting to Decart...");
        const client = createDecartClient({ apiKey });
        const rtClient = await client.realtime.connect(localStream, {
          model: models.realtime(DECART_MODEL),
          onRemoteStream: (stream) => {
            attachStream(stream);
          },
        });

        // Apply face if specified via query param
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
