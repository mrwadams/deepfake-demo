import { createDecartClient } from "@decartai/sdk";
import { NextRequest, NextResponse } from "next/server";
import { TOKEN_TTL_SECONDS, DECART_MODEL } from "@/lib/constants";

export async function POST(req: NextRequest) {
  let userApiKey: string | undefined;
  const body = await req.json().catch(() => null);
  if (body && typeof body.apiKey === "string" && body.apiKey.trim()) {
    userApiKey = body.apiKey.trim();
  }

  const apiKey = userApiKey || process.env.DECART_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "No Decart API key available. Provide one in Settings.", code: "NO_API_KEY" },
      { status: 400 }
    );
  }

  try {
    const client = createDecartClient({ apiKey });
    const token = await client.tokens.create({
      expiresIn: TOKEN_TTL_SECONDS,
      allowedModels: [DECART_MODEL],
    });

    return NextResponse.json({
      apiKey: token.apiKey,
      expiresAt: token.expiresAt,
    });
  } catch {
    // If the user supplied the key, the most likely cause is that it's wrong
    // or out of quota. Surface that distinctly so the UI can reopen the modal.
    if (userApiKey) {
      return NextResponse.json(
        { error: "Decart rejected this API key.", code: "INVALID_KEY" },
        { status: 401 }
      );
    }
    return NextResponse.json(
      { error: "Failed to generate token", code: "TOKEN_FAILED" },
      { status: 500 }
    );
  }
}
