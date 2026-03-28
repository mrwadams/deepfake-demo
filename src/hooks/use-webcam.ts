"use client";

import { useState, useCallback, useRef, useEffect } from "react";

export function useWebcam() {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isActive, setIsActive] = useState(false);
  const streamRef = useRef<MediaStream | null>(null);

  const start = useCallback(async () => {
    try {
      setError(null);
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          frameRate: { ideal: 30 },
        },
        audio: false,
      });
      streamRef.current = mediaStream;
      setStream(mediaStream);
      setIsActive(true);
    } catch (err) {
      if (err instanceof DOMException && err.name === "NotAllowedError") {
        setError("Camera access denied. Please allow camera access and try again.");
      } else {
        setError("Failed to access camera. Please check your device.");
      }
      setIsActive(false);
    }
  }, []);

  const stop = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setStream(null);
    setIsActive(false);
  }, []);

  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, []);

  return { stream, error, isActive, start, stop };
}
