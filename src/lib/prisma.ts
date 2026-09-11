import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is not set");
}

const adapter = new PrismaPg({
  connectionString,
});

// Use a versioned key so that any schema regeneration in dev
// discards the stale singleton rather than reusing it.
const PRISMA_SINGLETON_KEY = "prisma_v1" as const;

const globalForPrisma = globalThis as unknown as {
  [PRISMA_SINGLETON_KEY]: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma[PRISMA_SINGLETON_KEY] ??
  new PrismaClient({ adapter });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma[PRISMA_SINGLETON_KEY] = prisma;
}