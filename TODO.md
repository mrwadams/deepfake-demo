# TODO

Running list of improvements for the deepfake demo. Tick items off as they land; add notes inline when context matters.

## UX / product

_(none open)_

## Robustness

_(none open)_

## Code quality

_(none open)_

## Security / cost

- [ ] **Rate-limit `/api/token`.** No limiter today. Even brief public exposure could let a script mint tokens until the Decart bill is interesting. Add a per-IP token bucket (Vercel KV / Upstash).
- [ ] **Server-side session accounting.** `MAX_SESSION_SECONDS` is enforced client-side and trivially bypassable. If cost matters, track per-IP daily usage on the server as a backstop to Deployment Protection.

## Done

_(move items here when complete, with the commit SHA for context)_

- [x] **Countdown to auto-stop.** Live countdown with progress bar replacing the static "auto-stop at $X" text. (`837c52e`)
- [x] **Custom face upload.** Drag-and-drop slot in the face gallery with `MAX_IMAGE_SIZE_BYTES` validation and a Decart-upload note. (`183da68`)
- [x] **Clip recording.** `MediaRecorder` on the remote stream produces a downloadable clip alongside the existing screenshot. (`9418581`)
- [x] **Mirror toggle for the local preview.** Default mirrored; small flip button overlaid on the local panel toggles it. Remote panel and `/output` stay un-mirrored. (`8d7aa62`)
- [x] **Stop relying on `videos[1]` for screenshots.** `handleScreenshot` now reads from `remoteVideoRef.current`, with the ref passed through `VideoDisplay`. (`4f0b03e`)
- [x] **Surface SDK errors during a live session.** Originally framed as "surface token-refresh failures," but exploration showed the SDK consumes the apiKey only once at WebRTC connect and exposes no mid-session refresh API — so `useToken`'s auto-refresh was dead code. Fix: bump `TOKEN_TTL_SECONDS` to `MAX_SESSION_SECONDS + 30` so the initial token outlives the session; surface SDK error events via `realtime.lastError` in the existing banner; drop the dead auto-refresh. (`761bbca`)
- [x] **Tidy `handleStart`.** Removed the misleading two-line comment; the reactive connect lives in the `useEffect` below and the function name is honest. (`761bbca`)
- [x] **Make pop-out failures visible.** `/output` now uses a `BroadcastChannel` to receive the subscribe token from the main page when `window.opener` isn't usable, with a 2s timeout and a clearer "no active session" message. `window.opener` stays as the synchronous fast path. (`761bbca`)
- [x] **`useReducer` for the session lifecycle.** Added `src/lib/session-phase.ts` with `idle → starting-webcam → fetching-token → connecting → connected → generating` (plus `reconnecting` / `disconnected`). SDK state syncs in via a `SDK_STATE` action. `StatusIndicator` shows the per-phase label ("Starting webcam", "Authenticating", "Connecting", …) instead of one generic "Connecting". `startInFlightRef` stays purely as a synchronous re-entry guard since reducer state only updates on re-render.
- [x] **Kill all three `eslint-disable-next-line react-hooks/exhaustive-deps` in `deepfake-app.tsx`.** Connect-on-stream: `useWebcam.start()` now returns the `MediaStream`, so `handleStart` chains `webcam.start → token.activate → realtime.connect` directly — the `useEffect` watching `webcam.stream` and the `connectingRef` are gone (a `startInFlightRef` guards overlap). Keyboard handler + auto-disconnect: both effects now read state and handlers from a shared `latestRef` updated each render, so they install once with empty deps. (`0345ad6`, `ffc6990`)
