import type { IncomingHttpHeaders, ServerHttp2Stream } from "node:http2";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";

export class ViewEngine {
  private static clientPath = path.join(process.cwd(), "src", "client");
  private static pagesPath = path.join(ViewEngine.clientPath, "app", "pages");
  private static layoutPath = path.join(
    ViewEngine.clientPath,
    "app",
    "layout.html"
  );
  private static layoutCache: string | null = null;

  private stream: ServerHttp2Stream;
  private headers: IncomingHttpHeaders;

  /**
   * Creates an instance of the ViewEngine.
   * @description Initializes the ViewEngine with the provided HTTP/2 stream and headers.
   * @param stream - The HTTP/2 stream.
   * @param headers - The incoming HTTP headers.
   */
  constructor(stream: ServerHttp2Stream, headers: IncomingHttpHeaders) {
    this.stream = stream;
    this.headers = headers;
  }

  /**
   * Gets the layout template.
   * @returns The layout.html template as a string.
   */
  private static getLayout(): string {
    const isDev = process.env.NODE_ENV === "development";
    if (isDev) {
      try {
        return fs.readFileSync(this.layoutPath, "utf-8");
      } catch {
        return "<html><body>{{content}}</body></html>";
      }
    }
    if (this.layoutCache === null) {
      try {
        this.layoutCache = fs.readFileSync(this.layoutPath, "utf-8");
      } catch {
        this.layoutCache = "<html><body>{{content}}</body></html>";
      }
    }
    return this.layoutCache;
  }

  /**
   * Gets the path to the specified template.
   * @param template - The name of the template.
   * @returns The full path to the template file.
   * @example
   * ```
   * const templatePath = this.getTemplatePath("home");
   * // Resolves to: local-poll/src/client/app/pages/home.html
   * ```
   */
  private getTemplatePath(template: string): string {
    if (template === "index" || template === "home") {
      return path.join(ViewEngine.pagesPath, "home.html");
    }
    return path.join(ViewEngine.pagesPath, `${template}.html`);
  }

  /**
   * Loads the specified template.
   * @param template - The name of the template.
   * @returns The template content as a string.
   * @example
   * ```
   * const content = this.loadTemplate("home");
   * ```
   */
  private loadTemplate(template: string): string {
    const templatePath = this.getTemplatePath(template);
    try {
      return fs.readFileSync(templatePath, "utf-8");
    } catch {
      return "<h1>Template not found</h1>";
    }
  }

  /**
   * Parses the template and replaces variables with their corresponding values from the data object.
   * @param template - The template string.
   * @param data - The data object containing variable values.
   * @returns The parsed template with variables replaced.
   * @example
   * const data = { title: "Home", content: "Welcome to the homepage!" };
   * const result = this.parseVariables("{{title}} - {{content}}", data);
   * // result: "Home - Welcome to the homepage!"
   */
  private parseVariables(template: string, data: Record<string, any>): string {
    return template.replace(/\{\{(\w+)\}\}/g, (_, key) =>
      data[key] !== undefined ? String(data[key]) : ""
    );
  }

  /**
   * Renders the specified template with the provided data.
   * @param template - The name of the template to render.
   * @param data - The data to inject into the template.
   * @example
   * ```
   * this.render("home", { title: "Home", message: "Welcome to LocalPoll!" });
   * // In the example above, if you pass "index" instead of "home", it will render the home template.
   * ```
   */
  public render(template: string, data: Record<string, any> = {}): void {
    const rawTemplate = this.loadTemplate(template);
    const parsedTemplate = this.parseVariables(rawTemplate, data);

    // Insert into layout
    const layout = ViewEngine.getLayout();
    const finalHtml = layout.replace("{{content}}", parsedTemplate);

    if (!this.stream.headersSent) {
      this.stream.respond({
        ":status": 200,
        "content-type": "text/html; charset=utf-8",
      });
    }
    this.stream.end(finalHtml);
  }
}
