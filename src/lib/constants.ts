export const DECART_MODEL = "lucy-2.1" as const;
export const MAX_SESSION_SECONDS = 300; // 5 min auto-disconnect
// TTL spans the full max session plus a buffer so the SDK never sees the
// initial token expire mid-stream. The SDK has no mid-session token-update API.
export const TOKEN_TTL_SECONDS = MAX_SESSION_SECONDS + 30;
export const COST_PER_SECOND = 0.02;
export const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB
export const SUBSCRIBE_TOKEN_CHANNEL = "deepfake-subscribe-token";
