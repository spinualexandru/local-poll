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