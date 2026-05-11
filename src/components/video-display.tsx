"use client";

import { useRef, useEffect, useState, type ReactNode } from "react";

interface VideoDisplayProps {
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  isLive: boolean;
  remoteVideoRef?: React.RefObject<HTMLVideoElement | null>;
}

function VideoPanel({
  stream,
  label,
  mirror,
  glow,
  overlay,
  videoRef,
}: {
  stream: MediaStream | null;
  label: string;
  mirror?: boolean;
  glow?: boolean;
  overlay?: ReactNode;
  videoRef?: React.RefObject<HTMLVideoElement | null>;
}) {
  const internalRef = useRef<HTMLVideoElement>(null);
  const ref = videoRef ?? internalRef;

  useEffect(() => {
    if (ref.current) {
      ref.current.srcObject = stream;
    }
  }, [stream, ref]);

  return (
    <div className="flex flex-1 flex-col items-center gap-2">
      <div
        className={`relative w-full overflow-hidden rounded-xl border border-white/10 bg-black ${
          glow ? "ring-2 ring-violet-500/50 shadow-[0_0_30px_rgba(139,92,246,0.3)]" : ""
        }`}
      >
        {stream ? (
          <video
            ref={ref}
            autoPlay
            playsInline
            muted
            className={`aspect-video w-full object-cover ${
              mirror ? "scale-x-[-1]" : ""
            }`}
          />
        ) : (
          <div className="flex aspect-video w-full items-center justify-center">
            <div className="text-white/30 text-sm">No video</div>
          </div>
        )}
        {stream && overlay ? (
          <div className="absolute right-2 top-2">{overlay}</div>
        ) : null}
      </div>
      <span className="text-xs font-medium text-white/50 uppercase tracking-wider">
        {label}
      </span>
    </div>
  );
}

function MirrorToggle({
  mirrored,
  onToggle,
}: {
  mirrored: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={mirrored}
      title={mirrored ? "Mirror: on" : "Mirror: off"}
      className={`flex h-8 w-8 items-center justify-center rounded-md border backdrop-blur-sm transition-all ${
        mirrored
          ? "border-violet-400/40 bg-violet-500/30 text-white"
          : "border-white/10 bg-black/40 text-white/70 hover:bg-black/60"
      }`}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="h-4 w-4"
        aria-hidden
      >
        <path d="M12 3v18" />
        <path d="M16 7l4 5-4 5" />
        <path d="M8 7l-4 5 4 5" />
      </svg>
    </button>
  );
}

export function VideoDisplay({
  localStream,
  remoteStream,
  isLive,
  remoteVideoRef,
}: VideoDisplayProps) {
  const [mirrorLocal, setMirrorLocal] = useState(true);

  return (
    <div className="flex flex-col gap-4 md:flex-row md:gap-6">
      <VideoPanel
        stream={localStream}
        label="You"
        mirror={mirrorLocal}
        overlay={
          <MirrorToggle
            mirrored={mirrorLocal}
            onToggle={() => setMirrorLocal((m) => !m)}
          />
        }
      />
      <VideoPanel
        stream={remoteStream}
        label="Deepfake"
        glow={isLive}
        videoRef={remoteVideoRef}
      />
    </div>
  );
}
