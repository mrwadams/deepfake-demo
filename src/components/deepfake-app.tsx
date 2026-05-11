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
import { ClipModal } from "./clip-modal";
import { SessionCountdown } from "./session-countdown";
import { MAX_SESSION_SECONDS, SUBSCRIBE_TOKEN_CHANNEL } from "@/lib/constants";

// Prefer MP4 so the download plays in QuickTime and other native players.
// Chrome 126+ supports MP4 in MediaRecorder; older browsers fall back to webm.
// Video-only codecs: the Decart remote stream may not include audio, and asking
// MediaRecorder for an audio codec with no matching track can make it error
// silently and produce zero chunks.
const RECORDING_MIME_CANDIDATES = [
  "video/mp4;codecs=avc1.42E01E",
  "video/mp4;codecs=avc1",
  "video/mp4;codecs=h264",
  "video/mp4",
  "video/webm;codecs=vp9",
  "video/webm;codecs=vp8",
  "video/webm",
];

function pickRecordingMimeType(): string | null {
  if (typeof MediaRecorder === "undefined") return null;
  for (const mt of RECORDING_MIME_CANDIDATES) {
    if (MediaRecorder.isTypeSupported(mt)) return mt;
  }
  return null;
}

declare global {
  interface Window {
    __subscribeToken?: string | null;
  }
}

export function DeepfakeApp() {
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [selectedFaceId, setSelectedFaceId] = useState<string | null>(null);
  const [customImageUrl, setCustomImageUrl] = useState<string | null>(null);
  const [prompt, setPrompt] = useState("");
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [screenshotUrl, setScreenshotUrl] = useState<string | null>(null);
  const [clip, setClip] = useState<{ url: string; ext: string } | null>(null);
  const [clipModalOpen, setClipModalOpen] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Revoke the previous object URL whenever it changes (or on unmount).
  useEffect(() => {
    return () => {
      if (customImageUrl) URL.revokeObjectURL(customImageUrl);
    };
  }, [customImageUrl]);

  useEffect(() => {
    return () => {
      if (clip) URL.revokeObjectURL(clip.url);
    };
  }, [clip]);

  const currentTransformRef = useRef<{
    prompt: string;
    image: File | Blob | null;
  }>({ prompt: "", image: null });

  const recorderRef = useRef<MediaRecorder | null>(null);
  const recorderChunksRef = useRef<Blob[]>([]);
  const recorderMimeRef = useRef<string>("");
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const subscribeTokenRef = useRef<string | null>(null);
  const channelRef = useRef<BroadcastChannel | null>(null);

  // BroadcastChannel handoff for /output pop-outs. Responds to "request"
  // messages with the current subscribe token, so an output page that opens
  // independently of window.opener can still join the active session.
  useEffect(() => {
    if (typeof BroadcastChannel === "undefined") return;
    const channel = new BroadcastChannel(SUBSCRIBE_TOKEN_CHANNEL);
    channelRef.current = channel;
    channel.onmessage = (e) => {
      if (e.data?.type === "request") {
        channel.postMessage({ type: "token", token: subscribeTokenRef.current });
      }
    };
    return () => {
      channel.close();
      channelRef.current = null;
    };
  }, []);

  const webcam = useWebcam();
  const token = useToken();
  const realtime = useDecartRealtime({
    onRemoteStream: useCallback((stream: MediaStream) => {
      setRemoteStream(stream);
    }, []),
    onGenerationTick: useCallback((seconds: number) => {
      setElapsedSeconds(seconds);
    }, []),
  });

  const isLive =
    realtime.connectionState === "connected" ||
    realtime.connectionState === "generating";
  const isConnecting = realtime.connectionState === "connecting";

  // Guard against overlapping start attempts (e.g. rapid double-click or
  // simultaneous space-bar presses).
  const startInFlightRef = useRef(false);

  const handleStart = useCallback(async () => {
    if (startInFlightRef.current || isLive || isConnecting) return;
    startInFlightRef.current = true;
    setError(null);
    try {
      const stream = await webcam.start();
      if (!stream) return; // webcam.error surfaces the reason

      const apiKey = await token.activate();
      if (!apiKey) {
        setError("Failed to authenticate");
        webcam.stop();
        return;
      }

      const rtClient = await realtime.connect(apiKey, stream);

      // Apply any face/prompt the user staged before clicking Start.
      const staged = currentTransformRef.current;
      if (staged.prompt || staged.image) {
        await realtime.set({
          prompt: staged.prompt || undefined,
          image: staged.image ?? undefined,
          enhance: true,
        });
      }

      // Expose subscribe token for pop-out. window.opener is the fast path
      // for pop-outs opened synchronously from this page; BroadcastChannel
      // covers output pages opened independently or after a race.
      const subscribeToken = rtClient?.subscribeToken ?? null;
      window.__subscribeToken = subscribeToken;
      subscribeTokenRef.current = subscribeToken;
      channelRef.current?.postMessage({ type: "token", token: subscribeToken });
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to connect to Decart"
      );
      webcam.stop();
    } finally {
      startInFlightRef.current = false;
    }
  }, [isLive, isConnecting, webcam, token, realtime]);

  const handleStop = useCallback(() => {
    // Flush any in-progress recording so the clip is saved before the stream goes away.
    if (recorderRef.current && recorderRef.current.state !== "inactive") {
      recorderRef.current.stop();
    }
    realtime.disconnect();
    webcam.stop();
    token.deactivate();
    setRemoteStream(null);
    setElapsedSeconds(0);
    setSelectedFaceId(null);
    setCustomImageUrl(null);
    setPrompt("");
    // Intentionally keep `clip` and `clipModalOpen` so the user can still
    // view/download the last recording after disconnecting from Decart.
    currentTransformRef.current = { prompt: "", image: null };
    window.__subscribeToken = null;
    subscribeTokenRef.current = null;
    channelRef.current?.postMessage({ type: "token", token: null });
    startInFlightRef.current = false;
  }, [realtime, webcam, token]);

  const handleStartRecording = useCallback(() => {
    if (!remoteStream) return;
    const mimeType = pickRecordingMimeType();
    if (!mimeType) {
      setError("Recording is not supported in this browser.");
      return;
    }
    try {
      // Discard any previous clip — only the latest recording is kept.
      setClip(null);
      setClipModalOpen(false);
      recorderChunksRef.current = [];
      recorderMimeRef.current = mimeType;
      const recorder = new MediaRecorder(remoteStream, { mimeType });
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) recorderChunksRef.current.push(e.data);
      };
      recorder.onerror = (e) => {
        console.error("MediaRecorder error", e);
        setError("Recording failed — see console.");
      };
      recorder.onstop = () => {
        const chunks = recorderChunksRef.current;
        recorderChunksRef.current = [];
        recorderRef.current = null;
        setIsRecording(false);
        if (chunks.length === 0) {
          setError("Recording produced no data.");
          return;
        }
        // Prefer the recorder's negotiated mimeType over what we requested.
        const mt = recorder.mimeType || recorderMimeRef.current;
        const blob = new Blob(chunks, { type: mt });
        const ext = mt.startsWith("video/mp4") ? "mp4" : "webm";
        setClip({ url: URL.createObjectURL(blob), ext });
      };
      // Timeslice ensures chunks land periodically rather than only at stop,
      // which is more robust if the recorder is torn down unexpectedly.
      recorder.start(1000);
      recorderRef.current = recorder;
      setIsRecording(true);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to start recording"
      );
    }
  }, [remoteStream]);

  const handleStopRecording = useCallback(() => {
    const recorder = recorderRef.current;
    if (recorder && recorder.state !== "inactive") {
      recorder.stop();
    }
  }, []);

  const handleRecordToggle = useCallback(() => {
    if (isRecording) handleStopRecording();
    else handleStartRecording();
  }, [isRecording, handleStartRecording, handleStopRecording]);

  const handleSelectFace = useCallback(
    async (image: File, facePrompt: string, id: string) => {
      setSelectedFaceId(id);
      setCustomImageUrl(id === "custom" ? URL.createObjectURL(image) : null);
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
    setCustomImageUrl(null);
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
    const remoteVideo = remoteVideoRef.current;
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

  // Latest-values ref for effects that need to read current state/handlers
  // without re-running on every change (keyboard listener installed once;
  // auto-disconnect calls handleStop without re-binding when its identity
  // shifts each render).
  const latestRef = useRef({
    isLive,
    isConnecting,
    handleStart,
    handleStop,
    handleScreenshot,
    handleRecordToggle,
  });
  latestRef.current = {
    isLive,
    isConnecting,
    handleStart,
    handleStop,
    handleScreenshot,
    handleRecordToggle,
  };

  // Auto-disconnect after max session time.
  useEffect(() => {
    if (isLive && elapsedSeconds >= MAX_SESSION_SECONDS) {
      latestRef.current.handleStop();
    }
  }, [elapsedSeconds, isLive]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      )
        return;

      const { isLive, isConnecting, handleStart, handleStop, handleScreenshot, handleRecordToggle } =
        latestRef.current;

      if (e.code === "Space") {
        e.preventDefault();
        if (isLive) handleStop();
        else if (!isConnecting) handleStart();
      }
      if (e.code === "KeyS" && isLive) {
        e.preventDefault();
        handleScreenshot();
      }
      if (e.code === "KeyR" && isLive) {
        e.preventDefault();
        handleRecordToggle();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Deepfake Demo</h1>
        <div className="flex items-center gap-4">
          <StatusIndicator state={realtime.connectionState} />
          {isLive && <SessionCountdown elapsedSeconds={elapsedSeconds} />}
        </div>
      </div>

      {/* Error */}
      {(error || webcam.error || token.error || realtime.lastError) && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {error || webcam.error || token.error || realtime.lastError}
        </div>
      )}

      {/* Videos */}
      <VideoDisplay
        localStream={webcam.stream}
        remoteStream={remoteStream}
        isLive={isLive}
        remoteVideoRef={remoteVideoRef}
      />

      {/* Face Gallery */}
      <div>
        <div className="mb-2 flex items-baseline justify-between gap-3">
          <h2 className="text-sm font-medium text-white/50">Reference Face</h2>
          <p className="text-xs text-white/30">
            Uploaded images are sent to Decart.
          </p>
        </div>
        <FaceGallery
          selectedId={selectedFaceId}
          customImageUrl={customImageUrl}
          onSelectFace={handleSelectFace}
          onClear={handleClearFace}
          disabled={isConnecting}
        />
      </div>

      {/* Controls */}
      <ControlsBar
        isRunning={isLive}
        isConnecting={isConnecting}
        isRecording={isRecording}
        canRecord={remoteStream !== null}
        hasClip={clip !== null}
        elapsedSeconds={elapsedSeconds}
        prompt={prompt}
        onPromptChange={setPrompt}
        onPromptSubmit={handlePromptSubmit}
        onStart={handleStart}
        onStop={handleStop}
        onScreenshot={handleScreenshot}
        onRecordToggle={handleRecordToggle}
        onShowClip={() => setClipModalOpen(true)}
        onPopOut={handlePopOut}
      />

      {/* Screenshot Modal */}
      {screenshotUrl && (
        <ScreenshotModal
          imageUrl={screenshotUrl}
          onClose={() => setScreenshotUrl(null)}
        />
      )}

      {/* Clip Modal — only shown when user explicitly opens it, so the
          running session UI (cost, Stop) stays visible after recording. */}
      {clip && clipModalOpen && (
        <ClipModal
          videoUrl={clip.url}
          extension={clip.ext}
          onClose={() => setClipModalOpen(false)}
        />
      )}
    </div>
  );
}
