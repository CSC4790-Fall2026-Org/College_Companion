import Groq from "groq-sdk";

const GROQ_MODEL = "openai/gpt-oss-120b";

export async function POST(request: Request) {
  const apiKey = process.env.GROQ_API_KEY;

  if (!apiKey) {
    return Response.json(
      { error: "Groq is not configured. Add GROQ_API_KEY to your environment." },
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
    const groq = new Groq({ apiKey });
    const completion = await groq.chat.completions.create({
      model: GROQ_MODEL,
      messages: [
        {
          role: "system",
          content:
            "You are College Advisor, a practical and careful college planning assistant. Use Browser Search for current information. Prefer official college, university, government, and application-system websites. Clearly say when information may change, and never invent deadlines, requirements, costs, or policies. Keep answers concise and include useful source context.",
        },
        { role: "user", content: message },
      ],
      ...(isCasualMessage ? {} : { tools: [{ type: "browser_search" as const }] }),
      max_completion_tokens: 700,
    });

    const responseMessage = completion.choices[0]?.message;
    const answer = responseMessage?.content?.trim();

    if (!answer) {
      return Response.json({ error: "Groq returned an empty answer. Try asking another way." }, { status: 502 });
    }

    const citations = (responseMessage?.executed_tools ?? [])
      .flatMap((tool) => tool.browser_results ?? [])
      .filter((source) => Boolean(source.url))
      .map((source) => ({ title: source.title || source.url, uri: source.url }));

    return Response.json({ answer, citations });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "";
    const errorStatus =
      typeof error === "object" && error !== null && "status" in error && typeof error.status === "number"
        ? error.status
        : undefined;

    if (errorStatus === 429 || /quota|rate limit|too many requests/i.test(errorMessage)) {
      return Response.json(
        { error: "Groq rate limits were reached. Wait a moment and try again." },
        { status: 429 },
      );
    }

    return Response.json(
      { error: errorMessage || "The AI helper is unavailable. Please try again shortly." },
      { status: 502 },
    );
  }
}