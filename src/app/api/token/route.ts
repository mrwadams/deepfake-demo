import { createDecartClient } from "@decartai/sdk";
import { NextResponse } from "next/server";
import { TOKEN_TTL_SECONDS, DECART_MODEL } from "@/lib/constants";

const serverClient = createDecartClient({
  apiKey: process.env.DECART_API_KEY!,
});

export async function POST() {
  if (!process.env.DECART_API_KEY) {
    return NextResponse.json(
      { error: "DECART_API_KEY not configured" },
      { status: 500 }
    );
  }

  try {
    const token = await serverClient.tokens.create({
      expiresIn: TOKEN_TTL_SECONDS,
      allowedModels: [DECART_MODEL],
    });

    return NextResponse.json({
      apiKey: token.apiKey,
      expiresAt: token.expiresAt,
    });
  } catch {
    return NextResponse.json(
      { error: "Failed to generate token" },
      { status: 500 }
    );
  }
}
