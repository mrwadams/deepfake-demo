"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { createDecartClient, models } from "@decartai/sdk";
import type { RealTimeClient, ConnectionState } from "@decartai/sdk";
import { DECART_MODEL } from "@/lib/constants";

interface UseDecartRealtimeOptions {
  onRemoteStream: (stream: MediaStream) => void;
  onGenerationTick?: (seconds: number) => void;
}

export function useDecartRealtime({
  onRemoteStream,
  onGenerationTick,
}: UseDecartRealtimeOptions) {
  const [connectionState, setConnectionState] = useState<ConnectionState | "idle">("idle");
  const clientRef = useRef<RealTimeClient | null>(null);
  const onRemoteStreamRef = useRef(onRemoteStream);
  const onGenerationTickRef = useRef(onGenerationTick);

  useEffect(() => {
    onRemoteStreamRef.current = onRemoteStream;
  }, [onRemoteStream]);

  useEffect(() => {
    onGenerationTickRef.current = onGenerationTick;
  }, [onGenerationTick]);

  const connect = useCallback(
    async (token: string, localStream: MediaStream) => {
      setConnectionState("connecting");

      try {
        const decart = createDecartClient({ apiKey: token });
        const rtClient = await decart.realtime.connect(localStream, {
          model: models.realtime(DECART_MODEL),
          onRemoteStream: (stream) => {
            onRemoteStreamRef.current(stream);
          },
        });

        rtClient.on("connectionChange", (state) => {
          setConnectionState(state);
        });

        rtClient.on("generationTick", ({ seconds }) => {
          onGenerationTickRef.current?.(seconds);
        });

        rtClient.on("error", (err) => {
          console.error("[Decart]", err.message);
        });

        clientRef.current = rtClient;
        setConnectionState("connected");
        return rtClient;
      } catch (err) {
        console.error("[Decart] Connection failed:", err);
        setConnectionState("idle");
        throw err;
      }
    },
    []
  );

  const set = useCallback(
    async (input: {
      prompt?: string;
      image?: Blob | File | string | null;
      enhance?: boolean;
    }) => {
      if (clientRef.current) {
        await clientRef.current.set(input);
      }
    },
    []
  );

  const disconnect = useCallback(() => {
    if (clientRef.current) {
      clientRef.current.disconnect();
      clientRef.current = null;
    }
    setConnectionState("idle");
  }, []);

  const getSubscribeToken = useCallback((): string | null => {
    return clientRef.current?.subscribeToken ?? null;
  }, []);

  useEffect(() => {
    return () => {
      if (clientRef.current) {
        clientRef.current.disconnect();
        clientRef.current = null;
      }
    };
  }, []);

  return {
    connectionState,
    connect,
    set,
    disconnect,
    getSubscribeToken,
  };
}
