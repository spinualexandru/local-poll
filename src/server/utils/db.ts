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
    const votesTable = new Table("votes", this.db);
    this.tables = [pollsTable, votesTable];

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

    votesTable.checkOrCreate(
      [
        "id INTEGER PRIMARY KEY AUTOINCREMENT",
        "poll_id INTEGER NOT NULL",
        "option_id INTEGER NOT NULL",
        "user_id TEXT",
        "created_at DATETIME DEFAULT CURRENT_TIMESTAMP",
      ],
      ["FOREIGN KEY (poll_id) REFERENCES polls(id) ON DELETE CASCADE"]
    );

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
    }
  }
}
