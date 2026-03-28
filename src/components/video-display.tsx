"use client";

import { useRef, useEffect } from "react";

interface VideoDisplayProps {
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  isLive: boolean;
}

function VideoPanel({
  stream,
  label,
  mirror,
  glow,
}: {
  stream: MediaStream | null;
  label: string;
  mirror?: boolean;
  glow?: boolean;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  return (
    <div className="flex flex-1 flex-col items-center gap-2">
      <div
        className={`relative w-full overflow-hidden rounded-xl border border-white/10 bg-black ${
          glow ? "ring-2 ring-violet-500/50 shadow-[0_0_30px_rgba(139,92,246,0.3)]" : ""
        }`}
      >
        {stream ? (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className={`aspect-video w-full object-cover ${
              mirror ? "scale-x-[-1]" : ""
            }`}
          />
        ) : (
          <div className="flex aspect-video w-full items-center justify-center">
            <div className="text-white/30 text-sm">No video</div>
          </div>
        )}
      </div>
      <span className="text-xs font-medium text-white/50 uppercase tracking-wider">
        {label}
      </span>
    </div>
  );
}

export function VideoDisplay({
  localStream,
  remoteStream,
  isLive,
}: VideoDisplayProps) {
  return (
    <div className="flex flex-col gap-4 md:flex-row md:gap-6">
      <VideoPanel stream={localStream} label="You" mirror />
      <VideoPanel stream={remoteStream} label="Deepfake" glow={isLive} />
    </div>
  );
}
