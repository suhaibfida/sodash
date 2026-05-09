// =============================================
// Prisma Client Singleton
// Prevents multiple Prisma Client instances
// during hot reloads in development.
// =============================================

import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import { env } from "../utils/env";

declare global {
  // Allow global var in TypeScript without errors
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined;
}

const pool = new pg.Pool({ connectionString: env.DATABASE_URL });
const adapter = new PrismaPg(pool);

const prisma: PrismaClient =
  global.__prisma ??
  new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development"
      ? ["warn", "error"]
      : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  global.__prisma = prisma;
}

export default prisma;
