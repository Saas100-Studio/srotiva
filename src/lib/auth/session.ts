import { createHmac, timingSafeEqual } from "node:crypto";

export const SESSION_COOKIE_NAME = "morsel_session";
export const SESSION_TTL_SECONDS = 60 * 60 * 24 * 30;

const MIN_SESSION_SECRET_LENGTH = 32;

type SessionPayload = {
  version: 1;
  userId: string;
  expiresAt: number;
};

type SessionOptions = {
  now?: Date;
  secret?: string;
  ttlSeconds?: number;
};

type SessionCookieOptions = SessionOptions & {
  secure?: boolean;
};

function sessionSecret(secret = process.env.SESSION_SECRET): string {
  if (!secret || secret.length < MIN_SESSION_SECRET_LENGTH) {
    throw new Error(
      `SESSION_SECRET must be at least ${MIN_SESSION_SECRET_LENGTH} characters.`,
    );
  }

  return secret;
}

function sign(value: string, secret: string): string {
  return createHmac("sha256", secret).update(value).digest("base64url");
}

export function createSessionToken(
  userId: string,
  options: SessionOptions = {},
): string {
  const now = options.now ?? new Date();
  const payload: SessionPayload = {
    version: 1,
    userId,
    expiresAt:
      Math.floor(now.getTime() / 1_000) +
      (options.ttlSeconds ?? SESSION_TTL_SECONDS),
  };
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString(
    "base64url",
  );

  return `${encodedPayload}.${sign(encodedPayload, sessionSecret(options.secret))}`;
}

export function verifySessionToken(
  token: string,
  options: SessionOptions = {},
): SessionPayload | null {
  const [encodedPayload, suppliedSignature, extra] = token.split(".");

  if (!encodedPayload || !suppliedSignature || extra) {
    return null;
  }

  const expectedSignature = sign(
    encodedPayload,
    sessionSecret(options.secret),
  );
  const suppliedBuffer = Buffer.from(suppliedSignature);
  const expectedBuffer = Buffer.from(expectedSignature);

  if (
    suppliedBuffer.length !== expectedBuffer.length ||
    !timingSafeEqual(suppliedBuffer, expectedBuffer)
  ) {
    return null;
  }

  try {
    const payload = JSON.parse(
      Buffer.from(encodedPayload, "base64url").toString("utf8"),
    ) as Partial<SessionPayload>;
    const nowSeconds = Math.floor(
      (options.now ?? new Date()).getTime() / 1_000,
    );

    if (
      payload.version !== 1 ||
      typeof payload.userId !== "string" ||
      !payload.userId ||
      typeof payload.expiresAt !== "number" ||
      !Number.isSafeInteger(payload.expiresAt) ||
      payload.expiresAt <= nowSeconds
    ) {
      return null;
    }

    return payload as SessionPayload;
  } catch {
    return null;
  }
}

function secureCookieDefault(): boolean {
  return process.env.NODE_ENV === "production";
}

export function createSessionCookie(
  userId: string,
  options: SessionCookieOptions = {},
): string {
  const token = createSessionToken(userId, options);
  const secure = options.secure ?? secureCookieDefault();
  const attributes = [
    `${SESSION_COOKIE_NAME}=${token}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    `Max-Age=${options.ttlSeconds ?? SESSION_TTL_SECONDS}`,
  ];

  if (secure) {
    attributes.push("Secure");
  }

  return attributes.join("; ");
}

export function clearSessionCookie(
  options: Pick<SessionCookieOptions, "secure"> = {},
): string {
  const attributes = [
    `${SESSION_COOKIE_NAME}=`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    "Max-Age=0",
    "Expires=Thu, 01 Jan 1970 00:00:00 GMT",
  ];

  if (options.secure ?? secureCookieDefault()) {
    attributes.push("Secure");
  }

  return attributes.join("; ");
}

export function sessionTokenFromCookieHeader(
  cookieHeader: string | null,
): string | null {
  if (!cookieHeader) {
    return null;
  }

  for (const cookie of cookieHeader.split(";")) {
    const separatorIndex = cookie.indexOf("=");
    if (separatorIndex < 0) {
      continue;
    }

    const name = cookie.slice(0, separatorIndex).trim();
    if (name === SESSION_COOKIE_NAME) {
      return cookie.slice(separatorIndex + 1).trim() || null;
    }
  }

  return null;
}
