import type {DatabaseSync} from "node:sqlite";

export class Table {
    name: string;
    db: DatabaseSync;

    constructor(name: string, db: DatabaseSync) {
        this.name = name;
        this.db = db;
    }

    public isCreated(): boolean {
        // check if table with this.name exists in the database
        const query = `SELECT name
                       FROM sqlite_master
                       WHERE type = 'table'
                         AND name = ?;`;
        const result = this.db.prepare(query).get(this.name);
        return !!result;
    }

    public checkOrCreate(fields: string[], constraints: string[] = ["id INTEGER PRIMARY KEY AUTOINCREMENT"]): void {
        if (this.isCreated()) {
            console.warn(`[LoocalPoll]:table - Table ${this.name} already exists, skipping creation.`);
            return;
        }

        const query = `
            CREATE TABLE ${this.name}
            (
                ${fields.join(",\n")}${constraints.length ? ',\n' + constraints.join(",\n") : ''}
            );
        `;

        this.db.prepare(query).run();
        console.log(`[LoocalPoll]:table - Table ${this.name} created successfully.`);
    }
}
