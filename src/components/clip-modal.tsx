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
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative max-w-3xl w-full mx-4 rounded-2xl bg-gray-900 p-4 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <video
          src={videoUrl}
          controls
          autoPlay
          className="w-full rounded-lg bg-black"
        />
        {extension === "webm" && (
          <p className="mt-3 text-xs text-white/40">
            Saved as .webm — your browser&apos;s MediaRecorder doesn&apos;t
            support MP4. Try Chrome 126+ for an MP4 download, or play this clip
            in VLC / Chrome.
          </p>
        )}
        <div className="mt-4 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="rounded-lg px-4 py-2 text-sm text-white/60 hover:bg-white/10 transition-colors"
          >
            Close
          </button>
          <button
            onClick={handleDownload}
            className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-500 transition-colors"
          >
            Download
          </button>
        </div>
      </div>
    </div>
  );
}
