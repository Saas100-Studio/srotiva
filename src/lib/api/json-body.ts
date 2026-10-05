import { SrotivaApiError } from "./errors.ts";
import { loadEnv } from "../config/env.ts";

type JsonBodyOptions = {
  invalidJsonError?: () => SrotivaApiError;
  maxBytes?: number;
};

function defaultInvalidJsonError(): SrotivaApiError {
  return new SrotivaApiError(
    422,
    "VALIDATION_ERROR",
    "The request body must be valid JSON.",
  );
}

function bodyTooLarge(maxBytes: number): SrotivaApiError {
  return new SrotivaApiError(
    413,
    "REQUEST_BODY_TOO_LARGE",
    `The request body must not exceed ${maxBytes} bytes.`,
    { maxBytes },
  );
}

export async function readBoundedJsonBody(
  request: Request,
  options: JsonBodyOptions = {},
): Promise<unknown> {
  const maxBytes = options.maxBytes ?? loadEnv().REQUEST_JSON_MAX_BYTES;
  const contentLength = request.headers.get("content-length");
  if (contentLength !== null) {
    const declaredBytes = Number(contentLength);
    if (Number.isFinite(declaredBytes) && declaredBytes > maxBytes) {
      throw bodyTooLarge(maxBytes);
    }
  }

  const reader = request.body?.getReader();
  if (!reader) throw (options.invalidJsonError ?? defaultInvalidJsonError)();

  const chunks: Uint8Array[] = [];
  let bytesRead = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      bytesRead += value.byteLength;
      if (bytesRead > maxBytes) {
        await reader.cancel();
        throw bodyTooLarge(maxBytes);
      }
      chunks.push(value);
    }
  } catch (error) {
    if (error instanceof SrotivaApiError) throw error;
    throw (options.invalidJsonError ?? defaultInvalidJsonError)();
  }

  const bytes = new Uint8Array(bytesRead);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }

  try {
    return JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
  } catch {
    throw (options.invalidJsonError ?? defaultInvalidJsonError)();
  }
}
