export type ApiErrorDetails = Record<string, unknown>;

export const URL_SAFETY_ERROR_CODE = {
  INVALID_URL: "INVALID_URL",
  UNSAFE_URL: "UNSAFE_URL",
  UNSUPPORTED_PROTOCOL: "UNSUPPORTED_PROTOCOL",
  UNSAFE_PORT: "UNSAFE_PORT",
} as const;

export type UrlSafetyErrorCode =
  (typeof URL_SAFETY_ERROR_CODE)[keyof typeof URL_SAFETY_ERROR_CODE];

export class MorselApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details: ApiErrorDetails;

  constructor(
    status: number,
    code: string,
    message: string,
    details: ApiErrorDetails = {},
  ) {
    super(message);
    this.name = "MorselApiError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}
