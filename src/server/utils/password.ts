import {
  randomBytes,
  scrypt as scryptCallback,
  timingSafeEqual,
} from "node:crypto";
import { promisify } from "node:util";

const scrypt = promisify(scryptCallback);

export const MINIMUM_PASSWORD_LENGTH = 11;

export interface PasswordValidationResult {
  valid: boolean;
  errors: string[];
}

export const validatePassword = (
  password: string,
): PasswordValidationResult => {
  const errors: string[] = [];

  if (Array.from(password).length < MINIMUM_PASSWORD_LENGTH) {
    errors.push(`Password must be at least ${MINIMUM_PASSWORD_LENGTH} characters.`);
  }

  if (!/[^A-Za-z0-9\s]/.test(password)) {
    errors.push("Password must include at least one special character.");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
};

export const hashPassword = async (
  password: string,
): Promise<{ hash: string; salt: string }> => {
  const salt = randomBytes(16).toString("hex");
  const derivedKey = (await scrypt(password, salt, 64)) as Buffer;

  return {
    hash: derivedKey.toString("hex"),
    salt,
  };
};

export const verifyPassword = async (
  password: string,
  expectedHash: string,
  salt: string,
): Promise<boolean> => {
  const expected = Buffer.from(expectedHash, "hex");
  const actual = (await scrypt(password, salt, expected.length)) as Buffer;

  return expected.length === actual.length && timingSafeEqual(expected, actual);
};
