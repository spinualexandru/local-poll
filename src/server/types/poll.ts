import type { APIResponse } from "./response.ts";

export interface Poll {
    id?: number;
    question: string;
    created_at?: string;
    expires_at?: string | null;
    options: string[];
    is_public?: boolean;
    is_anonymous?: boolean;
    is_multiple_choice?: boolean;
}

export interface CreatePollRequest extends Omit<Poll, 'id' | 'created_at'> {
    userId?: string;
}

export type PollResponse = APIResponse<Poll>;
export type PollListResponse = APIResponse<Poll[]>;