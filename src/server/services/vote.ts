import {Service} from "../utils/service.ts";
import {Database} from "../utils/db.ts";
import {PollService} from "./polls.ts";
import {createHash} from "node:crypto";
import type {APIResponse} from "../types/response.ts";
import type {PollResults, Vote} from "../types/vote.ts";

export class VoteService extends Service {
    private static instance: VoteService | null = null;

    constructor() {
        super();
    }

    public static getInstance(): VoteService {
        if (!VoteService.instance) {
            VoteService.instance = new VoteService();
        }
        return VoteService.instance;
    }


    /**
     * Cast one atomic ballot for a poll.
     * @method castVote - Cast one atomic ballot for a poll.
     * @param {number} pollId - The ID of the poll to cast a vote for.
     * @param {number[]} optionIds - The option IDs selected in the ballot.
     * @param {number} [userId] - The ID of the user casting the vote (optional).
     * @param {string} [voterToken] - Stable opaque browser voter token (optional when userId is present).
     * @returns {Promise<APIResponse<Vote[]>>} - The selections stored for the ballot.
     * @example
     * const voteService = VoteService.getInstance();
     * const response = await voteService.castVote(1, [2], 123);
     * if (response.success) {
     *     console.log("Vote cast successfully:", response.data);
     * } else {
     *     console.error("Error casting vote:", response.error);
     * }
     */
    public async castVote(
        pollId: number,
        optionIds: number[],
        userId?: number,
        voterToken?: string,
    ): Promise<APIResponse<Vote[]>> {
        if (!Number.isSafeInteger(pollId) || pollId <= 0) {
            return {error: "Invalid poll ID", success: false};
        }

        if (
            !Array.isArray(optionIds) ||
            optionIds.some(
                (optionId) =>
                    !Number.isSafeInteger(optionId) || optionId < 0,
            )
        ) {
            return {error: "Invalid option IDs", success: false};
        }

        if (
            userId !== undefined &&
            (!Number.isSafeInteger(userId) || userId <= 0)
        ) {
            return {error: "Invalid user ID", success: false};
        }

        const db = Database.getInstance().db;
        const pollService = PollService.getInstance();

        if (!await pollService.isExistingPoll(pollId)) {
            return {error: "Poll not found", success: false};
        }

        const poll = await pollService.getPollById(pollId);

        if (optionIds.length === 0) {
            return {error: "At least one option is required", success: false};
        }

        if (new Set(optionIds).size !== optionIds.length) {
            return {error: "Duplicate option IDs are not allowed", success: false};
        }

        if (
            !poll.data ||
            optionIds.some(
                (optionId) =>
                    !Number.isInteger(optionId) ||
                    optionId < 0 ||
                    optionId >= poll.data!.options.length,
            )
        ) {
            return {error: "Option not found in the poll", success: false};
        }

        if (!poll.data.is_multiple_choice && optionIds.length !== 1) {
            return {
                error: "Single-choice polls require exactly one option",
                success: false,
            };
        }

        const voterIdentity = userId !== undefined
            ? `user:${userId}`
            : voterToken
                ? `token:${voterToken}`
                : null;

        if (!voterIdentity) {
            return {
                error: "A voter token or user ID is required",
                success: false,
            };
        }

        const voterKey = createHash("sha256")
            .update(`${pollId}:${voterIdentity}`)
            .digest("hex");
        const insertBallotStmt = db.prepare(`
            INSERT INTO ballots (poll_id, user_id, voter_key)
            VALUES (?, ?, ?)
        `);
        const insertVoteStmt = db.prepare(`
            INSERT INTO votes (ballot_id, poll_id, option_id, user_id)
            VALUES (?, ?, ?, ?)
        `);
        const votes: Vote[] = [];

        db.exec("BEGIN");
        try {
            const ballotResult = insertBallotStmt.run(
                pollId,
                userId ?? null,
                voterKey,
            );
            const ballotId = Number(ballotResult.lastInsertRowid);

            for (const optionId of optionIds) {
                insertVoteStmt.run(ballotId, pollId, optionId, userId ?? null);
                votes.push({
                    ballot_id: ballotId,
                    poll_id: pollId,
                    option_id: optionId,
                    user_id: userId ?? null,
                });
            }

            db.exec("COMMIT");
        } catch (error) {
            db.exec("ROLLBACK");

            if (
                error instanceof Error &&
                error.message.includes(
                    "UNIQUE constraint failed: ballots.poll_id, ballots.voter_key",
                )
            ) {
                return {
                    error: "This voter has already submitted a ballot for this poll",
                    success: false,
                };
            }

            throw error;
        }

        return {
            message: "Vote cast successfully",
            success: true,
            data: votes,
        };
    }

    /**
     * Get all votes for a specific poll.
     * @method getVotesByPollId - Get all votes for a specific poll.
     * @param {number} pollId - The ID of the poll to fetch votes for.
     * @example
     * const votes = await voteService.getVotesByPollId(1);
     * @returns {Promise<APIResponse<Vote[]>>} - A promise that resolves to an API response containing the votes for the poll.
     */
    public async getVotesByPollId(pollId: number): Promise<APIResponse<Vote[]>> {
        const db = Database.getInstance().db;
        const stmt = db.prepare(`
            SELECT *
            FROM votes
            WHERE poll_id = ?
        `);
        const votes = stmt.all(pollId);

        return {
            message: "Votes fetched successfully",
            data: votes as unknown as Vote[],
            success: true
        };
    }

    /**
     * Aggregate completed ballots and their distinct option selections.
     *
     * Percentages use completed ballots as the denominator. As a result,
     * percentages in a multiple-choice poll may add up to more than 100%.
     */
    public async getPollResults(
        pollId: number,
    ): Promise<APIResponse<PollResults>> {
        if (!Number.isSafeInteger(pollId) || pollId <= 0) {
            return {error: "Invalid poll ID", success: false};
        }

        const db = Database.getInstance().db;
        const distinctSelections = `
            SELECT DISTINCT
                option_id,
                CASE
                    WHEN ballot_id IS NULL THEN 'legacy-vote:' || id
                    ELSE 'ballot:' || ballot_id
                END AS ballot_key
            FROM votes
            WHERE poll_id = ?
        `;
        const totals = db.prepare(`
            WITH distinct_selections AS (${distinctSelections})
            SELECT
                COUNT(DISTINCT ballot_key) AS total_ballots,
                COUNT(*) AS total_selections
            FROM distinct_selections
        `).get(pollId);
        const totalBallots = Number(totals?.total_ballots ?? 0);
        const totalSelections = Number(totals?.total_selections ?? 0);
        const optionCounts = db.prepare(`
            WITH distinct_selections AS (${distinctSelections})
            SELECT option_id, COUNT(*) AS selection_count
            FROM distinct_selections
            GROUP BY option_id
            ORDER BY option_id
        `).all(pollId);
        const options = optionCounts.map((row) => {
            const selectionCount = Number(row.selection_count);

            return {
                option_id: Number(row.option_id),
                selection_count: selectionCount,
                percentage: totalBallots > 0
                    ? Math.round((selectionCount / totalBallots) * 100)
                    : 0,
            };
        });

        return {
            message: "Poll results fetched successfully",
            data: {
                total_ballots: totalBallots,
                total_selections: totalSelections,
                options,
            },
            success: true,
        };
    }

    /**
     * Get the count of votes for a specific poll.
     * @method getVotesCountByPollId - Get the count of votes for a specific poll.
     * @returns {Promise<number>} - A promise that resolves to the count of votes for the specified poll.
     * @description This method retrieves the total number of votes cast for a given
     * @param {number} pollId - The ID of the poll for which to count votes.
     * @example
     * const votesCount = await voteService.getVotesCountByPollId(1);
     * @returns {Promise<number>} - A promise that resolves to the count of votes for
     */
    public getVotesCountByPollId(pollId: number): Promise<number> {
        const db = Database.getInstance().db;
        const stmt = db.prepare(`
            SELECT COUNT(*) as count
            FROM votes
            WHERE poll_id = ?
        `);
        const row = stmt.get(pollId);

        return Promise.resolve(Number(row?.count ?? 0));
    }

    /**
     * Get the count of votes for a specific option in a poll.
     * @method getVotesCountByOptionId - Get the count of votes for a specific option in a poll.
     * @returns {Promise<number>} - A promise that resolves to the count of votes for the specified option in the poll.
     * @description This method retrieves the total number of votes cast for a specific option in a given poll.
     * It is useful for determining how many votes a particular option has received.
     * @param {number} pollId - The ID of the poll for which to count votes.
     * @param {number} optionId - The ID of the option for which to count votes.
     * @example
     * const votesCount = await voteService.getVotesCountByOptionId(1, 2);
     * @returns {Promise<number>} - A promise that resolves to the count of votes for the specified option in the poll.
     */
    public async getVotesCountByOptionId(pollId: number, optionId: number): Promise<number> {
        const db = Database.getInstance().db;
        const stmt = db.prepare(`
            SELECT COUNT(*) as count
            FROM votes
            WHERE poll_id = ?
              AND option_id = ?
        `);
        const row = stmt.get(pollId, optionId);

        return Promise.resolve(Number(row?.count ?? 0));
    }

    /**
     * Get the count of votes for each option in a poll.
     * @method getOptionsVotesCount - Get the count of votes for each option in a poll.
     * @description This method retrieves the total number of votes cast for each option in a given poll.
     * It is useful for determining how many votes each option has received.
     * @param {number} pollId - The ID of the poll for which to count votes.
     * @returns {Promise<any>} - A promise that resolves to an object containing the count of votes for each option in the poll.
     * The object will have the structure: { option_id: number, count: number } for each option.
     * @example
     * const votesCount = await voteService.getOptionsVotesCount(1);
     * @param pollId
     */
    public async getOptionsVotesCount(pollId: number): Promise<any> {
        const db = Database.getInstance().db;
        const stmt = db.prepare(`
            SELECT option_id, COUNT(*) as count
            FROM votes
            WHERE poll_id = ?
            GROUP BY option_id
        `);
        const rows = stmt.all(pollId);

        return {
            message: "Options votes count fetched successfully",
            data: rows as unknown as { option_id: number, count: number }[],
            success: true
        };
    }

    /**
     * Get all votes cast by a specific user.
     * @method getVotesByUserId - Get all votes cast by a specific user.
     * @description This method retrieves all votes cast by a specific user.
     * It is useful for determining the votes cast by a specific user.
     * @param {number} userId - The ID of the user for which to retrieve votes.
     * @returns {Promise<any>} - A promise that resolves to an object containing the votes cast by the specified user.
     * The object will have the structure: { poll_id: number, option_id: number, user_id: number } for each vote.
     * @example
     * const votes = await voteService.getVotesByUserId(1);
     * @param userId
     */
    public async getVotesByUserId(userId: number): Promise<APIResponse<Vote[]>> {
        const db = Database.getInstance().db;
        const stmt = db.prepare(`
            SELECT *
            FROM votes
            WHERE user_id = ?
        `);
        const rows = stmt.all(userId);

        return {
            message: "Votes fetched successfully",
            data: rows as unknown as Vote[],
            success: true
        };
    }
}
