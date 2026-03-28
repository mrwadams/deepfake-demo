export interface PresetFace {
  id: string;
  name: string;
  path: string;
  prompt: string;
}

export interface TokenResponse {
  apiKey: string;
  expiresAt: string;
}

export interface TransformState {
  prompt: string;
  image: File | Blob | null;
  enhance: boolean;
}
