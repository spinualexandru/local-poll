import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const fixtureRoot = fileURLToPath(new URL(".", import.meta.url));
const publicRoot = resolve(fixtureRoot, "../public");
const port = Number(process.env.COMPONENT_FIXTURE_PORT || 4173);

const contentTypes: Record<string, string> = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".mjs": "application/javascript; charset=utf-8",
  ".png": "image/png",
  ".ttf": "font/ttf",
};

const resolveRequestPath = (pathname: string): string | null => {
  if (pathname === "/") return resolve(fixtureRoot, "index.html");
  if (pathname === "/fixture.css" || pathname === "/fixture.mjs") {
    return resolve(fixtureRoot, pathname.slice(1));
  }

  const publicPath = resolve(publicRoot, `.${pathname}`);
  if (
    publicPath !== publicRoot &&
    !publicPath.startsWith(`${publicRoot}${sep}`)
  ) {
    return null;
  }
  return publicPath;
};

createServer(async (request, response) => {
  const pathname = new URL(request.url || "/", "http://localhost").pathname;
  const filePath = resolveRequestPath(pathname);

  if (!filePath) {
    response.writeHead(400).end("Invalid path");
    return;
  }

  try {
    const content = await readFile(filePath);
    response.writeHead(200, {
      "content-type":
        contentTypes[extname(filePath)] || "application/octet-stream",
      "cache-control": "no-store",
    });
    response.end(content);
  } catch {
    response.writeHead(404).end("Not found");
  }
}).listen(port, "127.0.0.1", () => {
  console.log(`Component fixture: http://127.0.0.1:${port}`);
});
