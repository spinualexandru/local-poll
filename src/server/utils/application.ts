import type { IncomingMessage, Server, ServerResponse } from "node:http";
import { createServer } from "node:http";
import { readFileSync, existsSync } from "node:fs";
import { join, extname } from "node:path";
import type { Controller } from "../utils/controller.ts";
import { queryParams } from "./request.ts";
import { Database } from "./db.ts";
import { ViewEngine } from "./view-engine.ts";

export class Application {
  private static instance: Application;
  controllers: Controller[];
  private server: Server;
  private host: string;
  private port: number;
  private database: Database;
  private static publicPath = join(process.cwd(), "src", "client", "public");

  // Known file extensions that should be served as static files
  private static staticFileExtensions = new Set([
    ".png",
    ".jpg",
    ".jpeg",
    ".gif",
    ".svg",
    ".ico",
    ".webp",
    ".bmp",
    ".ttf",
    ".woff",
    ".woff2",
    ".eot",
    ".otf",
    ".css",
    ".js",
    ".map",
    ".json",
    ".xml",
    ".txt",
    ".csv",
    ".pdf",
    ".doc",
    ".docx",
    ".xls",
    ".xlsx",
    ".ppt",
    ".pptx",
    ".zip",
    ".tar",
    ".gz",
    ".rar",
    ".mp3",
    ".mp4",
    ".avi",
    ".mov",
    ".wmv",
    ".flv",
    ".ts",
    ".mjs",
    ".html",
    ".htm",
  ]);

  private constructor() {
    this.server = createServer((request, response) => {
      void this.onRequest(request, response).catch((error: unknown) => {
        const requestError =
          error instanceof Error ? error : new Error("Unknown request error");
        this.onError(requestError);
        if (!response.headersSent) {
          response.writeHead(500, {
            "content-type": "text/plain; charset=utf-8",
          });
        }
        response.end("Internal server error");
      });
    });
    this.host = process.env.HOST || "127.0.0.1";
    this.port = parseInt(process.env.PORT || "3000", 10);
    this.controllers = [];
    this.database = Database.getInstance();
    this.database.setupTables();
  }

  public static getInstance(): Application {
    if (!Application.instance) {
      Application.instance = new Application();
    }
    return Application.instance;
  }

  public serve() {
    this.handleEvents();
    this.server.listen(this.port, this.host, () => {
      console.log(
        `[${this.getAppName()}] Server is listening at http://${this.host}:${this.port}`
      );
    });
  }

  public onError(error: Error) {
    console.error(error);
  }

  public registerController(controller: Controller) {
    this.controllers.push(controller);
    console.log(
      `[${this.getAppName()}] Registered controller: ${controller.getName()}`
    );
  }

  public sendJSON(response: ServerResponse, data: any) {
    response.writeHead(200, {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-cache",
    });
    response.end(JSON.stringify(data));
  }

  /**
   * Check if a path represents a static file based on its extension
   */
  private isStaticFile(pathname: string): boolean {
    const ext = extname(pathname).toLowerCase();
    return Application.staticFileExtensions.has(ext);
  }

  /**
   * Get MIME type based on file extension
   */
  private getMimeType(extension: string): string {
    const mimeTypes: Record<string, string> = {
      ".png": "image/png",
      ".jpg": "image/jpeg",
      ".jpeg": "image/jpeg",
      ".gif": "image/gif",
      ".svg": "image/svg+xml",
      ".ico": "image/x-icon",
      ".webp": "image/webp",
      ".bmp": "image/bmp",
      ".ttf": "font/ttf",
      ".woff": "font/woff",
      ".woff2": "font/woff2",
      ".eot": "application/vnd.ms-fontobject",
      ".otf": "font/otf",
      ".css": "text/css",
      ".js": "application/javascript",
      ".mjs": "application/javascript",
      ".cjs": "application/javascript",
      ".ts": "application/javascript",
      ".map": "application/json",
      ".json": "application/json",
      ".xml": "application/xml",
      ".txt": "text/plain",
      ".csv": "text/csv",
      ".pdf": "application/pdf",
      ".html": "text/html",
      ".htm": "text/html",
    };
    return mimeTypes[extension] || "application/octet-stream";
  }

  /**
   * Serve static files from the public directory
   */
  private serveStaticFile(response: ServerResponse, pathname: string): void {
    const filePath = join(Application.publicPath, pathname);

    if (!existsSync(filePath)) {
      response.writeHead(404);
      response.end("File not found");
      return;
    }

    try {
      const fileContent = readFileSync(filePath);
      const extension = extname(pathname).toLowerCase();
      const mimeType = this.getMimeType(extension);
      const isDev = process.env.NODE_ENV === "development";
      response.writeHead(200, {
        "content-type": mimeType,
        "cache-control": isDev
          ? "private, no-cache, must-revalidate"
          : "public, max-age=86400", // Cache for 1 day
        "content-length": fileContent.length,
      });

      response.end(fileContent);
    } catch (error) {
      console.error(`Error serving static file ${pathname}:`, error);
      response.writeHead(500);
      response.end("Internal server error");
    }
  }

  public async onRequest(
    request: IncomingMessage,
    response: ServerResponse,
  ): Promise<void> {
    const rawPath = request.url || "/";
    const method = request.method || "GET";
    // Remove query string for route matching
    const pathname = new URL(rawPath, "http://localhost").pathname;
    const query = queryParams(rawPath);

    // Static assets stay available while first-time setup gates application routes.
    if (this.isStaticFile(pathname)) {
      this.serveStaticFile(response, pathname);
      return;
    }

    // Give controllers an opportunity to handle browser routes and route guards.
    for (const controller of this.controllers) {
      if (await controller.handleWebRequest(request, response, pathname)) {
        return;
      }
    }

    // Handle API requests
    const isAPIRequest = pathname.startsWith("/api");
    if (isAPIRequest) {
      for (const controller of this.controllers) {
        const handler = controller.getHandler(pathname, method);
        if (handler) {
          handler
            .call(controller, query, request, request.headers)
            .then((data: any) => {
              this.sendJSON(response, data);
            })
            .catch((error: Error) => {
              console.error(error);
              if (!response.headersSent) {
                response.writeHead(500, {
                  "content-type": "application/json; charset=utf-8",
                });
              }
              response.end(JSON.stringify({ error: error.message }));
            });
          return;
        }
      }
      // If no API handler found, return 404
      response.writeHead(404, {
        "content-type": "application/json; charset=utf-8",
      });
      response.end(JSON.stringify({ error: "API endpoint not found" }));
      return;
    }

    // Handle dynamic routes with view engine
    const viewEngine = new ViewEngine(response, rawPath, {
      cookieHeader: request.headers.cookie,
    });
    // Remove leading slash and use the pathname for template resolution
    const templatePath = pathname.startsWith("/")
      ? pathname.substring(1)
      : pathname;
    viewEngine.render(
      templatePath,
      {
        title: "Home",
        message: "Welcome to LocalPoll!",
      },
      {
        layoutVariant:
          templatePath === "" ||
          templatePath === "home" ||
          templatePath === "index"
            ? "landing"
            : "public",
      },
    );
  }

  public handleEvents() {
    this.server.on("error", this.onError.bind(this));
  }

  public getServer(): Server {
    return this.server;
  }

  public getAppName(): string {
    return "LocalPoll";
  }

  public getVersion(): string {
    return "1.0.0";
  }
}
