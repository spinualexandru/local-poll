import type { IncomingHttpHeaders, IncomingMessage } from "node:http";

const MAX_BODY_SIZE = 1024 * 1024 * 5; // 5MB
const JSON_CONTENT_TYPE = "application/json";

interface GetBodyOptions<T = unknown> {
  /**
   * Maximum allowed body size in bytes
   * @default 5MB
   */
  maxSize?: number;
  /**
   * Expected content type for validation
   * @default 'application/json'
   */
  contentType?: string;
  /**
   * Whether to parse JSON body automatically
   * @default true
   */
  parseJson?: boolean;
  /**
   * Headers to validate content type against
   */
  headers?: IncomingHttpHeaders;
}

export const queryParams = <T = Record<string, string>>(path: string): T => {
  // Ensure path is a string and prepend a dummy base if needed
  const url = new URL(path, path.startsWith("http") ? undefined : "http://_/");
  return Object.fromEntries(url.searchParams.entries()) as T;
};

/**
 * Parses the request body from a stream
 * @param request - The incoming HTTP request to read from
 * @param options - Configuration options
 * @returns Promise that resolves to the parsed body
 */
export const getBody = async <T = unknown>(
  request: IncomingMessage,
  options: GetBodyOptions<T> = {}
): Promise<T> => {
  const {
    maxSize = MAX_BODY_SIZE,
    contentType = JSON_CONTENT_TYPE,
    parseJson = true,
    headers = {},
  } = options;

  // Validate content type if headers are provided
  if (
    headers["content-type"] &&
    !headers["content-type"]?.startsWith(contentType)
  ) {
    throw new Error(`Unsupported content type. Expected: ${contentType}`);
  }

  const body = (await getRawBody(request, { maxSize })).toString("utf8");

  if (!parseJson) {
    return body as unknown as T;
  }

  if (!body.trim()) {
    return {} as T;
  }

  try {
    return JSON.parse(body) as T;
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    throw new Error(`Failed to parse request body: ${errorMessage}`);
  }
};

/**
 * Buffers the request body without decoding it, for binary payloads such as
 * multipart uploads.
 * @param request - The incoming HTTP request to read from
 * @param options - Configuration options
 * @returns Promise that resolves to the raw body buffer
 */
export const getRawBody = async (
  request: IncomingMessage,
  options: { maxSize?: number } = {}
): Promise<Buffer> => {
  const { maxSize = MAX_BODY_SIZE } = options;

  return new Promise((resolve, reject) => {
    let bodyLength = 0;
    const chunks: Buffer[] = [];

    const cleanup = () => {
      request.removeAllListeners("data");
      request.removeAllListeners("end");
      request.removeAllListeners("error");
    };

    request.on("data", (chunk: Buffer) => {
      bodyLength += chunk.length;

      if (bodyLength > maxSize) {
        cleanup();
        reject(
          new Error(`Request body too large. Maximum size is ${maxSize} bytes`)
        );
        return;
      }

      chunks.push(chunk);
    });

    request.on("end", () => {
      cleanup();
      resolve(Buffer.concat(chunks));
    });

    request.on("error", (error: Error) => {
      cleanup();
      reject(new Error(`Stream error: ${error.message}`));
    });
  });
};
