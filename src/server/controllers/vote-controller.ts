import { Controller } from "../utils/controller.ts";
import type { ServerHttp2Stream, IncomingHttpHeaders } from "node:http2";
import { getBody } from "../utils/request.ts";
import { VoteService } from "../services/vote.ts";
import type {
  CastVoteBody,
  VoteCountResponse,
  VoteResponse,
  VotesResponse,
} from "../types/vote.ts";

export class VoteController extends Controller {
  constructor() {
    super("VoteController", "/vote", true);
    this.registerRoute("/cast", "post", this.castVote.bind(this));
    this.registerRoute("/votes", "get", this.getVotesByPollId.bind(this));
    this.registerRoute(
      "/votesCount",
      "get",
      this.getOptionsVotesCount.bind(this)
    );
    this.registerRoute("/votesByUser", "get", this.getVotesByUserId.bind(this));
  }

  public async castVote(
    query: Record<string, string>,
    stream: ServerHttp2Stream,
    headers: IncomingHttpHeaders = {}
  ): Promise<VoteResponse> {
    try {
      const body = await getBody<CastVoteBody>(stream, { headers });

      if (!body?.pollId || !body?.optionId) {
        return {
          success: false,
          error: "pollId and optionId are required",
        };
      }

      const pollId = Number(body.pollId);
      const optionId = Number(body.optionId);
      const userId = body.userId ? Number(body.userId) : undefined;

      if (
        isNaN(pollId) ||
        isNaN(optionId) ||
        (userId !== undefined && isNaN(userId))
      ) {
        return {
          success: false,
          error: "Invalid ID format. pollId and optionId must be numbers",
        };
      }

      const voteService = VoteService.getInstance();
      const response = await voteService.castVote(pollId, optionId, userId);

      if (!response.success) {
        return {
          success: false,
          error: response.error || "Failed to cast vote",
        };
      }

      return { success: true, data: response.data };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to process vote";
      return { success: false, error: errorMessage };
    }
  }

  public async getVotesByPollId(
    query: { pollId?: string },
    stream: ServerHttp2Stream
  ): Promise<VotesResponse> {
    try {
      const pollId = query.pollId ? Number(query.pollId) : NaN;

      if (isNaN(pollId)) {
        return {
          success: false,
          error: "Valid poll ID is required",
        };
      }

      const voteService = VoteService.getInstance();
      const response = await voteService.getVotesByPollId(pollId);

      if (!response.success) {
        return {
          success: false,
          error: response.error || "Failed to fetch votes",
        };
      }

      return {
        success: true,
        data: response.data || [],
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to fetch votes";
      return { success: false, error: errorMessage };
    }
  }

  public async getOptionsVotesCount(
    query: { id?: string },
    stream: ServerHttp2Stream
  ): Promise<VoteCountResponse> {
    try {
      const pollId = query.id ? Number(query.id) : NaN;

      if (isNaN(pollId)) {
        return {
          success: false,
          error: "Valid poll ID is required",
        };
      }

      const voteService = VoteService.getInstance();
      const response = await voteService.getOptionsVotesCount(pollId);

      if (!response.success) {
        return {
          success: false,
          error: response.error || "Failed to fetch vote counts",
        };
      }

      return {
        success: true,
        data: response.data || {},
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to fetch vote counts";
      return { success: false, error: errorMessage };
    }
  }

  public async getVotesByUserId(
    query: { id?: string },
    stream: ServerHttp2Stream
  ): Promise<VotesResponse> {
    try {
      const userId = query.id ? Number(query.id) : NaN;

      if (isNaN(userId)) {
        return {
          success: false,
          error: "Valid user ID is required",
        };
      }

      const voteService = VoteService.getInstance();
      const response = await voteService.getVotesByUserId(userId);

      if (!response.success) {
        return {
          success: false,
          error: response.error || "Failed to fetch user votes",
        };
      }

      return {
        success: true,
        data: response.data || [],
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to fetch user votes";
      return { success: false, error: errorMessage };
    }
  }
}
