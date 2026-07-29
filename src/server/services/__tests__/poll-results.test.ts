import assert from "node:assert";
import type { IncomingMessage } from "node:http";
import { Readable } from "node:stream";
import { test } from "node:test";
import { VoteController } from "../../controllers/vote-controller.ts";
import { Database } from "../../utils/db.ts";
import { PollService } from "../polls.ts";
import { VoteService } from "../vote.ts";

const emptyRequest = (): IncomingMessage =>
  Readable.from([]) as IncomingMessage;

const setupDatabase = (): Database => {
  process.env.NODE_ENV = "test";
  process.env.SQLITE_DATABASE_PATH = ":memory:";

  const database = Database.getInstance();
  database.setupTables(false);
  return database;
};

test("single-choice results use completed ballots as the total", async () => {
  setupDatabase();
  const poll = await PollService.getInstance().createPoll({
    question: "Pick one result",
    options: ["First", "Second"],
    is_multiple_choice: false,
  });
  const pollId = poll.data!.id!;

  await VoteService.getInstance().castVote(
    pollId,
    [1],
    5001,
  );

  const response = await VoteService.getInstance().getPollResults(pollId);

  assert.strictEqual(response.success, true);
  assert.deepStrictEqual(response.data, {
    total_ballots: 1,
    total_selections: 1,
    options: [
      {
        option_id: 1,
        selection_count: 1,
        percentage: 100,
      },
    ],
  });

  const controllerResponse = await new VoteController().getPollResults(
    { pollId: String(pollId) },
    emptyRequest(),
  );
  assert.deepStrictEqual(controllerResponse, {
    success: true,
    data: response.data,
  });
});

test("multiple-choice results count overlapping selections per ballot", async () => {
  setupDatabase();
  const poll = await PollService.getInstance().createPoll({
    question: "Pick overlapping results",
    options: ["First", "Second", "Third"],
    is_multiple_choice: true,
  });
  const pollId = poll.data!.id!;
  const voteService = VoteService.getInstance();

  await voteService.castVote(pollId, [0, 1], 5101);
  await voteService.castVote(pollId, [1, 2], 5102);

  const serviceResponse = await voteService.getPollResults(pollId);

  assert.strictEqual(serviceResponse.success, true);
  assert.deepStrictEqual(serviceResponse.data, {
    total_ballots: 2,
    total_selections: 4,
    options: [
      {
        option_id: 0,
        selection_count: 1,
        percentage: 50,
      },
      {
        option_id: 1,
        selection_count: 2,
        percentage: 100,
      },
      {
        option_id: 2,
        selection_count: 1,
        percentage: 50,
      },
    ],
  });

  const controllerResponse = await new VoteController().getPollResults(
    { pollId: String(pollId) },
    emptyRequest(),
  );
  assert.deepStrictEqual(controllerResponse, {
    success: true,
    data: serviceResponse.data,
  });
});

test("results return zero completed ballots when no votes exist", async () => {
  setupDatabase();
  const poll = await PollService.getInstance().createPoll({
    question: "No results yet",
    options: ["First", "Second"],
    is_multiple_choice: true,
  });

  const response = await VoteService.getInstance().getPollResults(
    poll.data!.id!,
  );

  assert.deepStrictEqual(response.data, {
    total_ballots: 0,
    total_selections: 0,
    options: [],
  });

  const controllerResponse = await new VoteController().getPollResults(
    { pollId: String(poll.data!.id!) },
    emptyRequest(),
  );
  assert.deepStrictEqual(controllerResponse, {
    success: true,
    data: response.data,
  });
});

test("migrated legacy selections are counted as completed ballots", async () => {
  const database = setupDatabase();
  const poll = await PollService.getInstance().createPoll({
    question: "Legacy results",
    options: ["First", "Second"],
    is_multiple_choice: true,
  });
  const pollId = poll.data!.id!;
  const firstBallot = database.db
    .prepare(
      `INSERT INTO ballots (poll_id, user_id, voter_key)
       VALUES (?, ?, NULL)`,
    )
    .run(pollId, "legacy-user");
  const secondBallot = database.db
    .prepare(
      `INSERT INTO ballots (poll_id, user_id, voter_key)
       VALUES (?, ?, NULL)`,
    )
    .run(pollId, "legacy-user");
  const insertVote = database.db.prepare(
    `INSERT INTO votes (ballot_id, poll_id, option_id, user_id)
     VALUES (?, ?, ?, ?)`,
  );
  insertVote.run(firstBallot.lastInsertRowid, pollId, 0, "legacy-user");
  insertVote.run(secondBallot.lastInsertRowid, pollId, 1, "legacy-user");

  const response = await VoteService.getInstance().getPollResults(pollId);

  assert.deepStrictEqual(response.data, {
    total_ballots: 2,
    total_selections: 2,
    options: [
      {
        option_id: 0,
        selection_count: 1,
        percentage: 50,
      },
      {
        option_id: 1,
        selection_count: 1,
        percentage: 50,
      },
    ],
  });
});
