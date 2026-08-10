const CRLF = "\r\n";
const HEADER_SEPARATOR = Buffer.from(`${CRLF}${CRLF}`);

export interface MultipartFile {
  fieldName: string;
  filename: string;
  contentType: string;
  data: Buffer;
}

export interface MultipartBody {
  fields: URLSearchParams;
  files: Map<string, MultipartFile>;
}

/**
 * Reads the boundary token out of a multipart content type header.
 * @returns The boundary, or null when the header is missing or not multipart.
 */
export const getMultipartBoundary = (
  contentType: string | undefined,
): string | null => {
  if (!contentType || !contentType.toLowerCase().startsWith("multipart/")) {
    return null;
  }

  const match = /;\s*boundary=(?:"([^"]+)"|([^;\s]+))/i.exec(contentType);
  const boundary = match?.[1] || match?.[2];
  return boundary ? boundary : null;
};

const parseHeaders = (raw: string): Map<string, string> => {
  const headers = new Map<string, string>();

  for (const line of raw.split(CRLF)) {
    const separatorIndex = line.indexOf(":");
    if (separatorIndex === -1) {
      continue;
    }

    headers.set(
      line.slice(0, separatorIndex).trim().toLowerCase(),
      line.slice(separatorIndex + 1).trim(),
    );
  }

  return headers;
};

const readDispositionParameter = (
  disposition: string,
  parameter: string,
): string => {
  const match = new RegExp(
    `;\\s*${parameter}=(?:"([^"]*)"|([^;]*))`,
    "i",
  ).exec(disposition);
  return (match?.[1] ?? match?.[2] ?? "").trim();
};

/**
 * Parses a multipart/form-data body without buffering it to disk.
 * @param body - The raw request body.
 * @param boundary - The boundary token from the content type header.
 * @returns Text fields and uploaded files keyed by their form field name.
 * @example
 * ```
 * const { fields, files } = parseMultipart(body, "----WebKitFormBoundary");
 * fields.get("brandName");
 * files.get("logo")?.data;
 * ```
 */
export const parseMultipart = (
  body: Buffer,
  boundary: string,
): MultipartBody => {
  const fields = new URLSearchParams();
  const files = new Map<string, MultipartFile>();
  const delimiter = Buffer.from(`--${boundary}`);

  let delimiterIndex = body.indexOf(delimiter);
  if (delimiterIndex === -1) {
    throw new Error("Malformed multipart body: boundary not found");
  }

  while (delimiterIndex !== -1) {
    const afterDelimiter = delimiterIndex + delimiter.length;
    const isClosingDelimiter =
      body[afterDelimiter] === 0x2d && body[afterDelimiter + 1] === 0x2d;
    if (isClosingDelimiter) {
      break;
    }

    const partStart = body.indexOf(Buffer.from(CRLF), afterDelimiter);
    if (partStart === -1) {
      break;
    }

    const nextDelimiterIndex = body.indexOf(delimiter, partStart);
    if (nextDelimiterIndex === -1) {
      throw new Error("Malformed multipart body: unterminated part");
    }

    // The CRLF in front of the next delimiter belongs to the delimiter itself.
    const partEnd = Math.max(partStart, nextDelimiterIndex - CRLF.length);
    const part = body.subarray(partStart + CRLF.length, partEnd);
    const headerEnd = part.indexOf(HEADER_SEPARATOR);

    if (headerEnd !== -1) {
      const headers = parseHeaders(part.subarray(0, headerEnd).toString("utf8"));
      const disposition = headers.get("content-disposition") || "";
      const fieldName = readDispositionParameter(disposition, "name");
      const data = part.subarray(headerEnd + HEADER_SEPARATOR.length);

      if (fieldName) {
        if (/;\s*filename=/i.test(disposition)) {
          files.set(fieldName, {
            fieldName,
            filename: readDispositionParameter(disposition, "filename"),
            contentType: (
              headers.get("content-type") || "application/octet-stream"
            )
              .split(";")[0]
              .trim()
              .toLowerCase(),
            data,
          });
        } else {
          fields.append(fieldName, data.toString("utf8"));
        }
      }
    }

    delimiterIndex = nextDelimiterIndex;
  }

  return { fields, files };
};
