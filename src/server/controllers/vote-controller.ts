import {Controller} from "../utils/controller.ts";
import type {ServerHttp2Stream} from 'node:http2';

export class VoteController extends Controller {
    constructor() {
        super("VoteController", "/vote", true);
        this.registerRoute("/cast", "post", this.castVote);
    }

    public async castVote(query: any, stream: ServerHttp2Stream): Promise<any> {
        // Logic to cast a vote
        return {message: "Vote cast successfully"};
    }

}