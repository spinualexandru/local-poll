import {Service} from "../utils/service.ts";
import {Database} from "../utils/db.ts";

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

export class PollService extends Service {

    private static instance: PollService | null = null;

    constructor() {
        super();
    }

    public static getInstance(): PollService {
        if (!PollService.instance) {
            PollService.instance = new PollService();
        }
        return PollService.instance;
    }

    public async createPoll(pollData: Poll): Promise<any> {
        const db = Database.getInstance().db;
        const stmt = db.prepare(`
            INSERT INTO polls (question, options, expires_at, is_public, is_anonymous, is_multiple_choice)
            VALUES (?, ?, ?, ?, ?, ?)
        `);

        const optionsJson = JSON.stringify(pollData.options);
        const result = stmt.run(
            pollData.question,
            optionsJson,
            pollData.expires_at || null,
            pollData.is_public ? 1 : 0,
            pollData.is_anonymous ? 1 : 0,
            pollData.is_multiple_choice ? 1 : 0
        );

        const pollId = result.lastInsertRowid as number;
        return {
            message: "Poll created successfully",
            data: {id: pollId, ...pollData}
        };
    }

    public async getPolls(): Promise<any> {
        const db = Database.getInstance().db;
        const stmt = db.prepare(`SELECT *
                                 FROM polls
                                 ORDER BY created_at DESC`);
        const rows = stmt.all();

        const polls = rows.map((row: any) => ({
            id: row.id,
            question: row.question,
            created_at: row.created_at,
            expires_at: row.expires_at,
            options: JSON.parse(row.options),
            is_public: !!row.is_public,
            is_anonymous: !!row.is_anonymous,
            is_multiple_choice: !!row.is_multiple_choice,
        }));

        return {
            message: "Polls retrieved successfully",
            data: polls
        };
    }

    public async getPollById(pollId: number): Promise<any> {
        const db = Database.getInstance().db;
        const stmt = db.prepare(`SELECT *
                                 FROM polls
                                 WHERE id = ?`);
        const row = stmt.get(pollId);

        if (!row) {
            return {error: "Poll not found"};
        }

        return {
            message: "Poll retrieved successfully",
            data: {
                id: row.id,
                question: row.question,
                created_at: row.created_at,
                expires_at: row.expires_at,
                options: JSON.parse(String(row.options)),
                is_public: !!row.is_public,
                is_anonymous: !!row.is_anonymous,
                is_multiple_choice: !!row.is_multiple_choice,
            }
        };
    }
}