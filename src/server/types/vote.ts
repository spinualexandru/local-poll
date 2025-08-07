export interface Vote {
    id?: number;
    poll_id: number;
    option_id: number;
    user_id?: number | null;
    created_at?: string;
}