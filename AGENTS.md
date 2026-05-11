<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Agent guide

## What this app does

Real-time webcam face-swap demo on top of the Decart AI realtime SDK (`@decartai/sdk`, model `lucy_2_rt`). See `README.md` for user-facing details.

## Project layout

```
src/
  app/
    api/token/route.ts   POST endpoint: mints a short-lived Decart client token
    output/page.tsx      Clean fullscreen view for OBS, subscribes to active session
    page.tsx             Renders <DeepfakeApp />
    layout.tsx           Root layout
  components/            UI: video display, face gallery, controls, status, modal
  hooks/
    use-decart-realtime  Wraps decart.realtime.connect, holds RealTimeClient ref
    use-token            Fetches /api/token, auto-refreshes before expiry
    use-webcam           getUserMedia wrapper
  lib/
    constants.ts         DECART_MODEL, TOKEN_TTL, MAX_SESSION_SECONDS, COST_PER_SECOND
    faces.ts             Preset reference faces (loaded from /public/faces)
    session-phase.ts     SessionPhase enum + reducer driving status UI
  types/index.ts
public/faces/            Preset face images
```

## Architecture notes worth knowing before editing

- **Token flow.** The server-side `DECART_API_KEY` never reaches the browser. `/api/token` uses it to call `serverClient.tokens.create({ expiresIn, allowedModels })` and returns a scoped token. `useToken` schedules an auto-refresh `TOKEN_REFRESH_BUFFER_SECONDS` before expiry while a session is active.
- **Connect sequence.** `handleStart` runs the full lifecycle in one async function: `webcam.start()` returns the `MediaStream`, then `token.activate()`, then `realtime.connect(apiKey, stream)`. Each step dispatches into the `sessionPhaseReducer` (`START → WEBCAM_READY → TOKEN_READY`), and the SDK's own `connectionState` is folded in via a `SDK_STATE` action once we've handed off. `StatusIndicator` reads the phase directly, so the UI distinguishes "Starting webcam" / "Authenticating" / "Connecting" rather than one generic "Connecting". A `startInFlightRef` guards same-tick re-entry (button + space-bar) since reducer state only updates on re-render.
- **Live updates.** Changing the face or prompt calls `rtClient.set({ prompt, image, enhance })`. `currentTransformRef` keeps the last-applied prompt+image so partial updates (face only / prompt only) preserve the other field.
- **Session cap.** `MAX_SESSION_SECONDS` auto-disconnects to bound spend. `COST_PER_SECOND` is displayed in the header; update both together if pricing changes.
- **WebRTC backgrounding.** `use-decart-realtime` acquires a Web Lock (`navigator.locks.request`) for the duration of a session. This is a workaround for browser throttling of WebRTC when the tab is backgrounded — don't remove it without testing background behaviour (see commit `698d80c`).
- **Pop-out / OBS.** The main page exposes the Decart subscribe token via `window.__subscribeToken`. `/output` reads it from `window.opener` and calls `client.realtime.subscribe({ token, onRemoteStream })`. Cross-origin opener access will fail silently — only same-origin pop-outs work.

## Conventions

- Server-only secrets live in env vars (`DECART_API_KEY`), never in client bundles. Anything imported by a `"use client"` file ends up in the browser.
- Keep model / TTL / limit values in `src/lib/constants.ts` rather than scattering literals.
- Tailwind v4 (via `@tailwindcss/postcss`); class names only, no separate CSS modules.
- Path alias `@/*` maps to `src/*`.

## Environment

| Variable          | Required | Notes                                              |
| ----------------- | -------- | -------------------------------------------------- |
| `DECART_API_KEY`  | yes      | Server-side only. Used by `/api/token`.            |

## Deployment

Vercel. Access protection is handled by Vercel Deployment Protection — there is no in-app password gate. Don't reintroduce one without checking with the user (it was removed deliberately, see commit `9ab2fac`).
