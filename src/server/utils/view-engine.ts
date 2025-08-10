import type { IncomingHttpHeaders, ServerHttp2Stream } from "node:http2";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { queryParams } from "./request.ts";

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
   * Gets the path to the specified template based on NextJS-like routing.
   * @param template - The name of the template or route path.
   * @returns An object containing the template path and dynamic parameters.
   * @example
   * ```
   * const result = this.getTemplatePath("poll/1");
   * // Could resolve to: { path: "pages/poll/:id/index.html", dynamicParams: { id: "1" } }
   * ```
   */
  private getTemplatePath(template: string): {
    path: string;
    dynamicParams: Record<string, string>;
  } {
    // Handle root/home route
    if (template === "index" || template === "home" || template === "") {
      const homePath = path.join(ViewEngine.pagesPath, "home.html");
      if (fs.existsSync(homePath)) {
        return { path: homePath, dynamicParams: {} };
      }
      const homeIndexPath = path.join(
        ViewEngine.pagesPath,
        "home",
        "index.html"
      );
      if (fs.existsSync(homeIndexPath)) {
        return { path: homeIndexPath, dynamicParams: {} };
      }
      // Fallback to 404
      return this.get404Path();
    }

    // Split the route into segments
    const segments = template
      .split("/")
      .filter((segment) => segment.length > 0);

    // Try to find exact match first
    const exactMatch = this.findExactMatch(segments);
    if (exactMatch) {
      return exactMatch;
    }

    // Try to find dynamic match
    const dynamicMatch = this.findDynamicMatch(segments);
    if (dynamicMatch) {
      return dynamicMatch;
    }

    // Fallback to 404
    return this.get404Path();
  }

  /**
   * Finds an exact match for the given route segments.
   */
  private findExactMatch(
    segments: string[]
  ): { path: string; dynamicParams: Record<string, string> } | null {
    const routePath = segments.join("/");

    // Try index.html first
    const indexPath = path.join(ViewEngine.pagesPath, routePath, "index.html");
    if (fs.existsSync(indexPath)) {
      return { path: indexPath, dynamicParams: {} };
    }

    // Try direct .html file
    const directPath = path.join(ViewEngine.pagesPath, `${routePath}.html`);
    if (fs.existsSync(directPath)) {
      return { path: directPath, dynamicParams: {} };
    }

    return null;
  }

  /**
   * Finds a dynamic match for the given route segments.
   */
  private findDynamicMatch(
    segments: string[]
  ): { path: string; dynamicParams: Record<string, string> } | null {
    return this.searchDynamicRoutes(ViewEngine.pagesPath, segments, [], {});
  }

  /**
   * Recursively searches for dynamic routes.
   */
  private searchDynamicRoutes(
    currentPath: string,
    remainingSegments: string[],
    matchedSegments: string[],
    dynamicParams: Record<string, string>
  ): { path: string; dynamicParams: Record<string, string> } | null {
    if (remainingSegments.length === 0) {
      // Try to find index.html in current path
      const indexPath = path.join(currentPath, "index.html");
      if (fs.existsSync(indexPath)) {
        return { path: indexPath, dynamicParams };
      }

      // Try direct .html file
      const directPath = `${currentPath}.html`;
      if (fs.existsSync(directPath)) {
        return { path: directPath, dynamicParams };
      }

      return null;
    }

    const [currentSegment, ...restSegments] = remainingSegments;

    try {
      const entries = fs.readdirSync(currentPath, { withFileTypes: true });

      // First, try exact matches
      for (const entry of entries) {
        if (entry.isDirectory() && entry.name === currentSegment) {
          const result = this.searchDynamicRoutes(
            path.join(currentPath, entry.name),
            restSegments,
            [...matchedSegments, currentSegment],
            dynamicParams
          );
          if (result) return result;
        }
      }

      // Then, try dynamic matches (folders starting with :)
      for (const entry of entries) {
        if (entry.isDirectory() && entry.name.startsWith(":")) {
          const paramName = entry.name.substring(1); // Remove the ':' prefix
          const newDynamicParams = {
            ...dynamicParams,
            [paramName]: currentSegment,
          };

          const result = this.searchDynamicRoutes(
            path.join(currentPath, entry.name),
            restSegments,
            [...matchedSegments, entry.name],
            newDynamicParams
          );
          if (result) return result;
        }
      }
    } catch {
      // Directory doesn't exist or can't be read
    }

    return null;
  }

  /**
   * Gets the 404 error page path.
   */
  private get404Path(): {
    path: string;
    dynamicParams: Record<string, string>;
  } {
    const notFoundPath = path.join(ViewEngine.clientPath, "app", "404.html");
    if (fs.existsSync(notFoundPath)) {
      return { path: notFoundPath, dynamicParams: {} };
    }

    const notFoundIndexPath = path.join(
      ViewEngine.clientPath,
      "app",
      "404",
      "index.html"
    );
    if (fs.existsSync(notFoundIndexPath)) {
      return { path: notFoundIndexPath, dynamicParams: {} };
    }

    // Ultimate fallback - create a simple 404 response
    return { path: "", dynamicParams: {} };
  }

  /**
   * Loads the specified template.
   * @param template - The name of the template.
   * @returns An object containing the template content and dynamic parameters.
   * @example
   * ```
   * const result = this.loadTemplate("home");
   * ```
   */
  private loadTemplate(template: string): {
    content: string;
    dynamicParams: Record<string, string>;
  } {
    const { path: templatePath, dynamicParams } =
      this.getTemplatePath(template);
    try {
      if (!templatePath) {
        return { content: "<h1>404 - Page Not Found</h1>", dynamicParams };
      }
      const content = fs.readFileSync(templatePath, "utf-8");
      return { content, dynamicParams };
    } catch {
      return { content: "<h1>Template not found</h1>", dynamicParams: {} };
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
    return template.replace(/\{\{([\w.]+)\}\}/g, (_, key) => {
      // Support dot notation for nested properties
      const value = key
        .split(".")
        .reduce(
          (acc, k) => (acc && acc[k] !== undefined ? acc[k] : undefined),
          data
        );
      return value !== undefined ? String(value) : "";
    });
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
    const { content: rawTemplate, dynamicParams } = this.loadTemplate(template);
    const parsedTemplate = this.parseVariables(rawTemplate, {
      ...data,
      dynamicParams,
      queryParams: queryParams(this.headers[":path"]),
    });

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
