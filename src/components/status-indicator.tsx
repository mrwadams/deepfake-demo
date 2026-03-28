"use client";

import type { ConnectionState } from "@decartai/sdk";

interface StatusIndicatorProps {
  state: ConnectionState | "idle";
}

const STATE_CONFIG: Record<
  string,
  { label: string; color: string; pulse: boolean }
> = {
  idle: { label: "Ready", color: "bg-gray-500", pulse: false },
  connecting: { label: "Connecting", color: "bg-yellow-500", pulse: true },
  connected: { label: "Connected", color: "bg-blue-500", pulse: false },
  generating: { label: "LIVE", color: "bg-green-500", pulse: true },
  reconnecting: { label: "Reconnecting", color: "bg-yellow-500", pulse: true },
  disconnected: { label: "Disconnected", color: "bg-red-500", pulse: false },
};

export function StatusIndicator({ state }: StatusIndicatorProps) {
  const config = STATE_CONFIG[state] ?? STATE_CONFIG.idle;

  return (
    <div className="flex items-center gap-2">
      <span className="relative flex h-3 w-3">
        {config.pulse && (
          <span
            className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-75 ${config.color}`}
          />
        )}
        <span
          className={`relative inline-flex h-3 w-3 rounded-full ${config.color}`}
        />
      </span>
      <span className="text-sm font-semibold text-white/80">
        {config.label}
      </span>
    </div>
  );
}
