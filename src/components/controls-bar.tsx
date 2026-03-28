"use client";

import { useState, useRef, useCallback } from "react";
import { COST_PER_SECOND } from "@/lib/constants";

interface ControlsBarProps {
  isRunning: boolean;
  isConnecting: boolean;
  elapsedSeconds: number;
  prompt: string;
  onPromptChange: (prompt: string) => void;
  onPromptSubmit: () => void;
  onStart: () => void;
  onStop: () => void;
  onScreenshot: () => void;
  onPopOut: () => void;
  remoteVideoRef: React.RefObject<HTMLVideoElement | null>;
}

export function ControlsBar({
  isRunning,
  isConnecting,
  elapsedSeconds,
  prompt,
  onPromptChange,
  onPromptSubmit,
  onStart,
  onStop,
  onScreenshot,
  onPopOut,
}: ControlsBarProps) {
  const [enhance, setEnhance] = useState(true);
  const inputRef = useRef<HTMLInputElement>(null);

  const cost = (elapsedSeconds * COST_PER_SECOND).toFixed(2);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter") {
        onPromptSubmit();
        inputRef.current?.blur();
      }
    },
    [onPromptSubmit]
  );

  return (
    <div className="space-y-3">
      {/* Prompt row */}
      <div className="flex items-center gap-3">
        <input
          ref={inputRef}
          type="text"
          value={prompt}
          onChange={(e) => onPromptChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Optional text prompt (e.g. 'wearing a red hat')..."
          disabled={!isRunning}
          className="flex-1 rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder:text-white/30 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500 disabled:opacity-50"
        />
        <button
          onClick={() => setEnhance(!enhance)}
          disabled={!isRunning}
          className={`rounded-lg px-3 py-2.5 text-xs font-medium transition-all ${
            enhance
              ? "bg-violet-600 text-white"
              : "bg-white/5 text-white/50 border border-white/10"
          } disabled:opacity-50`}
        >
          Enhance
        </button>
      </div>

      {/* Button row */}
      <div className="flex items-center gap-3">
        <button
          onClick={isRunning ? onStop : onStart}
          disabled={isConnecting}
          className={`rounded-lg px-6 py-2.5 text-sm font-semibold transition-all ${
            isRunning
              ? "bg-red-600 text-white hover:bg-red-500"
              : "bg-violet-600 text-white hover:bg-violet-500"
          } disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          {isConnecting ? "Connecting..." : isRunning ? "Stop" : "Start"}
        </button>

        <button
          onClick={onScreenshot}
          disabled={!isRunning}
          className="rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white/70 hover:bg-white/10 transition-all disabled:opacity-30"
        >
          Screenshot
        </button>

        <button
          onClick={onPopOut}
          disabled={!isRunning}
          className="rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white/70 hover:bg-white/10 transition-all disabled:opacity-30"
        >
          Pop Out
        </button>

        {isRunning && (
          <div className="ml-auto flex items-center gap-4 text-sm text-white/50">
            <span>{elapsedSeconds}s</span>
            <span className="font-mono">${cost}</span>
          </div>
        )}
      </div>
    </div>
  );
}

export { type ControlsBarProps };
