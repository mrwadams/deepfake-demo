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
    <div className="flex flex-col items-end gap-1">
      <span
        className={`text-xs tabular-nums transition-colors ${
          isWarning ? "text-red-400" : "text-white/30"
        }`}
      >
        auto-stop in {minutes}:{seconds.toString().padStart(2, "0")}
      </span>
      <div className="h-0.5 w-32 overflow-hidden rounded-full bg-white/10">
        <div
          className={`h-full transition-[width,background-color] duration-300 ease-linear ${
            isWarning ? "bg-red-500" : "bg-white/40"
          }`}
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}
