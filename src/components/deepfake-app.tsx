"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useWebcam } from "@/hooks/use-webcam";
import { useToken } from "@/hooks/use-token";
import { useDecartRealtime } from "@/hooks/use-decart-realtime";
import { VideoDisplay } from "./video-display";
import { FaceGallery } from "./face-gallery";
import { ControlsBar } from "./controls-bar";
import { StatusIndicator } from "./status-indicator";
import { ScreenshotModal } from "./screenshot-modal";
import { MAX_SESSION_SECONDS, COST_PER_SECOND } from "@/lib/constants";

declare global {
  interface Window {
    __remoteStream?: MediaStream | null;
    __subscribeToken?: string | null;
  }
}

export function DeepfakeApp() {
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [selectedFaceId, setSelectedFaceId] = useState<string | null>(null);
  const [prompt, setPrompt] = useState("");
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [screenshotUrl, setScreenshotUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const currentTransformRef = useRef<{
    prompt: string;
    image: File | Blob | null;
  }>({ prompt: "", image: null });

  const webcam = useWebcam();
  const token = useToken();
  const realtime = useDecartRealtime({
    onRemoteStream: useCallback((stream: MediaStream) => {
      setRemoteStream(stream);
      // Expose for pop-out window
      window.__remoteStream = stream;
    }, []),
    onGenerationTick: useCallback((seconds: number) => {
      setElapsedSeconds(seconds);
    }, []),
  });

  const isLive =
    realtime.connectionState === "connected" ||
    realtime.connectionState === "generating";
  const isConnecting = realtime.connectionState === "connecting";

  // Auto-disconnect after max session time
  useEffect(() => {
    if (isLive && elapsedSeconds >= MAX_SESSION_SECONDS) {
      handleStop();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [elapsedSeconds, isLive]);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      )
        return;

      if (e.code === "Space") {
        e.preventDefault();
        if (isLive) handleStop();
        else if (!isConnecting) handleStart();
      }
      if (e.code === "KeyS" && isLive) {
        e.preventDefault();
        handleScreenshot();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLive, isConnecting]);

  const handleStart = async () => {
    setError(null);
    try {
      await webcam.start();
    } catch {
      return;
    }

    // Need to wait for stream — use a small delay since setState is async
    // Actually, we call start which sets the stream, then we use a ref approach
  };

  // Watch for webcam stream to become available, then connect
  const connectingRef = useRef(false);
  useEffect(() => {
    if (!webcam.stream || connectingRef.current || isLive) return;

    const doConnect = async () => {
      connectingRef.current = true;
      try {
        const apiKey = await token.activate();
        if (!apiKey) {
          setError("Failed to authenticate");
          connectingRef.current = false;
          return;
        }

        await realtime.connect(apiKey, webcam.stream!);

        // Expose subscribe token for pop-out
        window.__subscribeToken = realtime.getSubscribeToken();
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to connect to Decart"
        );
        webcam.stop();
      }
      connectingRef.current = false;
    };

    doConnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [webcam.stream]);

  const handleStop = useCallback(() => {
    realtime.disconnect();
    webcam.stop();
    token.deactivate();
    setRemoteStream(null);
    setElapsedSeconds(0);
    setSelectedFaceId(null);
    setPrompt("");
    currentTransformRef.current = { prompt: "", image: null };
    window.__remoteStream = null;
    window.__subscribeToken = null;
    connectingRef.current = false;
  }, [realtime, webcam, token]);

  const handleSelectFace = useCallback(
    async (image: File, facePrompt: string, id: string) => {
      setSelectedFaceId(id);
      const combinedPrompt = prompt
        ? `${facePrompt} ${prompt}`
        : facePrompt;
      currentTransformRef.current = { prompt: combinedPrompt, image };
      await realtime.set({
        prompt: combinedPrompt,
        image,
        enhance: true,
      });
    },
    [prompt, realtime]
  );

  const handleClearFace = useCallback(async () => {
    setSelectedFaceId(null);
    currentTransformRef.current = { prompt: prompt, image: null };
    await realtime.set({ prompt: prompt || undefined, image: null });
  }, [prompt, realtime]);

  const handlePromptSubmit = useCallback(async () => {
    const { image } = currentTransformRef.current;
    currentTransformRef.current = { prompt, image };
    await realtime.set({
      prompt: prompt || undefined,
      image: image ?? undefined,
      enhance: true,
    });
  }, [prompt, realtime]);

  const handleScreenshot = useCallback(() => {
    // Find the remote video element in the DOM
    const videos = document.querySelectorAll("video");
    const remoteVideo = videos[1]; // second video is the remote one
    if (!remoteVideo || !remoteVideo.videoWidth) return;

    const canvas = document.createElement("canvas");
    canvas.width = remoteVideo.videoWidth;
    canvas.height = remoteVideo.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(remoteVideo, 0, 0);
    setScreenshotUrl(canvas.toDataURL("image/png"));
  }, []);

  const handlePopOut = useCallback(() => {
    window.open(
      "/output",
      "deepfake-output",
      "width=1300,height=740,menubar=no,toolbar=no,status=no"
    );
  }, []);

  const maxCost = (MAX_SESSION_SECONDS * COST_PER_SECOND).toFixed(2);

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Deepfake Demo</h1>
        <div className="flex items-center gap-4">
          <StatusIndicator state={realtime.connectionState} />
          {isLive && (
            <span className="text-xs text-white/30">
              auto-stop at ${maxCost}
            </span>
          )}
        </div>
      </div>

      {/* Error */}
      {(error || webcam.error || token.error) && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {error || webcam.error || token.error}
        </div>
      )}

      {/* Videos */}
      <VideoDisplay
        localStream={webcam.stream}
        remoteStream={remoteStream}
        isLive={isLive}
      />

      {/* Face Gallery */}
      <div>
        <h2 className="mb-2 text-sm font-medium text-white/50">
          Reference Face
        </h2>
        <FaceGallery
          selectedId={selectedFaceId}
          onSelectFace={handleSelectFace}
          onClear={handleClearFace}
          disabled={!isLive}
        />
      </div>

      {/* Controls */}
      <ControlsBar
        isRunning={isLive}
        isConnecting={isConnecting}
        elapsedSeconds={elapsedSeconds}
        prompt={prompt}
        onPromptChange={setPrompt}
        onPromptSubmit={handlePromptSubmit}
        onStart={handleStart}
        onStop={handleStop}
        onScreenshot={handleScreenshot}
        onPopOut={handlePopOut}
        remoteVideoRef={remoteVideoRef}
      />

      {/* Screenshot Modal */}
      {screenshotUrl && (
        <ScreenshotModal
          imageUrl={screenshotUrl}
          onClose={() => setScreenshotUrl(null)}
        />
      )}
    </div>
  );
}
