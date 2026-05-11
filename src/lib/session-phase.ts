import type { ConnectionState } from "@decartai/sdk";

// Combined session lifecycle: local async prerequisites + SDK connection state.
// "idle"/"starting-webcam"/"fetching-token" are driven locally by handleStart;
// the remaining phases mirror @decartai/sdk's ConnectionState once we've handed
// off to realtime.connect().
export type SessionPhase =
  | "idle"
  | "starting-webcam"
  | "fetching-token"
  | "connecting"
  | "connected"
  | "generating"
  | "reconnecting"
  | "disconnected";

export type SessionAction =
  | { type: "START" }
  | { type: "WEBCAM_READY" }
  | { type: "TOKEN_READY" }
  | { type: "SDK_STATE"; state: ConnectionState | "idle" }
  | { type: "FAIL" }
  | { type: "STOP" };

const PRE_CONNECT: ReadonlySet<SessionPhase> = new Set([
  "idle",
  "starting-webcam",
  "fetching-token",
]);

export function sessionPhaseReducer(
  phase: SessionPhase,
  action: SessionAction
): SessionPhase {
  switch (action.type) {
    case "START":
      return phase === "idle" || phase === "disconnected"
        ? "starting-webcam"
        : phase;
    case "WEBCAM_READY":
      return phase === "starting-webcam" ? "fetching-token" : phase;
    case "TOKEN_READY":
      return phase === "fetching-token" ? "connecting" : phase;
    case "SDK_STATE":
      // The hook resets to "idle" on disconnect; STOP/FAIL alone should take
      // us back to the local idle state, so ignore that signal here.
      if (action.state === "idle") return phase;
      // Before handleStart has reached realtime.connect, SDK noise (e.g. a
      // stale "connecting" from a prior tear-down) must not pull us forward.
      if (PRE_CONNECT.has(phase)) return phase;
      return action.state;
    case "FAIL":
    case "STOP":
      return "idle";
  }
}

export const isConnectingPhase = (phase: SessionPhase): boolean =>
  phase === "starting-webcam" ||
  phase === "fetching-token" ||
  phase === "connecting";

export const isLivePhase = (phase: SessionPhase): boolean =>
  phase === "connected" || phase === "generating";
