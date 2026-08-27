import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined };

function createPrismaClient() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.warn("[db] DATABASE_URL is not set — Prisma will fail on query (build-time OK, runtime missing?)");
  }
  // Let Prisma use the URL from prisma.config.ts / env if not provided here.
  // Passing undefined here lets Prisma fallback to env var; passing empty string would throw at import.
  if (!url) {
    return new PrismaClient({
      log: ["error"],
    });
  }
  return new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
    datasources: {
      db: {
        url,
      },
    },
  });
}

export const db = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
