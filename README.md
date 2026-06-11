# Deepfake Demo

Built for security-awareness sessions to show executives, in the room, how convincing real-time face-swap has become — so the threat lands as something they've watched happen to themselves, not an abstract risk.

A real-time webcam face-swap demo built on the [Decart AI](https://decart.ai) realtime SDK (`lucy_2_rt`). The browser captures the webcam, streams it to Decart over WebRTC, and renders the transformed video back. A reference face image and/or text prompt steers the transform.

## How it works

1. The browser requests a short-lived Decart token from `/api/token` (the long-lived `DECART_API_KEY` stays on the server).
2. `useDecartRealtime` opens a WebRTC session with `decart.realtime.connect`, sending the local `MediaStream` and receiving the transformed remote stream.
3. Selecting a preset face or submitting a prompt calls `rtClient.set({ prompt, image, enhance })` to update the transform live.
4. Sessions auto-stop at `MAX_SESSION_SECONDS` (5 min) to cap spend at ~`MAX_SESSION_SECONDS * COST_PER_SECOND`.
5. `/output` is a clean fullscreen view for OBS capture; it subscribes to the active session via a subscribe token shared through `window.opener.__subscribeToken`.

## Prerequisites

- Node.js (matching `next@16` requirements)
- A Decart API key (`DECART_API_KEY`)
- A browser with webcam access

## Setup

```bash
npm install
echo "DECART_API_KEY=sk_..." > .env.local
npm run dev
```

Open <http://localhost:3000>.

## Environment variables

| Variable          | Where         | Purpose                                                      |
| ----------------- | ------------- | ------------------------------------------------------------ |
| `DECART_API_KEY`  | server only   | Long-lived key used by `/api/token` to mint scoped, short-lived client tokens. Never exposed to the browser. |

## Scripts

- `npm run dev` — Next.js dev server
- `npm run build` — production build
- `npm start` — run the production build
- `npm run lint` — ESLint

## Keyboard shortcuts

- `Space` — start / stop the session
- `S` — capture a screenshot of the transformed video

## Deployment

Hosted on Vercel. Access is gated by [Vercel Deployment Protection](https://vercel.com/docs/deployment-protection); there is no in-app password gate. Set `DECART_API_KEY` in the Vercel project's environment variables.
