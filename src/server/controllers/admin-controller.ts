import type { IncomingMessage, ServerResponse } from "node:http";
import { AdminService } from "../services/admin.ts";
import { BrandingService } from "../services/branding.ts";
import { SessionService } from "../services/session.ts";
import type { AdminUser } from "../types/admin.ts";
import type { Branding, BrandingLogo } from "../types/branding.ts";
import {
  DEFAULT_BRANDING,
  DEFAULT_LOGO_URL,
  INHERIT_SHADOW_LABEL,
  MAX_LOGO_SIZE,
  getLogoUrl,
  normalizeHexColor,
  validateBrandingSettings,
  validateLogo,
} from "../utils/branding.ts";
import { Controller } from "../utils/controller.ts";
import { isCustomizationEnabled } from "../utils/customization.ts";
import { escapeHtml } from "../utils/html.ts";
import { getMultipartBoundary, parseMultipart } from "../utils/multipart.ts";
import type { MultipartFile } from "../utils/multipart.ts";
import { getBody, getRawBody, queryParams } from "../utils/request.ts";
import { ViewEngine } from "../utils/view-engine.ts";

const normalizePathname = (pathname: string): string =>
  pathname.length > 1 ? pathname.replace(/\/+$/, "") : pathname;

/** Room for the form fields that travel alongside an uploaded logo. */
const MAX_BRANDING_BODY_SIZE = MAX_LOGO_SIZE + 64 * 1024;

interface BrandingFormView {
  brandName: string;
  primaryColor: string;
  fontColor: string;
  shadowSwatch: string;
  shadowText: string;
  shadowInherited: boolean;
  logoUrl: string;
}

const toFormView = (branding: Branding): BrandingFormView => ({
  brandName: branding.brandName,
  primaryColor: branding.primaryColor,
  fontColor: branding.fontColor,
  shadowSwatch: branding.shadowColor || branding.fontColor,
  shadowText: branding.shadowColor || INHERIT_SHADOW_LABEL,
  shadowInherited: !branding.shadowColor,
  logoUrl: getLogoUrl(branding),
});

export class AdminController extends Controller {
  private adminService: AdminService;
  private brandingService: BrandingService;
  private sessionService: SessionService;

  constructor(
    adminService = AdminService.getInstance(),
    sessionService = new SessionService(),
    brandingService = BrandingService.getInstance(),
  ) {
    super("AdminController", "/admin");
    this.adminService = adminService;
    this.brandingService = brandingService;
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
        this.renderNotFound(response, request);
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
        this.renderSetup(response, request);
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
        this.renderLogin(response, request);
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

    if (pathname === "/admin/branding") {
      const admin = this.resolveAdmin(request, response);
      if (!admin) {
        return true;
      }

      if (method === "POST") {
        await this.saveBranding(request, response, admin);
        return true;
      }

      if (method !== "GET") {
        this.methodNotAllowed(response, ["GET", "POST"]);
        return true;
      }

      const saved = queryParams(request.url || pathname).saved === "1";
      this.renderBranding(response, request, admin, {
        view: toFormView(this.brandingService.get()),
        message: saved ? "Branding saved." : "",
        variant: "success",
      });
      return true;
    }

    if (pathname === "/admin") {
      const admin = this.resolveAdmin(request, response);
      if (!admin) {
        return true;
      }

      if (method !== "GET") {
        this.methodNotAllowed(response, ["GET"]);
        return true;
      }

      this.view(response, request).render(
        "admin/index",
        {
          adminEmail: escapeHtml(admin.email),
          pageTitle: "Admin",
          dashboardCurrent: 'aria-current="page"',
          brandingCurrent: "",
        },
        { layout: "admin" },
      );
      return true;
    }

    if (pathname.startsWith("/admin")) {
      this.renderNotFound(response, request);
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
        request,
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
        request,
        "The email or password is incorrect.",
        email,
        401,
      );
      return;
    }

    this.sessionService.create(response, request, user.id);
    this.redirect(response, "/admin");
  }

  /**
   * Resolves the signed-in administrator, redirecting to the login page when
   * the session is missing or no longer matches an admin account.
   * @returns The administrator, or null when the response was already sent.
   */
  private resolveAdmin(
    request: IncomingMessage,
    response: ServerResponse,
  ): AdminUser | null {
    const userId = this.sessionService.getUserId(request);
    if (!userId) {
      this.redirect(response, "/admin/login");
      return null;
    }

    const admin = this.adminService.getAdminById(userId);
    if (!admin) {
      this.sessionService.destroy(response, request);
      this.redirect(response, "/admin/login");
      return null;
    }

    return admin;
  }

  private async saveBranding(
    request: IncomingMessage,
    response: ServerResponse,
    admin: AdminUser,
  ): Promise<void> {
    const stored = this.brandingService.get();

    let fields: URLSearchParams;
    let files: Map<string, MultipartFile>;
    try {
      ({ fields, files } = await this.readBrandingForm(request));
    } catch {
      this.renderBranding(response, request, admin, {
        view: toFormView(stored),
        message: `The submitted branding was too large. Choose a logo smaller than ${MAX_LOGO_SIZE / 1024}KB.`,
        variant: "error",
        statusCode: 413,
      });
      return;
    }

    const brandName = fields.get("brandName") ?? stored.brandName;
    const primaryColor = this.readColorField(fields, "primaryColor");
    const fontColor = this.readColorField(fields, "fontColor");
    // A blank shadow field is how the color picker reports inheritance, so the
    // text input wins even when it is empty.
    const shadowColor =
      fields.get("shadowColorHex") ??
      fields.get("shadowColor") ??
      (stored.shadowColor || INHERIT_SHADOW_LABEL);

    const settings = validateBrandingSettings({
      brandName,
      primaryColor,
      fontColor,
      shadowColor,
    });

    const upload = files.get("logo");
    const hasUpload = Boolean(
      upload && upload.filename.trim() !== "" && upload.data.length > 0,
    );
    const logo = hasUpload
      ? validateLogo(upload as MultipartFile)
      : { errors: [] as string[], values: undefined as BrandingLogo | undefined };

    const errors = [...settings.errors, ...logo.errors];
    if (errors.length > 0 || !settings.values) {
      const resolvedFontColor = normalizeHexColor(fontColor) || stored.fontColor;
      this.renderBranding(response, request, admin, {
        view: {
          brandName,
          primaryColor: normalizeHexColor(primaryColor) || stored.primaryColor,
          fontColor: resolvedFontColor,
          shadowSwatch: normalizeHexColor(shadowColor) || resolvedFontColor,
          shadowText: shadowColor.trim() || INHERIT_SHADOW_LABEL,
          shadowInherited: !normalizeHexColor(shadowColor),
          logoUrl: getLogoUrl(stored),
        },
        message: errors.join(" "),
        variant: "error",
        statusCode: 422,
      });
      return;
    }

    this.brandingService.save(settings.values, logo.values ?? null);
    if (!hasUpload && fields.get("removeLogo") === "1") {
      this.brandingService.clearLogo();
    }

    this.redirect(response, "/admin/branding?saved=1");
  }

  /**
   * Reads the branding form, which arrives as multipart when a logo is
   * attached and as urlencoded otherwise.
   */
  private async readBrandingForm(request: IncomingMessage): Promise<{
    fields: URLSearchParams;
    files: Map<string, MultipartFile>;
  }> {
    const boundary = getMultipartBoundary(request.headers["content-type"]);
    if (!boundary) {
      return { fields: await this.readForm(request), files: new Map() };
    }

    const body = await getRawBody(request, { maxSize: MAX_BRANDING_BODY_SIZE });
    return parseMultipart(body, boundary);
  }

  /**
   * Reads a color from the picker, preferring the hex text input and falling
   * back to the swatch it mirrors.
   */
  private readColorField(fields: URLSearchParams, name: string): string {
    const text = fields.get(`${name}Hex`);
    if (text !== null && text.trim() !== "") {
      return text;
    }
    return fields.get(name) || "";
  }

  private renderBranding(
    response: ServerResponse,
    request: IncomingMessage,
    admin: AdminUser,
    options: {
      view: BrandingFormView;
      message: string;
      variant: "success" | "error";
      statusCode?: number;
    },
  ): void {
    const { view, message, variant, statusCode = 200 } = options;
    // A reset is only worth showing for a value that has moved off its default.
    const hiddenWhen = (atDefault: boolean): string => (atDefault ? "hidden" : "");
    const brandNameIsDefault = view.brandName === DEFAULT_BRANDING.brandName;
    const primaryIsDefault = view.primaryColor === DEFAULT_BRANDING.primaryColor;
    const fontIsDefault = view.fontColor === DEFAULT_BRANDING.fontColor;
    const shadowIsDefault = view.shadowText === INHERIT_SHADOW_LABEL;

    this.view(response, request).render(
      "admin/branding",
      {
        adminEmail: escapeHtml(admin.email),
        pageTitle: "Branding",
        dashboardCurrent: "",
        brandingCurrent: 'aria-current="page"',
        brandNameValue: escapeHtml(view.brandName),
        defaultBrandName: escapeHtml(DEFAULT_BRANDING.brandName),
        defaultPrimaryColor: DEFAULT_BRANDING.primaryColor,
        defaultFontColor: DEFAULT_BRANDING.fontColor,
        defaultShadowColorText: INHERIT_SHADOW_LABEL,
        defaultLogoUrl: DEFAULT_LOGO_URL,
        generalResetHidden: hiddenWhen(brandNameIsDefault),
        brandNameResetHidden: hiddenWhen(brandNameIsDefault),
        themeResetHidden: hiddenWhen(
          primaryIsDefault && fontIsDefault && shadowIsDefault,
        ),
        primaryResetHidden: hiddenWhen(primaryIsDefault),
        fontResetHidden: hiddenWhen(fontIsDefault),
        shadowResetHidden: hiddenWhen(shadowIsDefault),
        logoResetHidden: hiddenWhen(view.logoUrl === DEFAULT_LOGO_URL),
        primaryColorValue: escapeHtml(view.primaryColor),
        fontColorValue: escapeHtml(view.fontColor),
        shadowColorValue: escapeHtml(view.shadowSwatch),
        shadowColorText: escapeHtml(view.shadowText),
        shadowInherited: view.shadowInherited ? "inherited" : "",
        logoPreviewUrl: escapeHtml(view.logoUrl),
        statusMessage: escapeHtml(message),
        statusVariant: variant,
        statusHidden: message ? "" : "hidden",
      },
      { layout: "admin", statusCode },
    );
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
    request: IncomingMessage,
    error = "",
    email = "",
    statusCode = 200,
  ): void {
    this.view(response, request).render(
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
    request: IncomingMessage,
    error = "",
    email = "",
    statusCode = 200,
  ): void {
    this.view(response, request).render(
      "admin/login",
      {
        email: escapeHtml(email),
        error: escapeHtml(error),
      },
      { layout: "auth", statusCode },
    );
  }

  private renderNotFound(
    response: ServerResponse,
    request: IncomingMessage,
  ): void {
    this.view(response, request).render(
      "__not_found__",
      {},
      { statusCode: 404 },
    );
  }

  /** A view engine that knows the request its page is answering. */
  private view(
    response: ServerResponse,
    request: IncomingMessage,
  ): ViewEngine {
    return new ViewEngine(response, request.url || "/", {
      cookieHeader: request.headers.cookie,
    });
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
