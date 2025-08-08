import {Service} from "../utils/service.ts";
import {Database} from "../utils/db.ts";
import {PollService} from "./polls.ts";
import type {APIResponse} from "../types/response.ts";
import type {Vote} from "../types/vote.ts";

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
     * Cast a vote for a poll option.
     * @method castVote - Cast a vote for a poll option.
     * @param {number} pollId - The ID of the poll to cast a vote for.
     * @param {number} optionId - The ID of the option to vote for.
     * @param {number} [userId] - The ID of the user casting the vote (optional).
     * @returns {Promise<APIResponse<Vote>>} - A promise that resolves to an API response containing the vote details.
     * @description This method allows a user to cast a vote for a specific option in a poll.
     * It checks if the poll exists and if the option is valid before inserting the vote into the database.
     * If the poll or option does not exist, it returns an error response.
     * If the vote is successfully cast, it returns a success response with the vote details.
     * @throws {Error} - Throws an error if the poll does not exist or if the option is invalid.
     * @example
     * const voteService = VoteService.getInstance();
     * const response = await voteService.castVote(1, 2, 123);
     * if (response.success) {
     *     console.log("Vote cast successfully:", response.data);
     * } else {
     *     console.error("Error casting vote:", response.error);
     * }
     */
    public async castVote(pollId: number, optionId: number, userId?: number): Promise<APIResponse<Vote>> {
        const db = Database.getInstance().db;
        const pollService = PollService.getInstance();

        if (!await pollService.isExistingPoll(pollId)) {
            return {error: "Poll not found", success: false};
        }

        const poll = await pollService.getPollById(pollId);

        if (!poll || !poll.data.options || !poll.data.options[optionId]) {
            return {error: "Option not found in the poll", success: false};
        }

        const insertVoteStmt = db.prepare(`
            INSERT INTO votes (poll_id, option_id, user_id)
            VALUES (?, ?, ?)
        `);
        const res = insertVoteStmt.run(pollId, optionId, userId || null);

        return {
            message: "Vote cast successfully",
            success: true,
            data: {
                poll_id: pollId,
                option_id: optionId,
                user_id: userId || null,
            }
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

        return Promise.resolve(Number(row.count));
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

        return Promise.resolve(Number(row.count));
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