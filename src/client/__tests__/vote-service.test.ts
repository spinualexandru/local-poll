import assert from "node:assert";
import { test } from "node:test";
import {
  castVote,
  getOrCreateVoterToken,
  getPollResults,
} from "../public/services/vote.mjs";

test("castVote sends all selected option IDs in one request", async (context) => {
  const originalFetch = globalThis.fetch;
  let requestBody = "";

  globalThis.fetch = async (_input, init) => {
    requestBody = String(init?.body);
    return new Response(JSON.stringify({ success: true }));
  };
  context.after(() => {
    globalThis.fetch = originalFetch;
  });

  const response = await castVote(
    "12",
    [0, 2],
    "550e8400-e29b-41d4-a716-446655440000",
  );

  assert.deepStrictEqual(JSON.parse(requestBody), {
    pollId: "12",
    optionIds: [0, 2],
    voterToken: "550e8400-e29b-41d4-a716-446655440000",
  });
  assert.deepStrictEqual(response, { success: true });
});

test("getOrCreateVoterToken persists and reuses an opaque browser token", () => {
  const values = new Map<string, string>();
  const storage: Pick<Storage, "getItem" | "setItem"> = {
    getItem(key: string) {
      return values.get(key) ?? null;
    },
    setItem(key: string, value: string) {
      values.set(key, value);
    },
  };
  let generated = 0;
  const cryptoApi: Pick<Crypto, "randomUUID"> = {
    randomUUID() {
      generated += 1;
      return "550e8400-e29b-41d4-a716-446655440000";
    },
  };

  assert.strictEqual(
    getOrCreateVoterToken(storage, cryptoApi),
    "550e8400-e29b-41d4-a716-446655440000",
  );
  assert.strictEqual(
    getOrCreateVoterToken(storage, cryptoApi),
    "550e8400-e29b-41d4-a716-446655440000",
  );
  assert.strictEqual(generated, 1);
});

test("getPollResults requests the server aggregate endpoint", async (context) => {
  const originalFetch = globalThis.fetch;
  let requestedUrl = "";

  globalThis.fetch = async (input) => {
    requestedUrl = String(input);
    return new Response(
      JSON.stringify({
        success: true,
        data: {
          total_ballots: 0,
          total_selections: 0,
          options: [],
        },
      }),
    );
  };
  context.after(() => {
    globalThis.fetch = originalFetch;
  });

  const response = await getPollResults("17");

  assert.strictEqual(requestedUrl, "/api/vote/results?pollId=17");
  assert.deepStrictEqual(response, {
    success: true,
    data: {
      total_ballots: 0,
      total_selections: 0,
      options: [],
    },
  });
});
