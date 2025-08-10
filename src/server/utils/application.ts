import type {
  Http2SecureServer,
  IncomingHttpHeaders,
  ServerHttp2Stream,
} from "node:http2";
import { createSecureServer } from "node:http2";
import { readFileSync } from "node:fs";
import { join } from "node:path";
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

  public onStream(stream: ServerHttp2Stream, headers: IncomingHttpHeaders) {
    const rawPath = headers[":path"];
    const method = headers[":method"];
    // Remove query string for route matching
    const pathname = rawPath
      ? new URL(rawPath, `http://localhost`).pathname
      : "";
    const query = queryParams(rawPath);
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
    } else {
      const viewEngine = new ViewEngine(stream, headers);
      viewEngine.render("index", {
        title: "Home",
        message: "Welcome to LocalPoll!",
      });
    }
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
