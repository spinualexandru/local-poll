import {Service} from "../utils/service.ts";
import {Database} from "../utils/db.ts";
import {PollService} from "./polls.ts";

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

    public async castVote(pollId: number, optionId: number, userId?: number): Promise<any> {
        const db = Database.getInstance().db;
        const pollService = PollService.getInstance();
        // Check if the poll exists
        if (!await pollService.isExistingPoll(pollId)) {
            return {error: "Poll not found"};
        }

        // Check if the option exists
        const poll = await pollService.getPollById(pollId);

        if (!poll || !poll.data.options || !poll.data.options[optionId]) {
            return {error: "Option not found in the poll"};
        }


        // Insert the vote
        const insertVoteStmt = db.prepare(`
            INSERT INTO votes (poll_id, option_id, user_id)
            VALUES (?, ?, ?)
        `);
        const res = insertVoteStmt.run(pollId, optionId, userId || null);

        return {
            message: "Vote cast successfully",
            pollId,
            optionId,
            userId
        };
    }
}