import {Controller} from "../utils/controller.ts";
import type {ServerHttp2Stream} from 'node:http2';
import {getBody} from "../utils/request.ts";
import {PollService} from "../services/polls.ts";

export class PollController extends Controller {
    constructor() {
        super("PollController", "/poll", true);
        this.registerRoute("/create", "post", this.createPoll);
        this.registerRoute("/results", "get", this.getResults);
        this.registerRoute('/fetchByUser', 'get', this.fetchPollsByUser);
        this.registerRoute("/get", "get", this.getPoll);
    }

    public async createPoll(query: any, stream: ServerHttp2Stream): Promise<any> {

        const pollService = PollService.getInstance();
        const body = await getBody(stream);
        if (!body || !body.question || !Array.isArray(body.options) || body.options.length < 2) {
            return {error: "Invalid poll data"};
        }

        return pollService.createPoll(body);
    }

    public async getResults(query: any, stream: ServerHttp2Stream): Promise<any> {
        // Logic to get poll results
        return {message: "Poll results fetched successfully"};
    }

    public async getPoll(query: any, stream: ServerHttp2Stream): Promise<any> {
        const pollService = PollService.getInstance();
        const pollId = query.id;

        if (!pollId) {
            return {error: "Poll ID is required"};
        }

        const poll = await pollService.getPollById(pollId);
        if (!poll) {
            return {error: "Poll not found"};
        }

        return {data: poll};
    }

    public async fetchPollsByUser(query: any, stream: ServerHttp2Stream): Promise<any> {
        const pollService = PollService.getInstance();
        const userId = query.userId;

        if (!userId) {
            return {error: "User ID is required"};
        }

        const polls = await pollService.fetchPollsByUser(userId);
        if (!polls || polls.data.length === 0) {
            return {message: "No polls found for this user"};
        }

        return {data: polls};
    }
}