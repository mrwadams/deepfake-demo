"use client";

import { useEffect, useCallback } from "react";

interface ClipModalProps {
  videoUrl: string;
  extension: string;
  onClose: () => void;
}

export function ClipModal({ videoUrl, extension, onClose }: ClipModalProps) {
  const handleDownload = () => {
    const a = document.createElement("a");
    a.href = videoUrl;
    a.download = `deepfake-${Date.now()}.${extension}`;
    a.click();
  };

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

  return (
    <div
      className="fade-up fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-3xl rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <video
          src={videoUrl}
          controls
          autoPlay
          className="w-full rounded-lg bg-black"
        />
        {extension === "webm" && (
          <p className="mt-3 text-xs text-[var(--ink-faint)]">
            Saved as .webm — your browser&apos;s MediaRecorder doesn&apos;t
            support MP4. Try Chrome 126+ for an MP4 download, or play this clip
            in VLC / Chrome.
          </p>
        )}
        <div className="mt-4 flex items-center justify-between gap-3">
          <span className="text-xs text-[var(--ink-faint)]">
            .{extension} · clip
          </span>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="rounded-lg px-4 py-2 text-sm text-[var(--ink-dim)] transition-colors hover:bg-[var(--surface-2)] hover:text-[var(--ink)]"
            >
              Close
            </button>
            <button
              onClick={handleDownload}
              className="rounded-lg bg-[var(--ink)] px-4 py-2 text-sm font-medium text-[var(--bg)] transition-colors hover:bg-white"
            >
              Download
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
