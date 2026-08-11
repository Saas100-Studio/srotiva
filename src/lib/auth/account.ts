import { randomUUID } from "node:crypto";

import { Prisma, WorkspaceRole } from "@prisma/client";

import { MorselApiError } from "../api/errors.ts";
import {
  writeAuditLog,
  type AuditLogClient,
  type WriteAuditLogInput,
} from "../audit/audit-log.ts";
import { getDb } from "../db/client.ts";
import {
  findCurrentUserById,
  type CurrentUser,
} from "./current-user.ts";
import { hashPassword, verifyPassword } from "./password.ts";

const MAX_RANDOM_SLUG_ATTEMPTS = 5;

type AuditWriter = (
  input: WriteAuditLogInput,
  client?: AuditLogClient,
) => ReturnType<typeof writeAuditLog>;

export type SignupDependencies = {
  writeAuditLog?: AuditWriter;
};

export type AuthInput = {
  email: string;
  password: string;
  name?: string;
};

function validationError(details: Record<string, string>): MorselApiError {
  return new MorselApiError(
    400,
    "VALIDATION_ERROR",
    "Check the submitted fields and try again.",
    details,
  );
}

export function parseAuthInput(
  value: unknown,
  options: { requireName: boolean },
): AuthInput {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw validationError({ body: "A JSON object is required." });
  }

  const input = value as Record<string, unknown>;
  const email = typeof input.email === "string" ? input.email.trim().toLowerCase() : "";
  const password = typeof input.password === "string" ? input.password : "";
  const name = typeof input.name === "string" ? input.name.trim() : "";
  const errors: Record<string, string> = {};

  if (
    !email ||
    email.length > 254 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  ) {
    errors.email = "Enter a valid email address.";
  }
  if (password.length < 8 || password.length > 128) {
    errors.password = "Password must be between 8 and 128 characters.";
  }
  if (options.requireName && (!name || name.length > 100)) {
    errors.name = "Name must be between 1 and 100 characters.";
  } else if (name.length > 100) {
    errors.name = "Name must be no more than 100 characters.";
  }

  if (Object.keys(errors).length > 0) {
    throw validationError(errors);
  }

  return { email, password, ...(name ? { name } : {}) };
}

export async function readJsonBody(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    throw validationError({ body: "A valid JSON body is required." });
  }
}

function workspaceSlugBase(email: string): string {
  const prefix = email.split("@")[0] ?? "workspace";
  return (
    prefix
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 48) || "workspace"
  );
}

function workspaceSlug(slugBase: string, attempt: number): string {
  if (attempt === 0) {
    return slugBase;
  }

  const suffix = randomUUID().replaceAll("-", "").slice(0, 12);
  return `${slugBase}-${suffix}`;
}

function uniqueField(error: unknown, field: string): boolean {
  if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== "P2002") {
    return false;
  }

  const target = error.meta?.target;
  return Array.isArray(target)
    ? target.some((item) => String(item).includes(field))
    : String(target ?? "").includes(field);
}

function emailTaken(): MorselApiError {
  return new MorselApiError(
    409,
    "EMAIL_TAKEN",
    "An account with this email already exists.",
  );
}

export async function signup(
  input: AuthInput,
  dependencies: SignupDependencies = {},
): Promise<CurrentUser> {
  const db = getDb();
  const writeSignupAuditLog = dependencies.writeAuditLog ?? writeAuditLog;
  const passwordHash = await hashPassword(input.password);
  const slugBase = workspaceSlugBase(input.email);
  const workspaceName = `${input.name ?? input.email.split("@")[0]}'s Workspace`;

  if (await db.user.findUnique({ where: { email: input.email }, select: { id: true } })) {
    throw emailTaken();
  }

  for (let attempt = 0; attempt <= MAX_RANDOM_SLUG_ATTEMPTS; attempt += 1) {
    const slug = workspaceSlug(slugBase, attempt);

    try {
      const user = await db.$transaction(async (transaction) => {
        const createdUser = await transaction.user.create({
          data: {
            email: input.email,
            name: input.name ?? null,
            passwordHash,
          },
        });

        const workspace = await transaction.workspace.create({
          data: {
            name: workspaceName,
            slug,
            ownerUserId: createdUser.id,
            members: {
              create: {
                userId: createdUser.id,
                role: WorkspaceRole.OWNER,
                joinedAt: new Date(),
              },
            },
          },
        });

        await writeSignupAuditLog(
          {
            workspaceId: workspace.id,
            actorUserId: createdUser.id,
            action: "auth.signup",
            targetType: "user",
            targetId: createdUser.id,
            metadata: { authenticationMethod: "password" },
          },
          transaction,
        );

        return createdUser;
      });
      const currentUser = await findCurrentUserById(user.id);

      if (!currentUser) {
        throw new Error("The new account has no active workspace.");
      }

      return currentUser;
    } catch (error) {
      if (uniqueField(error, "email")) {
        throw emailTaken();
      }
      if (uniqueField(error, "slug")) {
        continue;
      }
      throw error;
    }
  }

  throw new MorselApiError(
    409,
    "WORKSPACE_SLUG_UNAVAILABLE",
    "A default workspace could not be created. Please try again.",
  );
}

export async function login(input: AuthInput): Promise<CurrentUser> {
  const db = getDb();
  const user = await db.user.findUnique({
    where: { email: input.email },
    select: { id: true, passwordHash: true },
  });
  const validPassword =
    user?.passwordHash &&
    (await verifyPassword(user.passwordHash, input.password));

  if (!user || !validPassword) {
    throw new MorselApiError(
      401,
      "INVALID_CREDENTIALS",
      "Email or password is incorrect.",
    );
  }

  await db.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
  });
  const currentUser = await findCurrentUserById(user.id);

  if (!currentUser) {
    throw new MorselApiError(
      403,
      "NO_ACTIVE_WORKSPACE",
      "This account does not have an active workspace.",
    );
  }

  return currentUser;
}
