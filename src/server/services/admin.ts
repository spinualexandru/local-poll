import type { DatabaseSync } from "node:sqlite";
import type {
  AdminOperationResult,
  AdminUser,
} from "../types/admin.ts";
import { Database } from "../utils/db.ts";
import {
  hashPassword,
  validatePassword,
  verifyPassword,
} from "../utils/password.ts";

interface StoredAdmin extends AdminUser {
  password_hash: string;
  password_salt: string;
}

const normalizeEmail = (email: string): string => email.trim().toLowerCase();

const isValidEmail = (email: string): boolean =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= 254;

export class AdminService {
  private static instance: AdminService;
  private db: DatabaseSync;

  private constructor(db: DatabaseSync) {
    this.db = db;
  }

  public static getInstance(): AdminService {
    if (!AdminService.instance) {
      AdminService.instance = new AdminService(Database.getInstance().db);
    }
    return AdminService.instance;
  }

  public static create(db: DatabaseSync): AdminService {
    return new AdminService(db);
  }

  public hasAdmin(): boolean {
    const row = this.db
      .prepare("SELECT id FROM users WHERE role = 'admin' LIMIT 1")
      .get();
    return Boolean(row);
  }

  public async createAdmin(
    emailInput: string,
    password: string,
  ): Promise<AdminOperationResult> {
    const email = normalizeEmail(emailInput);
    const errors: string[] = [];

    if (!isValidEmail(email)) {
      errors.push("Enter a valid email address.");
    }

    errors.push(...validatePassword(password).errors);

    if (errors.length > 0) {
      return { success: false, errors };
    }

    if (this.hasAdmin()) {
      return {
        success: false,
        errors: ["The admin account has already been set up."],
      };
    }

    const { hash, salt } = await hashPassword(password);
    let result;
    try {
      result = this.db
        .prepare(
          `INSERT INTO users (email, password_hash, password_salt, role)
           SELECT ?, ?, ?, 'admin'
           WHERE NOT EXISTS (
             SELECT 1 FROM users WHERE role = 'admin'
           )`,
        )
        .run(email, hash, salt);
    } catch {
      return {
        success: false,
        errors: ["The admin account has already been set up."],
      };
    }

    if (result.changes !== 1) {
      return {
        success: false,
        errors: ["The admin account has already been set up."],
      };
    }

    const user = this.findAdminByEmail(email);
    return user
      ? { success: true, user }
      : { success: false, errors: ["The admin account could not be created."] };
  }

  public async authenticate(
    emailInput: string,
    password: string,
  ): Promise<AdminUser | null> {
    const storedAdmin = this.findStoredAdminByEmail(normalizeEmail(emailInput));
    if (!storedAdmin) {
      return null;
    }

    const valid = await verifyPassword(
      password,
      storedAdmin.password_hash,
      storedAdmin.password_salt,
    );

    if (!valid) {
      return null;
    }

    return {
      id: storedAdmin.id,
      email: storedAdmin.email,
      role: storedAdmin.role,
    };
  }

  public getAdminById(id: number): AdminUser | null {
    const row = this.db
      .prepare(
        "SELECT id, email, role FROM users WHERE id = ? AND role = 'admin'",
      )
      .get(id) as AdminUser | undefined;
    return row || null;
  }

  private findAdminByEmail(email: string): AdminUser | null {
    const row = this.db
      .prepare(
        "SELECT id, email, role FROM users WHERE email = ? AND role = 'admin'",
      )
      .get(email) as AdminUser | undefined;
    return row || null;
  }

  private findStoredAdminByEmail(email: string): StoredAdmin | null {
    const row = this.db
      .prepare(
        `SELECT id, email, role, password_hash, password_salt
         FROM users
         WHERE email = ? AND role = 'admin'`,
      )
      .get(email) as StoredAdmin | undefined;
    return row || null;
  }
}
