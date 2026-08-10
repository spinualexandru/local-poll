import { DatabaseSync } from "node:sqlite";
import { Table } from "./table.ts";
import { join } from "node:path";
import { cwd } from "node:process";
import { isCustomizationEnabled } from "./customization.ts";

export class Database {
  private static instance: Database;
  location: string | Buffer | URL;
  db: DatabaseSync;
  tables: Table[] = [];

  private constructor(location?: string | Buffer | URL) {
    this.location =
      location ||
      process.env.SQLITE_DATABASE_PATH ||
      join(cwd(), "/", "localpoll.db");

    if (!location && !process.env.SQLITE_DATABASE_PATH) {
      console.warn(
        "[LocalPoll]:db - No database location provided, defaulting to file-based SQLite database!"
      );
    }

    this.db = new DatabaseSync(this.location);
  }

  public static getInstance(): Database {
    if (!Database.instance) {
      Database.instance = new Database();
    }
    return Database.instance;
  }

  public static create(location: string | Buffer | URL): Database {
    return new Database(location);
  }

  public setupTables(customizationEnabled = isCustomizationEnabled()) {
    const pollsTable = new Table("polls", this.db);
    const ballotsTable = new Table("ballots", this.db);
    const votesTable = new Table("votes", this.db);
    this.tables = [pollsTable, ballotsTable, votesTable];

    pollsTable.checkOrCreate(
      [
        "question TEXT NOT NULL",
        "created_at DATETIME DEFAULT CURRENT_TIMESTAMP",
        "expires_at DATETIME",
        "options TEXT NOT NULL",
        "is_public BOOLEAN DEFAULT TRUE",
        "is_anonymous BOOLEAN DEFAULT TRUE",
        "is_multiple_choice BOOLEAN DEFAULT FALSE",
      ],
      ["id INTEGER PRIMARY KEY AUTOINCREMENT"]
    );

    ballotsTable.checkOrCreate(
      [
        "poll_id INTEGER NOT NULL",
        "user_id TEXT",
        "voter_key TEXT",
        "created_at DATETIME DEFAULT CURRENT_TIMESTAMP",
      ],
      [
        "id INTEGER PRIMARY KEY AUTOINCREMENT",
        "FOREIGN KEY (poll_id) REFERENCES polls(id) ON DELETE CASCADE",
      ],
    );

    votesTable.checkOrCreate(
      [
        "id INTEGER PRIMARY KEY AUTOINCREMENT",
        "ballot_id INTEGER NOT NULL",
        "poll_id INTEGER NOT NULL",
        "option_id INTEGER NOT NULL",
        "user_id TEXT",
        "created_at DATETIME DEFAULT CURRENT_TIMESTAMP",
      ],
      [
        "FOREIGN KEY (ballot_id) REFERENCES ballots(id) ON DELETE CASCADE",
        "FOREIGN KEY (poll_id) REFERENCES polls(id) ON DELETE CASCADE",
      ],
    );

    this.migrateVotesToBallots();

    if (customizationEnabled) {
      const usersTable = new Table("users", this.db);
      this.tables.push(usersTable);
      usersTable.checkOrCreate(
        [
          "email TEXT NOT NULL COLLATE NOCASE UNIQUE",
          "password_hash TEXT NOT NULL",
          "password_salt TEXT NOT NULL",
          "role TEXT NOT NULL DEFAULT 'admin'",
          "created_at DATETIME DEFAULT CURRENT_TIMESTAMP",
        ],
        ["id INTEGER PRIMARY KEY AUTOINCREMENT"],
      );
      this.db.exec(
        `CREATE UNIQUE INDEX IF NOT EXISTS users_single_admin
         ON users(role)
         WHERE role = 'admin'`,
      );

      const brandingTable = new Table("branding", this.db);
      this.tables.push(brandingTable);
      brandingTable.checkOrCreate(
        [
          "brand_name TEXT NOT NULL",
          "primary_color TEXT NOT NULL",
          "font_color TEXT NOT NULL",
          "shadow_color TEXT",
          "logo BLOB",
          "logo_mime_type TEXT",
          "updated_at INTEGER NOT NULL DEFAULT 0",
        ],
        ["id INTEGER PRIMARY KEY CHECK (id = 1)"],
      );
    }
  }

  private migrateVotesToBallots(): void {
    const pollColumns = this.db
      .prepare("PRAGMA table_info(polls)")
      .all() as { name: string }[];

    if (!pollColumns.some((column) => column.name === "is_multiple_choice")) {
      this.db.exec(
        "ALTER TABLE polls ADD COLUMN is_multiple_choice BOOLEAN DEFAULT FALSE",
      );
    }

    const ballotColumns = this.db
      .prepare("PRAGMA table_info(ballots)")
      .all() as { name: string }[];

    if (!ballotColumns.some((column) => column.name === "voter_key")) {
      this.db.exec("ALTER TABLE ballots ADD COLUMN voter_key TEXT");
    }

    const voteColumns = this.db
      .prepare("PRAGMA table_info(votes)")
      .all() as { name: string }[];

    if (!voteColumns.some((column) => column.name === "ballot_id")) {
      this.db.exec("ALTER TABLE votes ADD COLUMN ballot_id INTEGER");
    }

    const legacyVotes = this.db
      .prepare(
        `SELECT id, poll_id, user_id, created_at
         FROM votes
         WHERE ballot_id IS NULL`,
      )
      .all() as {
        id: number;
        poll_id: number;
        user_id: string | null;
        created_at: string;
      }[];

    if (legacyVotes.length > 0) {
      const insertBallot = this.db.prepare(
        `INSERT INTO ballots (poll_id, user_id, created_at)
         VALUES (?, ?, ?)`,
      );
      const updateVote = this.db.prepare(
        "UPDATE votes SET ballot_id = ? WHERE id = ?",
      );

      this.db.exec("BEGIN");
      try {
        for (const vote of legacyVotes) {
          const result = insertBallot.run(
            vote.poll_id,
            vote.user_id,
            vote.created_at,
          );
          updateVote.run(result.lastInsertRowid, vote.id);
        }
        this.db.exec("COMMIT");
      } catch (error) {
        this.db.exec("ROLLBACK");
        throw error;
      }
    }

    this.db.exec(
      `CREATE INDEX IF NOT EXISTS ballots_poll_id_idx ON ballots(poll_id);
       CREATE UNIQUE INDEX IF NOT EXISTS ballots_poll_voter_key_unique
         ON ballots(poll_id, voter_key)
         WHERE voter_key IS NOT NULL;
       CREATE INDEX IF NOT EXISTS votes_ballot_id_idx ON votes(ballot_id);
       CREATE UNIQUE INDEX IF NOT EXISTS votes_ballot_option_unique
         ON votes(ballot_id, option_id)
         WHERE ballot_id IS NOT NULL;
       CREATE TRIGGER IF NOT EXISTS votes_single_choice_limit
       BEFORE INSERT ON votes
       WHEN (
         SELECT COALESCE(is_multiple_choice, FALSE)
         FROM polls
         WHERE id = NEW.poll_id
       ) = FALSE
       AND EXISTS (
         SELECT 1
         FROM votes
         WHERE ballot_id = NEW.ballot_id
       )
       BEGIN
         SELECT RAISE(ABORT, 'single-choice ballot can only contain one selection');
       END;`,
    );
  }
}
