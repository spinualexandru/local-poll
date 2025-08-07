import {Controller} from "../utils/controller.ts";
import type {ServerHttp2Stream} from 'node:http2';
import {getBody} from "../utils/request.ts";
import {VoteService} from "../services/vote.ts";

export class VoteController extends Controller {
    constructor() {
        super("VoteController", "/vote", true);
        this.registerRoute("/cast", "post", this.castVote);
        this.registerRoute("/results", "get", this.getVotesByPollId);
        this.registerRoute('/resultsCount', 'get', this.getOptionsVotesCount);
    }

    public async castVote(query: any, stream: ServerHttp2Stream): Promise<any> {
        const body = await getBody(stream);
        if (!body || !body.pollId || !body.optionId) {
            return {error: "Invalid vote data"};
        }
        const voteService = VoteService.getInstance();

        return await voteService.castVote(body.pollId, body.optionId, body.userId);
    }

    public async getVotesByPollId(query: any): Promise<any> {
        const pollId = query.id;
        if (!pollId) {
            return {error: "Poll ID is required"};
        }
        const voteService = VoteService.getInstance();
        return await voteService.getVotesByPollId(pollId);
    }

    public async getOptionsVotesCount(query: any): Promise<any> {
        const pollId = query.id;
        if (!pollId) {
            return {error: "Poll ID is required"};
        }
        const voteService = VoteService.getInstance();

        return await voteService.getOptionsVotesCount(pollId);
    }

}