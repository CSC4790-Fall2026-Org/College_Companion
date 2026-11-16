import { auth } from "@clerk/nextjs/server";
import { parseSavedSchools } from "@/lib/checklist";
import { getNeonSql } from "@/lib/neon";

export const runtime = "nodejs";

function logDatabaseError(error: unknown) {
  const message = error instanceof Error ? error.message : "Unknown database error.";
  const connectionString = process.env.DATABASE_URL;
  const safeMessage = connectionString
    ? message.replaceAll(connectionString, "[redacted connection string]")
    : message;

  console.error("Neon checklist request failed:", safeMessage);
}

function unavailableResponse() {
  return Response.json(
    {
      error:
        "Checklist storage is unavailable. Verify DATABASE_URL and apply the Neon checklist migration.",
    },
    { status: 503 },
  );
}

export async function GET() {
  const { userId } = await auth();

  if (!userId) {
    return Response.json({ error: "Sign in to load your checklist." }, { status: 401 });
  }

  try {
    const sql = getNeonSql();
    const rows = await sql`
      SELECT schools
      FROM public.college_checklists
      WHERE user_id = ${userId}
      LIMIT 1
    `;
    const checklist = rows[0];

    if (!checklist) {
      return Response.json({ schools: [] });
    }

    if (!("schools" in checklist)) {
      throw new Error("Neon did not return the saved checklist.");
    }

    return Response.json({ schools: checklist.schools });
  } catch (error) {
    logDatabaseError(error);
    return unavailableResponse();
  }
}

export async function PUT(request: Request) {
  const { userId } = await auth();

  if (!userId) {
    return Response.json({ error: "Sign in to save your checklist." }, { status: 401 });
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Send a valid JSON request." }, { status: 400 });
  }

  if (typeof body !== "object" || body === null || !("schools" in body)) {
    return Response.json({ error: "The request must include a college checklist." }, { status: 400 });
  }

  let schools: ReturnType<typeof parseSavedSchools>;

  try {
    schools = parseSavedSchools(body.schools);
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "The college checklist is invalid." },
      { status: 400 },
    );
  }

  const serializedSchools = JSON.stringify(schools);

  if (serializedSchools.length > 1_000_000) {
    return Response.json({ error: "The college checklist is too large to save." }, { status: 413 });
  }

  try {
    const sql = getNeonSql();
    const rows = await sql`
      INSERT INTO public.college_checklists (user_id, schools)
      VALUES (${userId}, ${serializedSchools}::jsonb)
      ON CONFLICT (user_id)
      DO UPDATE SET schools = EXCLUDED.schools, updated_at = NOW()
      RETURNING user_id
    `;

    if (!rows[0] || rows[0].user_id !== userId) {
      throw new Error("Neon did not confirm the checklist update.");
    }

    return Response.json({ saved: true });
  } catch (error) {
    logDatabaseError(error);
    return unavailableResponse();
  }
}
