import { Controller } from "../utils/controller.ts";
import type { IncomingHttpHeaders, IncomingMessage } from "node:http";
import { getBody } from "../utils/request.ts";
import { VoteService } from "../services/vote.ts";
import type {
  CastVoteBody,
  PollResultsResponse,
  VoteCountResponse,
  VoteResponse,
  VotesResponse,
} from "../types/vote.ts";

const parseCanonicalInteger = (
  value: unknown,
  minimum: number,
): number | null => {
  if (
    typeof value === "string" &&
    !/^(0|[1-9]\d*)$/.test(value)
  ) {
    return null;
  }

  if (typeof value !== "number" && typeof value !== "string") {
    return null;
  }

  const parsedValue = typeof value === "number" ? value : Number(value);
  return Number.isSafeInteger(parsedValue) && parsedValue >= minimum
    ? parsedValue
    : null;
};

export class VoteController extends Controller {
  constructor() {
    super("VoteController", "/vote", true);
    this.registerRoute("/cast", "post", this.castVote.bind(this));
    this.registerRoute("/votes", "get", this.getVotesByPollId.bind(this));
    this.registerRoute("/results", "get", this.getPollResults.bind(this));
    this.registerRoute(
      "/votesCount",
      "get",
      this.getOptionsVotesCount.bind(this)
    );
    this.registerRoute("/votesByUser", "get", this.getVotesByUserId.bind(this));
  }

  public async castVote(
    query: Record<string, string>,
    request: IncomingMessage,
    headers: IncomingHttpHeaders = {}
  ): Promise<VoteResponse> {
    try {
      const body = await getBody<CastVoteBody>(request, { headers });

      const hasOptionIds = body?.optionIds !== undefined;
      if (hasOptionIds && !Array.isArray(body.optionIds)) {
        return {
          success: false,
          error: "optionIds must be an array",
        };
      }

      const submittedOptionIds = hasOptionIds
        ? body.optionIds!
        : body?.optionId !== undefined
          ? [body.optionId]
          : [];

      if (body?.pollId === undefined || submittedOptionIds.length === 0) {
        return {
          success: false,
          error: "pollId and at least one optionId are required",
        };
      }

      const pollId = parseCanonicalInteger(body.pollId, 1);
      const parsedOptionIds = submittedOptionIds.map((optionId) =>
        parseCanonicalInteger(optionId, 0)
      );
      const userId =
        body.userId === undefined
          ? undefined
          : parseCanonicalInteger(body.userId, 1);
      const voterToken =
        typeof body.voterToken === "string" ? body.voterToken.trim() : undefined;

      if (
        pollId === null ||
        parsedOptionIds.some((optionId) => optionId === null) ||
        userId === null ||
        (voterToken !== undefined &&
          (voterToken.length < 16 ||
            voterToken.length > 200 ||
            !/^[A-Za-z0-9._~-]+$/.test(voterToken)))
      ) {
        return {
          success: false,
          error:
            "Invalid vote data. pollId and userId must be positive safe integers, option IDs must be non-negative safe integers, and voterToken must be a valid opaque token",
        };
      }

      const optionIds = parsedOptionIds as number[];
      const voteService = VoteService.getInstance();
      const response = await voteService.castVote(
        pollId,
        optionIds,
        userId,
        voterToken,
      );

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

  public async getPollResults(
    query: { pollId?: string },
    request: IncomingMessage
  ): Promise<PollResultsResponse> {
    try {
      const pollId = parseCanonicalInteger(query.pollId, 1);

      if (pollId === null) {
        return {
          success: false,
          error: "Valid poll ID is required",
        };
      }

      const response = await VoteService.getInstance().getPollResults(pollId);

      if (!response.success || !response.data) {
        return {
          success: false,
          error: response.error || "Failed to fetch poll results",
        };
      }

      return {
        success: true,
        data: response.data,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to fetch poll results";
      return { success: false, error: errorMessage };
    }
  }

  public async getVotesByPollId(
    query: { pollId?: string },
    request: IncomingMessage
  ): Promise<VotesResponse> {
    try {
      const pollId = parseCanonicalInteger(query.pollId, 1);

      if (pollId === null) {
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
    request: IncomingMessage
  ): Promise<VoteCountResponse> {
    try {
      const pollId = parseCanonicalInteger(query.id, 1);

      if (pollId === null) {
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
    request: IncomingMessage
  ): Promise<VotesResponse> {
    try {
      const userId = parseCanonicalInteger(query.id, 1);

      if (userId === null) {
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
