import type { APIResponse } from "./response.ts";

export interface Vote {
    id?: number;
    ballot_id: number;
    poll_id: number;
    option_id: number;
    user_id?: number | null;
    created_at?: string;
}

export interface PollOptionResult {
    option_id: number;
    selection_count: number;
    percentage: number;
}

export interface PollResults {
    total_ballots: number;
    total_selections: number;
    options: PollOptionResult[];
}

export type VoteIdInput = number | string;

export interface CastVoteBody {
    pollId: VoteIdInput;
    optionIds?: VoteIdInput[];
    optionId?: VoteIdInput;
    userId?: VoteIdInput;
    voterToken?: string;
}

export type VoteResponse = APIResponse<Vote[]>;
export type VotesResponse = APIResponse<Vote[]>;
export type VoteCountResponse = APIResponse<Record<number, number>>;
export type PollResultsResponse = APIResponse<PollResults>;
