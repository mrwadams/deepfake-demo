import { createDecartClient } from "@decartai/sdk";
import { NextResponse } from "next/server";
import { TOKEN_TTL_SECONDS, DECART_MODEL } from "@/lib/constants";

const serverClient = createDecartClient({
  apiKey: process.env.DECART_API_KEY!,
});

export async function POST(request: Request) {
  if (!process.env.DECART_API_KEY) {
    return NextResponse.json(
      { error: "DECART_API_KEY not configured" },
      { status: 500 }
    );
  }

  // Password gate
  const demoPassword = process.env.DEMO_PASSWORD;
  if (demoPassword) {
    const { password } = await request.json().catch(() => ({ password: "" }));
    if (password !== demoPassword) {
      return NextResponse.json(
        { error: "Invalid password" },
        { status: 401 }
      );
    }
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
