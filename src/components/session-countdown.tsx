"use client";

import { MAX_SESSION_SECONDS } from "@/lib/constants";

const WARNING_THRESHOLD_SECONDS = 30;

interface SessionCountdownProps {
  elapsedSeconds: number;
}

export function SessionCountdown({ elapsedSeconds }: SessionCountdownProps) {
  const remaining = Math.max(0, MAX_SESSION_SECONDS - elapsedSeconds);
  const minutes = Math.floor(remaining / 60);
  const seconds = remaining % 60;
  const progress = Math.min(1, elapsedSeconds / MAX_SESSION_SECONDS) * 100;
  const isWarning = remaining <= WARNING_THRESHOLD_SECONDS;

  return (
    <div className="flex flex-col items-end gap-1.5">
      <span
        className={`font-mono text-sm tabular-nums transition-colors ${
          isWarning ? "text-[var(--accent)]" : "text-[var(--ink-dim)]"
        }`}
      >
        {minutes}:{seconds.toString().padStart(2, "0")}{" "}
        <span className="text-[var(--ink-faint)]">left</span>
      </span>
      <div className="h-[2px] w-40 overflow-hidden rounded-full bg-[var(--border)]">
        <div
          className="h-full transition-[width] duration-300 ease-linear"
          style={{
            width: `${progress}%`,
            background: isWarning ? "var(--accent)" : "var(--ink-dim)",
          }}
        />
      </div>
    </div>
  );
}
