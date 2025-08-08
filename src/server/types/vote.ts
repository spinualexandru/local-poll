import type { APIResponse } from "./response.ts";

export interface Vote {
    id?: number;
    poll_id: number;
    option_id: number;
    user_id?: number | null;
    created_at?: string;
}

export interface CastVoteBody {
    pollId: number;
    optionId: number;
    userId?: number;
}

export type VoteResponse = APIResponse<Vote>;
export type VotesResponse = APIResponse<Vote[]>;
export type VoteCountResponse = APIResponse<Record<number, number>>;