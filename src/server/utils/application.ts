import type {
  Http2SecureServer,
  IncomingHttpHeaders,
  ServerHttp2Stream,
} from "node:http2";
import { createSecureServer } from "node:http2";
import { readFileSync, existsSync } from "node:fs";
import { join, extname } from "node:path";
import type { Controller } from "../utils/controller.ts";
import { queryParams } from "./request.ts";
import { Database } from "./db.ts";
import { ViewEngine } from "./view-engine.ts";

export class Application {
  private static instance: Application;
  controllers: Controller[];
  private server: Http2SecureServer;
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
    this.server = createSecureServer({
      key: readFileSync(
        join(process.cwd(), "/", process.env.HTTP2_PRIVATE_KEY)
      ),
      cert: readFileSync(
        join(process.cwd(), "/", process.env.HTTP2_CERTIFICATE)
      ),
      allowHTTP1: true,
    });
    this.port = parseInt(process.env.HTTP2_PORT || "3000", 10);
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
    this.server.listen(this.port, () => {
      console.log(
        `[${this.getAppName()}] Server is listening on port ${this.port}`
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

  public sendJSON(stream: ServerHttp2Stream, data: any) {
    stream.respond({
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-cache",
      ":status": 200,
    });
    stream.end(JSON.stringify(data));
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
  private serveStaticFile(stream: ServerHttp2Stream, pathname: string): void {
    const filePath = join(Application.publicPath, pathname);

    if (!existsSync(filePath)) {
      stream.respond({ ":status": 404 });
      stream.end("File not found");
      return;
    }

    try {
      const fileContent = readFileSync(filePath);
      const extension = extname(pathname).toLowerCase();
      const mimeType = this.getMimeType(extension);
      const isDev = process.env.NODE_ENV === "development";
      stream.respond({
        ":status": 200,
        "content-type": mimeType,
        "cache-control": isDev
          ? "private, no-cache, must-revalidate"
          : "public, max-age=86400", // Cache for 1 day
        "content-length": fileContent.length,
      });

      stream.end(fileContent);
    } catch (error) {
      console.error(`Error serving static file ${pathname}:`, error);
      stream.respond({ ":status": 500 });
      stream.end("Internal server error");
    }
  }

  public onStream(stream: ServerHttp2Stream, headers: IncomingHttpHeaders) {
    const rawPath = headers[":path"];
    const method = headers[":method"];
    // Remove query string for route matching
    const pathname = rawPath
      ? new URL(rawPath, `http://localhost`).pathname
      : "";
    const query = queryParams(rawPath);

    // Handle API requests
    const isAPIRequest = pathname.startsWith("/api");
    if (isAPIRequest) {
      for (const controller of this.controllers) {
        const handler = controller.getHandler(pathname, method);
        if (handler) {
          handler
            .call(controller, query, stream, headers)
            .then((data: any) => {
              this.sendJSON(stream, data);
            })
            .catch((error: Error) => {
              console.error(error);
              if (!stream.headersSent) {
                stream.respond({ ":status": 500 });
              }
              stream.end(JSON.stringify({ error: error.message }));
            });
          return;
        }
      }
      // If no API handler found, return 404
      stream.respond({ ":status": 404 });
      stream.end(JSON.stringify({ error: "API endpoint not found" }));
      return;
    }

    // Handle static files
    if (this.isStaticFile(pathname)) {
      this.serveStaticFile(stream, pathname);
      return;
    }

    // Handle dynamic routes with view engine
    const viewEngine = new ViewEngine(stream, headers);
    // Remove leading slash and use the pathname for template resolution
    const templatePath = pathname.startsWith("/")
      ? pathname.substring(1)
      : pathname;
    viewEngine.render(templatePath, {
      title: "Home",
      message: "Welcome to LocalPoll!",
    });
  }

  public handleEvents() {
    this.server.on("error", this.onError.bind(this));
    this.server.on("stream", this.onStream.bind(this));
  }

  public getServer(): Http2SecureServer {
    return this.server;
  }

  public getAppName(): string {
    return "LocalPoll";
  }

  public getVersion(): string {
    return "1.0.0";
  }
}
