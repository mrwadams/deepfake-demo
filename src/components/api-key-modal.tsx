"use client";

import { useEffect, useCallback, useState } from "react";

interface ApiKeyModalProps {
  initialValue: string;
  hasStoredKey: boolean;
  errorMessage?: string | null;
  onSave: (apiKey: string) => void;
  onClear: () => void;
  onClose: () => void;
}

export function ApiKeyModal({
  initialValue,
  hasStoredKey,
  errorMessage,
  onSave,
  onClear,
  onClose,
}: ApiKeyModalProps) {
  const [value, setValue] = useState(initialValue);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    },
    [onClose]
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  const handleSave = () => {
    const trimmed = value.trim();
    if (!trimmed) return;
    onSave(trimmed);
  };

  return (
    <div
      className="fade-up fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-md rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-semibold text-[var(--ink)]">
          Decart API key
        </h2>
        <p className="mt-1.5 text-sm text-[var(--ink-dim)]">
          Bring your own key to run a session. It&apos;s kept in this
          browser&apos;s local storage and sent to the server only to mint a
          short-lived session token.
        </p>

        {errorMessage && (
          <div
            role="alert"
            className="mt-4 rounded-lg border border-[var(--accent)]/40 bg-[var(--accent-soft)] px-3 py-2 text-sm text-[var(--ink)]"
          >
            {errorMessage}
          </div>
        )}

        <label
          htmlFor="api-key-input"
          className="mt-5 block text-xs font-medium text-[var(--ink-dim)]"
        >
          API key
        </label>
        <input
          id="api-key-input"
          type="password"
          autoFocus
          autoComplete="off"
          spellCheck={false}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              handleSave();
            }
          }}
          placeholder="dct_…"
          className="mt-1.5 w-full rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2.5 font-mono text-sm text-[var(--ink)] placeholder:text-[var(--ink-faint)] focus:border-[var(--ink-faint)] focus:outline-none focus:ring-1 focus:ring-[var(--ink-faint)]"
        />

        <div className="mt-6 flex items-center justify-between gap-3">
          {hasStoredKey ? (
            <button
              onClick={onClear}
              className="rounded-lg px-3 py-2 text-sm text-[var(--ink-dim)] transition-colors hover:bg-[var(--surface-2)] hover:text-[var(--ink)]"
            >
              Clear stored key
            </button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="rounded-lg px-4 py-2 text-sm text-[var(--ink-dim)] transition-colors hover:bg-[var(--surface-2)] hover:text-[var(--ink)]"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={!value.trim()}
              className="rounded-lg bg-[var(--ink)] px-4 py-2 text-sm font-medium text-[var(--bg)] transition-colors hover:bg-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
