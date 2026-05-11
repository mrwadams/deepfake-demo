"use client";

import { useState, useRef, useCallback } from "react";
import { COST_PER_SECOND, MAX_SESSION_SECONDS } from "@/lib/constants";

interface ControlsBarProps {
  isRunning: boolean;
  isConnecting: boolean;
  isRecording: boolean;
  canRecord: boolean;
  hasClip: boolean;
  elapsedSeconds: number;
  prompt: string;
  onPromptChange: (prompt: string) => void;
  onPromptSubmit: () => void;
  onStart: () => void;
  onStop: () => void;
  onScreenshot: () => void;
  onRecordToggle: () => void;
  onShowClip: () => void;
  onPopOut: () => void;
}

export function ControlsBar({
  isRunning,
  isConnecting,
  isRecording,
  canRecord,
  hasClip,
  elapsedSeconds,
  prompt,
  onPromptChange,
  onPromptSubmit,
  onStart,
  onStop,
  onScreenshot,
  onRecordToggle,
  onShowClip,
  onPopOut,
}: ControlsBarProps) {
  const [enhance, setEnhance] = useState(true);
  const inputRef = useRef<HTMLInputElement>(null);

  const cost = (elapsedSeconds * COST_PER_SECOND).toFixed(2);
  const maxCost = (MAX_SESSION_SECONDS * COST_PER_SECOND).toFixed(2);

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
          onClick={onRecordToggle}
          disabled={!isRunning || (!isRecording && !canRecord)}
          className={`rounded-lg border px-4 py-2.5 text-sm transition-all disabled:opacity-30 ${
            isRecording
              ? "border-red-500/50 bg-red-500/20 text-red-200 hover:bg-red-500/30"
              : "border-white/10 bg-white/5 text-white/70 hover:bg-white/10"
          }`}
        >
          {isRecording ? (
            <span className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
              Stop Recording
            </span>
          ) : (
            "Record"
          )}
        </button>

        {hasClip && !isRecording && (
          <button
            onClick={onShowClip}
            className="rounded-lg border border-violet-500/40 bg-violet-500/10 px-4 py-2.5 text-sm text-violet-200 hover:bg-violet-500/20 transition-all"
          >
            View Clip
          </button>
        )}

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
            <span className="font-mono">
              ${cost} <span className="text-white/30">/ ${maxCost}</span>
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

export { type ControlsBarProps };
