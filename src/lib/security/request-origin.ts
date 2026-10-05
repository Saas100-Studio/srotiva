import { SrotivaApiError } from "../api/errors.ts";

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

type OriginOptions = {
  appUrl?: string;
  requireOrigin?: boolean;
};

function forbidden(): never {
  throw new SrotivaApiError(
    403,
    "INVALID_REQUEST_ORIGIN",
    "This request did not come from the Srotiva application.",
  );
}

export function assertTrustedMutationOrigin(
  request: Request,
  options: OriginOptions = {},
): void {
  if (SAFE_METHODS.has(request.method.toUpperCase())) return;

  const fetchSite = request.headers.get("sec-fetch-site")?.toLowerCase();
  if (fetchSite === "cross-site") forbidden();

  const origin = request.headers.get("origin");
  const requireOrigin = options.requireOrigin ?? process.env.NODE_ENV === "production";
  if (!origin) {
    if (requireOrigin) forbidden();
    return;
  }

  const configuredUrl = options.appUrl ?? process.env.APP_URL;
  if (!configuredUrl) {
    throw new Error("APP_URL is required to validate request origins.");
  }

  try {
    if (new URL(origin).origin !== new URL(configuredUrl).origin) forbidden();
  } catch (error) {
    if (error instanceof SrotivaApiError) throw error;
    forbidden();
  }
}
