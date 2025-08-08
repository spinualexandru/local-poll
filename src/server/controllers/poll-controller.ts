import { Controller } from "../utils/controller.ts";
import type { ServerHttp2Stream, IncomingHttpHeaders } from 'node:http2';
import { getBody } from "../utils/request.ts";
import { PollService } from "../services/polls.ts";
import type { CreatePollRequest, PollListResponse, PollResponse } from "../types/poll.ts";

export class PollController extends Controller {
    constructor() {
        super("PollController", "/poll", true);
        this.registerRoute("/create", "post", this.createPoll.bind(this));
        this.registerRoute("/results", "get", this.getResults.bind(this));
        this.registerRoute('/fetchByUser', 'get', this.fetchPollsByUser.bind(this));
        this.registerRoute("/get", "get", this.getPoll.bind(this));
    }

    public async createPoll(
        query: Record<string, string>,
        stream: ServerHttp2Stream,
        headers: IncomingHttpHeaders = {}
    ): Promise<PollResponse> {
        try {
            const pollService = PollService.getInstance();
            const body = await getBody<CreatePollRequest>(stream, { headers });

            // Validate required fields
            if (!body?.question?.trim()) {
                return { success: false, error: "Question is required" };
            }

            if (!Array.isArray(body.options) || body.options.length < 2) {
                return {
                    success: false,
                    error: "At least two options are required"
                };
            }

            // Clean and validate options
            const options = body.options
                .map(opt => typeof opt === 'string' ? opt.trim() : String(opt))
                .filter(opt => opt.length > 0);

            if (options.length < 2) {
                return {
                    success: false,
                    error: "At least two non-empty options are required"
                };
            }

            const pollData: CreatePollRequest = {
                question: body.question.trim(),
                options,
                is_public: Boolean(body.is_public),
                is_anonymous: Boolean(body.is_anonymous),
                is_multiple_choice: Boolean(body.is_multiple_choice),
                userId: query.userId
            };

            const response = await pollService.createPoll(pollData);
            if (!response.success || !response.data) {
                return {
                    success: false,
                    error: response.error || 'Failed to create poll'
                };
            }
            return { success: true, data: response.data };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Failed to create poll';
            return { success: false, error: errorMessage };
        }
    }

    public async getResults(
        query: { id?: string },
        stream: ServerHttp2Stream
    ): Promise<PollResponse> {
        try {
            const pollService = PollService.getInstance();
            const pollId = query.id;

            if (!pollId) {
                return { success: false, error: "Poll ID is required" };
            }

            const response = await pollService.getPollById(parseInt(pollId, 10));
            if (!response.success || !response.data) {
                return {
                    success: false,
                    error: response.error || "Poll not found"
                };
            }
            return { success: true, data: response.data };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Failed to fetch poll results';
            return { success: false, error: errorMessage };
        }
    }

    public async getPoll(
        query: { id?: string },
        stream: ServerHttp2Stream
    ): Promise<PollResponse> {
        try {
            const pollService = PollService.getInstance();
            const pollId = query.id;

            if (!pollId) {
                return { success: false, error: "Poll ID is required" };
            }

            const response = await pollService.getPollById(parseInt(pollId, 10));
            if (!response.success || !response.data) {
                return {
                    success: false,
                    error: response.error || "Poll not found"
                };
            }
            return { success: true, data: response.data };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Failed to fetch poll';
            return { success: false, error: errorMessage };
        }
    }

    public async fetchPollsByUser(
        query: { userId?: string },
        stream: ServerHttp2Stream
    ): Promise<PollListResponse> {
        try {
            const pollService = PollService.getInstance();
            const userId = query.userId;

            if (!userId) {
                return { success: false, error: "User ID is required" };
            }

            const polls = await pollService.fetchPollsByUser(userId);
            if (!polls?.data || polls.data.length === 0) {
                return {
                    success: true,
                    data: [],
                    error: "No polls found for this user"
                };
            }

            return {
                success: true,
                data: Array.isArray(polls.data) ? polls.data : []
            };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Failed to fetch user polls';
            return { success: false, error: errorMessage };
        }
    }
}