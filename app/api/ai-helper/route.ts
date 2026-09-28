const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const DEFAULT_MODEL = "openai/gpt-4o-mini";

export async function POST(request: Request) {
  const apiKey = process.env.OPENROUTER_API_KEY;

  if (!apiKey) {
    return Response.json(
      { error: "OpenRouter is not configured. Add OPENROUTER_API_KEY to your environment." },
      { status: 503 },
    );
  }

  let body: { message?: unknown };

  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Send a valid JSON request." }, { status: 400 });
  }

  const message = typeof body.message === "string" ? body.message.trim() : "";

  if (!message) {
    return Response.json({ error: "Ask a question to start the conversation." }, { status: 400 });
  }

  if (message.length > 1000) {
    return Response.json({ error: "Please keep questions under 1,000 characters." }, { status: 400 });
  }

  const isCasualMessage = /^(hi|hello|hey|thanks|thank you|good morning|good afternoon|good evening|how are you|what can you do)[!.?,\s]*$/i.test(
    message,
  );

  try {
    const completionResponse = await fetch(OPENROUTER_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "X-Title": "College Advisor",
      },
      body: JSON.stringify({
        model: process.env.OPENROUTER_MODEL || DEFAULT_MODEL,
        messages: [
          {
            role: "system",
            content:
              "You are College Advisor, a practical and careful college planning assistant. For questions needing current information, use the provided web search results and prefer official college, university, government, and application-system websites. Clearly say when information may change, and never invent deadlines, requirements, costs, or policies. Keep answers concise and cite useful sources.",
          },
          { role: "user", content: message },
        ],
        ...(isCasualMessage ? {} : { plugins: [{ id: "web" }] }),
        max_tokens: 700,
        stream: true,
      }),
      cache: "no-store",
    });

    if (!completionResponse.ok) {
      if (completionResponse.status === 429) {
        return Response.json(
          { error: "OpenRouter rate limits were reached. Wait a moment and try again." },
          { status: 429 },
        );
      }

      const completion = (await completionResponse.json().catch(() => null)) as {
        error?: { message?: string };
      } | null;
      console.error("OpenRouter request failed:", completion?.error?.message ?? completionResponse.statusText);
      return Response.json({ error: "OpenRouter could not complete the request. Check your API configuration and try again." }, { status: 502 });
    }

    if (!completionResponse.body) {
      return Response.json({ error: "OpenRouter did not return a response stream." }, { status: 502 });
    }

    return new Response(completionResponse.body, {
      headers: {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        "X-Accel-Buffering": "no",
      },
    });
  } catch (error) {
    console.error("OpenRouter request error:", error);
    return Response.json({ error: "The AI helper is unavailable. Please try again shortly." }, { status: 502 });
  }
}