import assert from "node:assert";
import { Readable } from "node:stream";
import type { IncomingMessage } from "node:http";
import { test } from "node:test";
import { VoteController } from "../../controllers/vote-controller.ts";
import { PollService } from "../polls.ts";
import { VoteService } from "../vote.ts";
import { Database } from "../../utils/db.ts";

const castVoteRequest = (body: unknown): IncomingMessage =>
  Readable.from([Buffer.from(JSON.stringify(body))]) as IncomingMessage;

test("multiple selections are stored as one atomic ballot", async () => {
  process.env.NODE_ENV = "test";
  process.env.SQLITE_DATABASE_PATH = ":memory:";

  const database = Database.getInstance();
  database.setupTables(false);

  const poll = await PollService.getInstance().createPoll({
    question: "Pick some",
    options: ["First", "Second", "Third"],
    is_multiple_choice: true,
  });
  const pollId = poll.data!.id!;

  const request = Readable.from([
    Buffer.from(JSON.stringify({ pollId, optionIds: [0, 2], userId: 42 })),
  ]) as IncomingMessage;
  const response = await new VoteController().castVote({}, request, {
    "content-type": "application/json",
  });

  assert.strictEqual(response.success, true);
  assert.strictEqual(response.data?.length, 2);
  assert.deepStrictEqual(
    response.data?.map((vote) => vote.option_id),
    [0, 2],
  );
  assert.strictEqual(response.data?.[0].ballot_id, response.data?.[1].ballot_id);

  const storedVotes = database.db
    .prepare(
      `SELECT ballot_id, option_id
       FROM votes
       WHERE poll_id = ?
       ORDER BY option_id`,
    )
    .all(pollId) as { ballot_id: number; option_id: number }[];
  assert.deepStrictEqual(
    storedVotes.map((vote) => vote.option_id),
    [0, 2],
  );
  assert.strictEqual(storedVotes[0].ballot_id, storedVotes[1].ballot_id);

  const failingPoll = await PollService.getInstance().createPoll({
    question: "Roll it back",
    options: ["First", "Second"],
    is_multiple_choice: true,
  });
  const failingPollId = failingPoll.data!.id!;
  database.db.exec(`
    CREATE TRIGGER fail_second_vote
    BEFORE INSERT ON votes
    WHEN NEW.poll_id = ${failingPollId} AND NEW.option_id = 1
    BEGIN
      SELECT RAISE(ABORT, 'forced vote insert failure');
    END
  `);

  await assert.rejects(
    VoteService.getInstance().castVote(failingPollId, [0, 1], 42),
    /forced vote insert failure/,
  );

  const voteCount = database.db
    .prepare("SELECT COUNT(*) AS count FROM votes WHERE poll_id = ?")
    .get(failingPollId);
  const ballotCount = database.db
    .prepare("SELECT COUNT(*) AS count FROM ballots WHERE poll_id = ?")
    .get(failingPollId);
  assert.strictEqual(Number(voteCount?.count), 0);
  assert.strictEqual(Number(ballotCount?.count), 0);
});

test("controller accepts option zero in plural and legacy singular payloads", async () => {
  const pollService = PollService.getInstance();
  const pluralPoll = await pollService.createPoll({
    question: "Plural zero",
    options: ["First", "Second"],
    is_multiple_choice: false,
  });
  const singularPoll = await pollService.createPoll({
    question: "Singular zero",
    options: ["First", "Second"],
    is_multiple_choice: false,
  });
  const stringPoll = await pollService.createPoll({
    question: "Canonical numeric strings",
    options: ["First", "Second"],
    is_multiple_choice: false,
  });
  const controller = new VoteController();

  const pluralResponse = await controller.castVote(
    {},
    castVoteRequest({
      pollId: pluralPoll.data!.id!,
      optionIds: [0],
      userId: 1001,
    }),
    { "content-type": "application/json" },
  );
  const singularResponse = await controller.castVote(
    {},
    castVoteRequest({
      pollId: singularPoll.data!.id!,
      optionId: 0,
      userId: 1002,
    }),
    { "content-type": "application/json" },
  );
  const stringResponse = await controller.castVote(
    {},
    castVoteRequest({
      pollId: String(stringPoll.data!.id!),
      optionId: "0",
      userId: "1003",
    }),
    { "content-type": "application/json" },
  );

  assert.strictEqual(pluralResponse.success, true);
  assert.strictEqual(pluralResponse.data?.[0].option_id, 0);
  assert.strictEqual(singularResponse.success, true);
  assert.strictEqual(singularResponse.data?.[0].option_id, 0);
  assert.strictEqual(stringResponse.success, true);
  assert.strictEqual(stringResponse.data?.[0].option_id, 0);
});

test("controller rejects malformed and ambiguous vote IDs", async () => {
  const poll = await PollService.getInstance().createPoll({
    question: "Strict IDs",
    options: ["First", "Second"],
    is_multiple_choice: false,
  });
  const pollId = poll.data!.id!;
  const controller = new VoteController();
  const malformedPollIds = [
    0,
    -1,
    1.5,
    "",
    " 1",
    "01",
    "1e0",
    null,
    true,
  ];
  const malformedOptionIds = [
    -1,
    0.5,
    "",
    " 0",
    "00",
    "0.0",
    "0e0",
    null,
    false,
  ];
  const malformedUserIds = [
    0,
    -1,
    1.5,
    "",
    " 1",
    "01",
    "1e0",
    null,
    true,
  ];

  for (const malformedPollId of malformedPollIds) {
    const response = await controller.castVote(
      {},
      castVoteRequest({
        pollId: malformedPollId,
        optionIds: [0],
        userId: 2001,
      }),
      { "content-type": "application/json" },
    );
    assert.strictEqual(
      response.success,
      false,
      `pollId ${JSON.stringify(malformedPollId)} should be rejected`,
    );
  }

  for (const malformedOptionId of malformedOptionIds) {
    const response = await controller.castVote(
      {},
      castVoteRequest({
        pollId,
        optionIds: [malformedOptionId],
        userId: 2002,
      }),
      { "content-type": "application/json" },
    );
    assert.strictEqual(
      response.success,
      false,
      `optionId ${JSON.stringify(malformedOptionId)} should be rejected`,
    );
  }

  for (const malformedUserId of malformedUserIds) {
    const response = await controller.castVote(
      {},
      castVoteRequest({
        pollId,
        optionIds: [0],
        userId: malformedUserId,
      }),
      { "content-type": "application/json" },
    );
    assert.strictEqual(
      response.success,
      false,
      `userId ${JSON.stringify(malformedUserId)} should be rejected`,
    );
  }

  const nonArrayResponse = await controller.castVote(
    {},
    castVoteRequest({
      pollId,
      optionIds: 0,
      userId: 2003,
    }),
    { "content-type": "application/json" },
  );
  assert.strictEqual(nonArrayResponse.success, false);
  assert.strictEqual(nonArrayResponse.error, "optionIds must be an array");
});

test("vote service validates IDs independently of the controller", async () => {
  const poll = await PollService.getInstance().createPoll({
    question: "Service validation",
    options: ["First", "Second"],
    is_multiple_choice: false,
  });
  const pollId = poll.data!.id!;
  const voteService = VoteService.getInstance();

  for (const invalidPollId of [0, -1, 1.5, NaN, Infinity]) {
    const response = await voteService.castVote(
      invalidPollId,
      [0],
      3001,
    );
    assert.strictEqual(response.success, false);
    assert.strictEqual(response.error, "Invalid poll ID");
  }

  for (const invalidOptionId of [-1, 0.5, NaN, Infinity]) {
    const response = await voteService.castVote(
      pollId,
      [invalidOptionId],
      3002,
    );
    assert.strictEqual(response.success, false);
    assert.strictEqual(response.error, "Invalid option IDs");
  }

  for (const invalidUserId of [0, -1, 1.5, NaN, Infinity]) {
    const response = await voteService.castVote(
      pollId,
      [0],
      invalidUserId,
    );
    assert.strictEqual(response.success, false);
    assert.strictEqual(response.error, "Invalid user ID");
  }
});

test("single-choice polls accept exactly one unique option", async () => {
  const database = Database.getInstance();
  const poll = await PollService.getInstance().createPoll({
    question: "Pick one",
    options: ["First", "Second"],
    is_multiple_choice: false,
  });
  const pollId = poll.data!.id!;
  const voteService = VoteService.getInstance();

  const multipleResponse = await voteService.castVote(
    pollId,
    [0, 1],
    undefined,
    "single-choice-voter-token",
  );
  assert.strictEqual(multipleResponse.success, false);
  assert.strictEqual(
    multipleResponse.error,
    "Single-choice polls require exactly one option",
  );

  const validResponse = await voteService.castVote(
    pollId,
    [0],
    undefined,
    "single-choice-voter-token",
  );
  assert.strictEqual(validResponse.success, true);

  const counts = database.db
    .prepare(
      `SELECT
         (SELECT COUNT(*) FROM ballots WHERE poll_id = ?) AS ballots,
         (SELECT COUNT(*) FROM votes WHERE poll_id = ?) AS votes`,
    )
    .get(pollId, pollId);
  assert.strictEqual(Number(counts?.ballots), 1);
  assert.strictEqual(Number(counts?.votes), 1);
});

test("multiple-choice polls require one or more unique options", async () => {
  const database = Database.getInstance();
  const poll = await PollService.getInstance().createPoll({
    question: "Pick several",
    options: ["First", "Second"],
    is_multiple_choice: true,
  });
  const pollId = poll.data!.id!;
  const voteService = VoteService.getInstance();

  const emptyResponse = await voteService.castVote(
    pollId,
    [],
    undefined,
    "empty-multiple-voter-token",
  );
  assert.strictEqual(emptyResponse.success, false);
  assert.strictEqual(emptyResponse.error, "At least one option is required");

  const duplicateResponse = await voteService.castVote(
    pollId,
    [0, 0],
    undefined,
    "duplicate-multiple-voter-token",
  );
  assert.strictEqual(duplicateResponse.success, false);
  assert.strictEqual(
    duplicateResponse.error,
    "Duplicate option IDs are not allowed",
  );

  const validResponse = await voteService.castVote(
    pollId,
    [0, 1],
    undefined,
    "valid-multiple-voter-token",
  );
  assert.strictEqual(validResponse.success, true);

  const counts = database.db
    .prepare(
      `SELECT
         (SELECT COUNT(*) FROM ballots WHERE poll_id = ?) AS ballots,
         (SELECT COUNT(*) FROM votes WHERE poll_id = ?) AS votes`,
    )
    .get(pollId, pollId);
  assert.strictEqual(Number(counts?.ballots), 1);
  assert.strictEqual(Number(counts?.votes), 2);
});

test("a stable voter token can complete only one ballot per poll", async () => {
  const database = Database.getInstance();
  const poll = await PollService.getInstance().createPoll({
    question: "Vote once",
    options: ["First", "Second"],
    is_multiple_choice: false,
  });
  const pollId = poll.data!.id!;
  const voterToken = "550e8400-e29b-41d4-a716-446655440000";
  const voteService = VoteService.getInstance();

  const firstResponse = await voteService.castVote(
    pollId,
    [0],
    undefined,
    voterToken,
  );
  const repeatResponse = await voteService.castVote(
    pollId,
    [1],
    undefined,
    voterToken,
  );

  assert.strictEqual(firstResponse.success, true);
  assert.strictEqual(repeatResponse.success, false);
  assert.strictEqual(
    repeatResponse.error,
    "This voter has already submitted a ballot for this poll",
  );

  const storedBallot = database.db
    .prepare(
      `SELECT voter_key
       FROM ballots
       WHERE poll_id = ?`,
    )
    .get(pollId);
  assert.strictEqual(String(storedBallot?.voter_key).length, 64);
  assert.notStrictEqual(storedBallot?.voter_key, voterToken);

  const counts = database.db
    .prepare(
      `SELECT
         (SELECT COUNT(*) FROM ballots WHERE poll_id = ?) AS ballots,
         (SELECT COUNT(*) FROM votes WHERE poll_id = ?) AS votes`,
    )
    .get(pollId, pollId);
  assert.strictEqual(Number(counts?.ballots), 1);
  assert.strictEqual(Number(counts?.votes), 1);
});

test("database constraints enforce voter and option uniqueness", async () => {
  const database = Database.getInstance();
  const multiPoll = await PollService.getInstance().createPoll({
    question: "Schema multi",
    options: ["First", "Second"],
    is_multiple_choice: true,
  });
  const multiPollId = multiPoll.data!.id!;
  const firstBallot = database.db
    .prepare(
      `INSERT INTO ballots (poll_id, voter_key)
       VALUES (?, ?)`,
    )
    .run(multiPollId, "schema-voter-key");
  const ballotId = Number(firstBallot.lastInsertRowid);

  assert.throws(
    () =>
      database.db
        .prepare(
          `INSERT INTO ballots (poll_id, voter_key)
           VALUES (?, ?)`,
        )
        .run(multiPollId, "schema-voter-key"),
    /UNIQUE constraint failed/,
  );

  database.db
    .prepare(
      `INSERT INTO votes (ballot_id, poll_id, option_id)
       VALUES (?, ?, ?)`,
    )
    .run(ballotId, multiPollId, 0);
  assert.throws(
    () =>
      database.db
        .prepare(
          `INSERT INTO votes (ballot_id, poll_id, option_id)
           VALUES (?, ?, ?)`,
        )
        .run(ballotId, multiPollId, 0),
    /UNIQUE constraint failed/,
  );

  const singlePoll = await PollService.getInstance().createPoll({
    question: "Schema single",
    options: ["First", "Second"],
    is_multiple_choice: false,
  });
  const singlePollId = singlePoll.data!.id!;
  const singleBallot = database.db
    .prepare(
      `INSERT INTO ballots (poll_id, voter_key)
       VALUES (?, ?)`,
    )
    .run(singlePollId, "single-schema-voter-key");
  const singleBallotId = Number(singleBallot.lastInsertRowid);
  const insertSingleVote = database.db.prepare(
    `INSERT INTO votes (ballot_id, poll_id, option_id)
     VALUES (?, ?, ?)`,
  );
  insertSingleVote.run(singleBallotId, singlePollId, 0);
  assert.throws(
    () => insertSingleVote.run(singleBallotId, singlePollId, 1),
    /single-choice ballot can only contain one selection/,
  );
});

test("setup safely backfills legacy vote rows with ballot IDs", () => {
  const database = Database.create(":memory:");
  database.db.exec(`
    CREATE TABLE polls (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      question TEXT NOT NULL,
      options TEXT NOT NULL
    );
    CREATE TABLE votes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      poll_id INTEGER NOT NULL,
      option_id INTEGER NOT NULL,
      user_id TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    INSERT INTO polls (question, options) VALUES ('Legacy', '["First"]');
    INSERT INTO votes (poll_id, option_id, user_id) VALUES (1, 0, '7');
  `);

  database.setupTables(false);

  const migratedVote = database.db
    .prepare("SELECT ballot_id FROM votes WHERE id = 1")
    .get();
  const migratedBallotId = Number(migratedVote?.ballot_id);
  const ballot = database.db
    .prepare("SELECT poll_id, user_id FROM ballots WHERE id = ?")
    .get(migratedBallotId);

  assert.ok(migratedBallotId > 0);
  assert.strictEqual(ballot?.poll_id, 1);
  assert.strictEqual(ballot?.user_id, "7");

  const voterKey = database.db
    .prepare("SELECT voter_key FROM ballots WHERE id = ?")
    .get(migratedBallotId);
  assert.strictEqual(voterKey?.voter_key, null);

  database.setupTables(false);
  const indexes = database.db
    .prepare(
      `SELECT name
       FROM sqlite_master
       WHERE type = 'index'
         AND name IN (
           'ballots_poll_voter_key_unique',
           'votes_ballot_option_unique'
         )
       ORDER BY name`,
    )
    .all()
    .map((row) => row.name);
  assert.deepStrictEqual(indexes, [
    "ballots_poll_voter_key_unique",
    "votes_ballot_option_unique",
  ]);
});
