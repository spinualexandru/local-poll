import {Controller} from "../utils/controller.ts";
import type {ServerHttp2Stream} from 'node:http2';
import {getBody} from "../utils/request.ts";
import {VoteService} from "../services/vote.ts";

export class VoteController extends Controller {
    constructor() {
        super("VoteController", "/vote", true);
        this.registerRoute("/cast", "post", this.castVote);
    }

    public async castVote(query: any, stream: ServerHttp2Stream): Promise<any> {
        const body = await getBody(stream);
        if (!body || !body.pollId || !body.optionId) {
            return {error: "Invalid vote data"};
        }
        const voteService = VoteService.getInstance();

        const result = await voteService.castVote(body.pollId, body.optionId, body.userId);

        return result
    }

}