"use client";

import { useState, useCallback, useRef, useEffect, useReducer } from "react";
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
import {
  sessionPhaseReducer,
  isConnectingPhase,
  isLivePhase,
} from "@/lib/session-phase";

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

  const [phase, dispatch] = useReducer(sessionPhaseReducer, "idle");
  const isLive = isLivePhase(phase);
  const isConnecting = isConnectingPhase(phase);

  // Sync SDK connection state into the reducer once handleStart has handed off.
  useEffect(() => {
    dispatch({ type: "SDK_STATE", state: realtime.connectionState });
  }, [realtime.connectionState]);

  // Synchronous re-entry guard for handleStart. The reducer's phase only
  // updates on re-render, so two same-tick calls (button + space-bar) would
  // both see phase === "idle" and both run.
  const startInFlightRef = useRef(false);

  const handleStart = useCallback(async () => {
    if (startInFlightRef.current) return;
    startInFlightRef.current = true;
    setError(null);
    dispatch({ type: "START" });
    try {
      const stream = await webcam.start();
      if (!stream) {
        dispatch({ type: "FAIL" });
        return; // webcam.error surfaces the reason
      }
      dispatch({ type: "WEBCAM_READY" });

      const apiKey = await token.activate();
      if (!apiKey) {
        setError("Failed to authenticate");
        webcam.stop();
        dispatch({ type: "FAIL" });
        return;
      }
      dispatch({ type: "TOKEN_READY" });

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
      dispatch({ type: "FAIL" });
    } finally {
      startInFlightRef.current = false;
    }
  }, [webcam, token, realtime]);

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
    dispatch({ type: "STOP" });
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

  const firstError = error || webcam.error || token.error || realtime.lastError;

  return (
    <div className="fade-up mx-auto w-full max-w-[1400px] px-6 py-12 lg:px-12">
      {/* Header */}
      <header className="mb-10 flex items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-[var(--ink)]">
            Live Deepfake Demo
          </h1>
          <p className="mt-1.5 text-base text-[var(--ink-dim)]">
            Realtime webcam face substitution powered by Decart AI.
          </p>
        </div>
        <div className="flex items-center gap-6">
          {isLive && <SessionCountdown elapsedSeconds={elapsedSeconds} />}
          <StatusIndicator phase={phase} />
        </div>
      </header>

      {/* Error */}
      {firstError && (
        <div
          role="alert"
          className="mb-6 rounded-lg border border-[var(--accent)]/40 bg-[var(--accent-soft)] px-4 py-3 text-sm text-[var(--ink)]"
        >
          {firstError}
        </div>
      )}

      {/* Videos */}
      <section className="mb-10">
        <VideoDisplay
          localStream={webcam.stream}
          remoteStream={remoteStream}
          isLive={isLive}
          remoteVideoRef={remoteVideoRef}
        />
      </section>

      {/* Reference Face */}
      <section className="mb-10">
        <div className="mb-4 flex items-baseline justify-between">
          <h2 className="text-base font-medium text-[var(--ink)]">
            Reference face
          </h2>
          <p className="text-sm text-[var(--ink-faint)]">
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
      </section>

      {/* Controls */}
      <section>
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
      </section>

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
