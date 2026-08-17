import type { IncomingMessage, ServerResponse } from "node:http";
import { BrandingService } from "../services/branding.ts";
import {
  BRANDING_LOGO_PATH,
  BRANDING_THEME_PATH,
  buildThemeCss,
} from "../utils/branding.ts";
import { Controller } from "../utils/controller.ts";
import { isCustomizationEnabled } from "../utils/customization.ts";

/**
 * Serves the instance theme and logo to every page, including the ones shown
 * before an administrator signs in.
 */
export class BrandingController extends Controller {
  private brandingService: BrandingService;

  constructor(brandingService = BrandingService.getInstance()) {
    super("BrandingController", "/branding");
    this.brandingService = brandingService;
  }

  public override async handleWebRequest(
    request: IncomingMessage,
    response: ServerResponse,
    pathname: string,
  ): Promise<boolean> {
    if (pathname !== BRANDING_THEME_PATH && pathname !== BRANDING_LOGO_PATH) {
      return false;
    }

    const method = request.method?.toUpperCase() || "GET";
    if (method !== "GET" && method !== "HEAD") {
      response.writeHead(405, {
        allow: "GET, HEAD",
        "content-type": "text/plain; charset=utf-8",
      });
      response.end("Method not allowed");
      return true;
    }

    if (pathname === BRANDING_THEME_PATH) {
      this.serveTheme(response);
      return true;
    }

    this.serveLogo(response);
    return true;
  }

  private serveTheme(response: ServerResponse): void {
    // An empty stylesheet keeps the layouts' link tag valid when customization
    // is turned off.
    const css = isCustomizationEnabled()
      ? buildThemeCss(this.brandingService.get())
      : "";

    response.writeHead(200, {
      "content-type": "text/css; charset=utf-8",
      "cache-control": this.cacheControl(),
      "content-length": Buffer.byteLength(css),
    });
    response.end(css);
  }

  private serveLogo(response: ServerResponse): void {
    const logo = isCustomizationEnabled()
      ? this.brandingService.getLogo()
      : null;

    if (!logo) {
      response.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
      response.end("Not found");
      return;
    }

    response.writeHead(200, {
      "content-type": logo.mimeType,
      "cache-control": this.cacheControl(),
      "content-length": logo.data.length,
    });
    response.end(logo.data);
  }

  /**
   * Both assets are requested with a version query that changes on every save,
   * so they can be cached aggressively outside development.
   */
  private cacheControl(): string {
    return process.env.NODE_ENV === "development"
      ? "no-store"
      : "public, max-age=31536000, immutable";
  }
}
