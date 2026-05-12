"use client";

import type { SessionPhase } from "@/lib/session-phase";

interface StatusIndicatorProps {
  phase: SessionPhase;
}

type Tone = "idle" | "wait" | "ready" | "live" | "alarm";

const STATE_CONFIG: Record<SessionPhase, { label: string; tone: Tone }> = {
  idle: { label: "Ready", tone: "idle" },
  "starting-webcam": { label: "Starting webcam", tone: "wait" },
  "fetching-token": { label: "Authenticating", tone: "wait" },
  connecting: { label: "Connecting", tone: "wait" },
  connected: { label: "Connected", tone: "ready" },
  generating: { label: "Live", tone: "live" },
  reconnecting: { label: "Reconnecting", tone: "wait" },
  disconnected: { label: "Disconnected", tone: "alarm" },
};

const TONE: Record<
  Tone,
  { dot: string; text: string; pulse: boolean }
> = {
  idle: {
    dot: "bg-[var(--ink-faint)]",
    text: "text-[var(--ink-dim)]",
    pulse: false,
  },
  wait: {
    dot: "bg-amber-400",
    text: "text-amber-300",
    pulse: true,
  },
  ready: {
    dot: "bg-emerald-400",
    text: "text-emerald-300",
    pulse: false,
  },
  live: {
    dot: "bg-[var(--accent)]",
    text: "text-[var(--ink)]",
    pulse: true,
  },
  alarm: {
    dot: "bg-red-500",
    text: "text-red-300",
    pulse: false,
  },
};

export function StatusIndicator({ phase }: StatusIndicatorProps) {
  const cfg = STATE_CONFIG[phase];
  const tone = TONE[cfg.tone];

  return (
    <div className="flex items-center gap-2">
      <span className="relative flex h-2 w-2">
        {tone.pulse && (
          <span
            className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-70 ${tone.dot}`}
          />
        )}
        <span
          className={`relative inline-flex h-2 w-2 rounded-full ${tone.dot}`}
        />
      </span>
      <span className={`text-sm font-medium ${tone.text}`}>{cfg.label}</span>
    </div>
  );
}
