import assert from "node:assert/strict";
import { afterEach, beforeEach, test } from "node:test";
import { POST } from "../app/api/ai-helper/route.ts";

const originalApiKey = process.env.OPENROUTER_API_KEY;

beforeEach(() => {
  process.env.OPENROUTER_API_KEY = "test-api-key";
});

afterEach(() => {
  if (originalApiKey === undefined) {
    delete process.env.OPENROUTER_API_KEY;
  } else {
    process.env.OPENROUTER_API_KEY = originalApiKey;
  }
});

function createRequest(message) {
  return new Request("http://localhost/api/ai-helper", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message }),
  });
}

test("returns a helpful error for a blank entry", async () => {
  const response = await POST(createRequest("   "));

  assert.equal(response.status, 400);
  assert.deepEqual(await response.json(), {
    error: "Ask a question to start the conversation.",
  });
});

test("returns a helpful error when the entry exceeds 1,000 characters", async () => {
  const response = await POST(createRequest("a".repeat(1001)));

  assert.equal(response.status, 400);
  assert.deepEqual(await response.json(), {
    error: "Please keep questions under 1,000 characters.",
  });
});