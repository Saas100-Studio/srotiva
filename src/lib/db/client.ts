import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as typeof globalThis & {
  srotivaDb?: PrismaClient;
};

const db = globalForPrisma.srotivaDb ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.srotivaDb = db;
}

export function getDb(): PrismaClient {
  return db;
}
