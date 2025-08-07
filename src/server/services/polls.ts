import {Service} from "../utils/service.ts";
import {Database} from "../utils/db.ts";
import type {APIResponse} from "../types/response.js";
import type {Poll} from "../types/poll.js";


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

    /**
     * Create a new poll.
     * @param {Poll} pollData - The data for the poll to be created.
     * @returns {Promise<APIResponse<Poll>>} - A promise that resolves to
     * an API response containing the created poll data.
     * @description This method inserts a new poll into the database with the provided data.
     * It serializes the options array to JSON format before storing it.
     * If the poll is created successfully, it returns a success response
     * with the created poll data, including the generated ID.
     * @throws {Error} - Throws an error if the poll creation fails.
     * @example
     * const pollService = PollService.getInstance();
     *
     * const newPoll: Poll = {
     *      question: "What is your favorite programming language?",
     *      options: ["JavaScript", "Python", "Java", "C#"],
     *      expires_at: "2023-12-31T23:59:59Z",
     *      is_public: true,
     *      is_anonymous: false,
     *      is_multiple_choice: false
     *   };
     *
     *   const response = await pollService.createPoll(newPoll);
     *
     *   if (response.success) {
     *      console.log("Poll created successfully:", response.data);
     *   } else {
     *      console.error("Error creating poll:", response.error);
     *   }
     */
    public async createPoll(pollData: Poll): Promise<APIResponse<Poll>> {
        const db = Database.getInstance().db;
        const stmt = db.prepare(`
            INSERT INTO polls (question, options, expires_at, is_public, is_anonymous, is_multiple_choice)
            VALUES (?, ?, ?, ?, ?, ?)
        `);

        const optionsJson = JSON.stringify(pollData.options);
        const result = stmt.run(
            optionsJson,
            pollData.question,
            pollData.expires_at || null,
            pollData.is_public ? 1 : 0,
            pollData.is_anonymous ? 1 : 0,
            pollData.is_multiple_choice ? 1 : 0
        );

        const pollId = result.lastInsertRowid as number;
        return {
            message: "Poll created successfully",
            data: {id: pollId, ...pollData},
            success: true
        };
    }

    /**
     * Check if a poll exists by its ID.
     * @param {number} pollId - The ID of the poll to check.
     * @returns {Promise<boolean>} - A promise that resolves to true if the poll exists, false otherwise.
     * @description This method queries the database to check if a poll with the given ID exists.
     * It returns true if the poll is found, otherwise false.
     * @throws {Error} - Throws an error if the database query fails.
     * @example
     * const pollService = PollService.getInstance();
     * * const exists = await pollService.isExistingPoll(1);
     * if (exists) {
     *   console.log("Poll exists.");
     * } else {
     *   console.log("Poll does not exist.");
     * }
     */
    public async isExistingPoll(pollId: number): Promise<boolean> {
        const db = Database.getInstance().db;
        const stmt = db.prepare(`SELECT COUNT(*) as count
                                 FROM polls
                                 WHERE id = ?`);
        const row = stmt.get(pollId);
        return Number(row.count) > 0;
    }

    public async getPolls(): Promise<APIResponse<Poll[]>> {
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
            success: true,
            message: "Polls retrieved successfully",
            data: polls
        };
    }

    /**
     * Get a poll by its ID.
     * @method getPollById - Fetch a poll by its ID.
     * @param {number} pollId - The ID of the poll to fetch.
     * @returns {Promise<APIResponse<Poll>>} - A promise that resolves to
     * an API response containing the poll data.
     * @description This method retrieves a poll from the database by its ID.
     * It checks if the poll exists and returns the poll data if found.
     * If the poll does not exist, it returns an error response.
     * @throws {Error} - Throws an error if the poll does not exist.
     * @example
     * const pollService = PollService.getInstance();
     * const pollId = 1;
     *
     * const response = await pollService.getPollById(pollId);
     *
     * if (response.success) {
     *      console.log("Poll retrieved successfully:", response.data);
     * } else {
     *      console.error("Error retrieving poll:", response.error);
     * }
     */
    public async getPollById(pollId: number): Promise<APIResponse<Poll>> {
        const db = Database.getInstance().db;
        const stmt = db.prepare(`SELECT *
                                 FROM polls
                                 WHERE id = ?`);
        const row = stmt.get(pollId);

        if (!row) {
            return {error: "Poll not found", success: false, data: null};
        }

        return {
            message: "Poll retrieved successfully",
            success: true,
            data: {
                id: Number(row.id),
                question: String(row.question),
                created_at: String(row.created_at),
                expires_at: String(row.expires_at),
                options: JSON.parse(String(row.options)),
                is_public: !!row.is_public,
                is_anonymous: !!row.is_anonymous,
                is_multiple_choice: !!row.is_multiple_choice,
            }
        };
    }


    /**
     * Fetch all polls created by a specific user.
     * @method fetchPollsByUser - Fetch all polls created by a specific user.
     * @param {string} userId - The ID of the user whose polls are to be fetched.
     * @returns {Promise<APIResponse<Poll[]>>} - A promise that resolves to an API response containing the user's polls.
     * @description This method retrieves all polls created by a specific user from the database.
     * It checks if the user has created any polls and returns them in an array.
     * If no polls are found, it returns an error response.
     * @example
     * const pollService = PollService.getInstance();
     *
     * const userId = "12345"; // Replace with actual user ID
     * const response = await pollService.fetchPollsByUser(userId);
     *
     * if (response.success) {
     *    console.log("User's polls retrieved successfully:", response.data);
     *    } else {
     *    console.error("Error fetching user's polls:", response.error);
     *    }
     * }
     * @param userId
     */
    public async fetchPollsByUser(userId: string): Promise<APIResponse<Poll[]>> {
        const db = Database.getInstance().db;
        const stmt = db.prepare(`SELECT *
                                 FROM polls
                                 WHERE user_id = ?`);
        const rows = stmt.all(userId);

        if (rows.length === 0) {
            return {error: "No polls found for this user", success: false, data: null};
        }

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
            data: polls as Poll[],
            success: true
        };
    }
}