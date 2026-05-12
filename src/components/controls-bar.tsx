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

function formatElapsed(seconds: number) {
  const mm = String(Math.floor(seconds / 60)).padStart(2, "0");
  const ss = String(seconds % 60).padStart(2, "0");
  return `${mm}:${ss}`;
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
    <div className="space-y-4">
      {/* Prompt */}
      <div className="flex items-center gap-3">
        <input
          ref={inputRef}
          type="text"
          value={prompt}
          onChange={(e) => onPromptChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Optional text prompt (e.g. wearing a red hat)…"
          disabled={!isRunning}
          className="flex-1 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-base text-[var(--ink)] placeholder:text-[var(--ink-faint)] transition-colors focus:border-[var(--ink-faint)] focus:outline-none focus:ring-1 focus:ring-[var(--ink-faint)] disabled:opacity-50"
        />
        <button
          onClick={() => setEnhance(!enhance)}
          disabled={!isRunning}
          aria-pressed={enhance}
          className={`rounded-lg border px-4 py-3 text-sm font-medium transition-colors disabled:opacity-50 ${
            enhance
              ? "border-[var(--ink)] bg-[var(--ink)] text-[var(--bg)]"
              : "border-[var(--border)] bg-[var(--surface)] text-[var(--ink-dim)] hover:text-[var(--ink)]"
          }`}
        >
          Enhance
        </button>
      </div>

      {/* Buttons */}
      <div className="flex flex-wrap items-center gap-3">
        <button
          onClick={isRunning ? onStop : onStart}
          disabled={isConnecting}
          className={`rounded-lg px-6 py-3 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
            isRunning
              ? "border border-[var(--accent)]/50 bg-[var(--accent-soft)] text-[var(--ink)] hover:bg-[var(--accent-soft)]/80"
              : "bg-[var(--ink)] text-[var(--bg)] hover:bg-white"
          }`}
        >
          {isConnecting
            ? "Connecting…"
            : isRunning
              ? "Stop"
              : "Start"}
        </button>

        <button
          onClick={onScreenshot}
          disabled={!isRunning}
          className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-sm text-[var(--ink-dim)] transition-colors hover:bg-[var(--surface-2)] hover:text-[var(--ink)] disabled:opacity-30"
        >
          Screenshot
        </button>

        <button
          onClick={onRecordToggle}
          disabled={!isRunning || (!isRecording && !canRecord)}
          className={`rounded-lg border px-4 py-3 text-sm transition-colors disabled:opacity-30 ${
            isRecording
              ? "border-[var(--accent)]/50 bg-[var(--accent-soft)] text-[var(--ink)]"
              : "border-[var(--border)] bg-[var(--surface)] text-[var(--ink-dim)] hover:bg-[var(--surface-2)] hover:text-[var(--ink)]"
          }`}
        >
          {isRecording ? (
            <span className="flex items-center gap-2">
              <span
                className="h-2 w-2 rounded-full pulse-soft"
                style={{ background: "var(--accent)" }}
              />
              Stop recording
            </span>
          ) : (
            <span className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-[var(--ink-faint)]" />
              Record
            </span>
          )}
        </button>

        {hasClip && !isRecording && (
          <button
            onClick={onShowClip}
            className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-sm text-[var(--ink-dim)] transition-colors hover:bg-[var(--surface-2)] hover:text-[var(--ink)]"
          >
            View clip
          </button>
        )}

        <button
          onClick={onPopOut}
          disabled={!isRunning}
          className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-sm text-[var(--ink-dim)] transition-colors hover:bg-[var(--surface-2)] hover:text-[var(--ink)] disabled:opacity-30"
        >
          Pop out
        </button>

        {isRunning && (
          <div className="ml-auto flex items-center gap-5 text-sm">
            <span className="font-mono text-[var(--ink-dim)]">
              {formatElapsed(elapsedSeconds)}
            </span>
            <span className="font-mono text-[var(--ink)]">
              ${cost}{" "}
              <span className="text-[var(--ink-faint)]">/ ${maxCost}</span>
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

export { type ControlsBarProps };
