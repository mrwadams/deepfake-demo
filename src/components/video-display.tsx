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
  highlight,
  overlay,
  videoRef,
  cornerBadge,
}: {
  stream: MediaStream | null;
  label: string;
  mirror?: boolean;
  highlight?: boolean;
  overlay?: ReactNode;
  videoRef?: React.RefObject<HTMLVideoElement | null>;
  cornerBadge?: ReactNode;
}) {
  const internalRef = useRef<HTMLVideoElement>(null);
  const ref = videoRef ?? internalRef;

  useEffect(() => {
    if (ref.current) {
      ref.current.srcObject = stream;
    }
  }, [stream, ref]);

  return (
    <div className="flex flex-1 flex-col gap-2">
      <div
        className={`relative overflow-hidden rounded-xl border bg-black transition-colors ${
          highlight
            ? "border-[var(--accent)]/50"
            : "border-[var(--border)]"
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
            <span className="text-sm text-[var(--ink-faint)]">No signal</span>
          </div>
        )}
        {stream && overlay && (
          <div className="absolute right-3 top-3">{overlay}</div>
        )}
        {stream && cornerBadge && (
          <div className="absolute left-3 top-3">{cornerBadge}</div>
        )}
      </div>
      <span className="text-sm font-medium text-[var(--ink-dim)]">
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
      title={mirrored ? "Mirror on" : "Mirror off"}
      className={`flex h-8 w-8 items-center justify-center rounded-md border backdrop-blur-md transition-colors ${
        mirrored
          ? "border-[var(--border-strong)] bg-white/10 text-[var(--ink)]"
          : "border-[var(--border)] bg-black/50 text-[var(--ink-dim)] hover:text-[var(--ink)]"
      }`}
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
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

function LivePill() {
  return (
    <div className="flex items-center gap-2 rounded-full border border-[var(--accent)]/40 bg-black/55 px-2.5 py-1 text-[0.65rem] font-medium uppercase tracking-wider text-[var(--ink)] backdrop-blur-md">
      <span className="relative flex h-1.5 w-1.5">
        <span
          className="absolute inline-flex h-full w-full animate-ping rounded-full"
          style={{ background: "var(--accent)" }}
        />
        <span
          className="relative inline-flex h-1.5 w-1.5 rounded-full"
          style={{ background: "var(--accent)" }}
        />
      </span>
      Live
    </div>
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
    <div className="flex flex-col gap-5 md:flex-row md:gap-6">
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
        highlight={isLive}
        videoRef={remoteVideoRef}
        cornerBadge={isLive ? <LivePill /> : null}
      />
    </div>
  );
}
