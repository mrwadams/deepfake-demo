"use client";

import { useEffect, useCallback } from "react";

interface ScreenshotModalProps {
  imageUrl: string;
  onClose: () => void;
}

export function ScreenshotModal({ imageUrl, onClose }: ScreenshotModalProps) {
  const handleDownload = () => {
    const a = document.createElement("a");
    a.href = imageUrl;
    a.download = `deepfake-${Date.now()}.png`;
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
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={imageUrl}
          alt="Screenshot"
          className="w-full rounded-lg"
        />
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
