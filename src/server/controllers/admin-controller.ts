import type { IncomingMessage, ServerResponse } from "node:http";
import { AdminService } from "../services/admin.ts";
import { SessionService } from "../services/session.ts";
import { Controller } from "../utils/controller.ts";
import { isCustomizationEnabled } from "../utils/customization.ts";
import { escapeHtml } from "../utils/html.ts";
import { getBody } from "../utils/request.ts";
import { ViewEngine } from "../utils/view-engine.ts";

const normalizePathname = (pathname: string): string =>
  pathname.length > 1 ? pathname.replace(/\/+$/, "") : pathname;

export class AdminController extends Controller {
  private adminService: AdminService;
  private sessionService: SessionService;

  constructor(
    adminService = AdminService.getInstance(),
    sessionService = new SessionService(),
  ) {
    super("AdminController", "/admin");
    this.adminService = adminService;
    this.sessionService = sessionService;
  }

  public override async handleWebRequest(
    request: IncomingMessage,
    response: ServerResponse,
    rawPathname: string,
  ): Promise<boolean> {
    const pathname = normalizePathname(rawPathname);
    const method = request.method?.toUpperCase() || "GET";

    if (!isCustomizationEnabled()) {
      if (pathname.startsWith("/admin")) {
        this.renderNotFound(response, request.url || pathname);
        return true;
      }
      return false;
    }

    const hasAdmin = this.adminService.hasAdmin();
    if (!hasAdmin) {
      if (pathname !== "/admin/setup") {
        this.redirect(response, "/admin/setup");
        return true;
      }

      if (method === "GET") {
        this.renderSetup(response, request.url || pathname);
        return true;
      }

      if (method === "POST") {
        await this.completeSetup(request, response);
        return true;
      }

      this.methodNotAllowed(response, ["GET", "POST"]);
      return true;
    }

    if (pathname === "/admin/setup") {
      this.redirect(response, "/admin");
      return true;
    }

    if (pathname === "/admin/login") {
      if (this.sessionService.getUserId(request)) {
        this.redirect(response, "/admin");
        return true;
      }

      if (method === "GET") {
        this.renderLogin(response, request.url || pathname);
        return true;
      }

      if (method === "POST") {
        await this.login(request, response);
        return true;
      }

      this.methodNotAllowed(response, ["GET", "POST"]);
      return true;
    }

    if (pathname === "/admin/logout") {
      if (method !== "POST") {
        this.methodNotAllowed(response, ["POST"]);
        return true;
      }

      this.sessionService.destroy(response, request);
      this.redirect(response, "/admin/login");
      return true;
    }

    if (pathname === "/admin") {
      const userId = this.sessionService.getUserId(request);
      if (!userId) {
        this.redirect(response, "/admin/login");
        return true;
      }

      if (method !== "GET") {
        this.methodNotAllowed(response, ["GET"]);
        return true;
      }

      const admin = this.adminService.getAdminById(userId);
      if (!admin) {
        this.sessionService.destroy(response, request);
        this.redirect(response, "/admin/login");
        return true;
      }

      new ViewEngine(response, request.url || pathname).render(
        "admin/index",
        { adminEmail: escapeHtml(admin.email) },
        { layout: "admin" },
      );
      return true;
    }

    if (pathname.startsWith("/admin")) {
      this.renderNotFound(response, request.url || pathname);
      return true;
    }

    return false;
  }

  private async completeSetup(
    request: IncomingMessage,
    response: ServerResponse,
  ): Promise<void> {
    const form = await this.readForm(request);
    const email = form.get("email") || "";
    const password = form.get("password") || "";
    const result = await this.adminService.createAdmin(email, password);

    if (!result.success || !result.user) {
      this.renderSetup(
        response,
        request.url || "/admin/setup",
        (result.errors || ["The admin account could not be created."]).join(" "),
        email,
        422,
      );
      return;
    }

    this.sessionService.create(response, request, result.user.id);
    this.redirect(response, "/admin");
  }

  private async login(
    request: IncomingMessage,
    response: ServerResponse,
  ): Promise<void> {
    const form = await this.readForm(request);
    const email = form.get("email") || "";
    const password = form.get("password") || "";
    const user = await this.adminService.authenticate(email, password);

    if (!user) {
      this.renderLogin(
        response,
        request.url || "/admin/login",
        "The email or password is incorrect.",
        email,
        401,
      );
      return;
    }

    this.sessionService.create(response, request, user.id);
    this.redirect(response, "/admin");
  }

  private async readForm(request: IncomingMessage): Promise<URLSearchParams> {
    const body = await getBody<string>(request, {
      contentType: "application/x-www-form-urlencoded",
      headers: request.headers,
      parseJson: false,
      maxSize: 16 * 1024,
    });
    return new URLSearchParams(body);
  }

  private renderSetup(
    response: ServerResponse,
    requestUrl: string,
    error = "",
    email = "",
    statusCode = 200,
  ): void {
    new ViewEngine(response, requestUrl).render(
      "admin/setup",
      {
        email: escapeHtml(email),
        error: escapeHtml(error),
      },
      { layout: "auth", statusCode },
    );
  }

  private renderLogin(
    response: ServerResponse,
    requestUrl: string,
    error = "",
    email = "",
    statusCode = 200,
  ): void {
    new ViewEngine(response, requestUrl).render(
      "admin/login",
      {
        email: escapeHtml(email),
        error: escapeHtml(error),
      },
      { layout: "auth", statusCode },
    );
  }

  private renderNotFound(response: ServerResponse, requestUrl: string): void {
    new ViewEngine(response, requestUrl).render(
      "__not_found__",
      {},
      { statusCode: 404 },
    );
  }

  private redirect(response: ServerResponse, location: string): void {
    response.writeHead(303, {
      location,
      "cache-control": "no-store",
    });
    response.end();
  }

  private methodNotAllowed(
    response: ServerResponse,
    allowedMethods: string[],
  ): void {
    response.writeHead(405, {
      allow: allowedMethods.join(", "),
      "content-type": "text/plain; charset=utf-8",
    });
    response.end("Method not allowed");
  }
}
