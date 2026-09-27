import type { User } from "@prisma/client";

import { getDb } from "../client.ts";

export type CreateUserInput = {
  email: string;
  passwordHash: string | null;
  name?: string | null;
};

export function createUser({
  email,
  passwordHash,
  name,
}: CreateUserInput): Promise<User> {
  return getDb().user.create({
    data: {
      email: email.trim().toLowerCase(),
      passwordHash,
      name,
    },
  });
}

export function findUserWithActiveWorkspaceMembershipsById(userId: string) {
  return getDb().user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      name: true,
      memberships: {
        where: { joinedAt: { not: null }, workspace: { status: "ACTIVE" } },
        orderBy: { createdAt: "asc" },
        select: {
          role: true,
          workspace: {
            select: { id: true, name: true, slug: true },
          },
        },
      },
    },
  });
}
