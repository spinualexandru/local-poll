import { randomBytes } from "node:crypto";
import type { IncomingMessage, ServerResponse } from "node:http";

interface Session {
  userId: number;
  expiresAt: number;
}

const SESSION_COOKIE_NAME = "localpoll_admin_session";
const SESSION_DURATION_SECONDS = 60 * 60 * 8;

const parseCookies = (cookieHeader: string | undefined): Map<string, string> => {
  const cookies = new Map<string, string>();
  if (!cookieHeader) {
    return cookies;
  }

  for (const item of cookieHeader.split(";")) {
    const separatorIndex = item.indexOf("=");
    if (separatorIndex === -1) {
      continue;
    }

    const name = item.slice(0, separatorIndex).trim();
    const value = item.slice(separatorIndex + 1).trim();
    cookies.set(name, value);
  }

  return cookies;
};

const requestUsesHttps = (request: IncomingMessage): boolean => {
  const forwardedProtocol = request.headers["x-forwarded-proto"];
  const protocol = Array.isArray(forwardedProtocol)
    ? forwardedProtocol[0]
    : forwardedProtocol;
  return protocol?.split(",")[0]?.trim().toLowerCase() === "https";
};

export class SessionService {
  private sessions = new Map<string, Session>();

  public create(
    response: ServerResponse,
    request: IncomingMessage,
    userId: number,
  ): void {
    this.removeExpiredSessions();
    const token = randomBytes(32).toString("base64url");
    this.sessions.set(token, {
      userId,
      expiresAt: Date.now() + SESSION_DURATION_SECONDS * 1000,
    });

    const secure = requestUsesHttps(request) ? "; Secure" : "";
    response.setHeader(
      "set-cookie",
      `${SESSION_COOKIE_NAME}=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${SESSION_DURATION_SECONDS}${secure}`,
    );
  }

  public getUserId(request: IncomingMessage): number | null {
    this.removeExpiredSessions();
    const token = parseCookies(request.headers.cookie).get(SESSION_COOKIE_NAME);
    if (!token) {
      return null;
    }

    return this.sessions.get(token)?.userId ?? null;
  }

  public destroy(
    response: ServerResponse,
    request: IncomingMessage,
  ): void {
    const token = parseCookies(request.headers.cookie).get(SESSION_COOKIE_NAME);
    if (token) {
      this.sessions.delete(token);
    }

    const secure = requestUsesHttps(request) ? "; Secure" : "";
    response.setHeader(
      "set-cookie",
      `${SESSION_COOKIE_NAME}=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0${secure}`,
    );
  }

  private removeExpiredSessions(): void {
    const now = Date.now();
    for (const [token, session] of this.sessions) {
      if (session.expiresAt <= now) {
        this.sessions.delete(token);
      }
    }
  }
}
