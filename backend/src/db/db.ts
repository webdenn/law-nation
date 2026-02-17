import { createRequire } from "module";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

// RENAME 'require' to 'cjsRequire' to avoid conflict with global Node types
const cjsRequire = createRequire(import.meta.url);

// Use the renamed variable
const { PrismaClient, Prisma, ArticleStatus } = cjsRequire("@prisma/client");

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL environment variable is not set");
}

const pool = new pg.Pool({ connectionString });
const adapter = new PrismaPg(pool);

export const prisma = new PrismaClient({ adapter });

// Export the Runtime Values (Enums like ArticleStatus, runtime helpers)
export { Prisma, ArticleStatus };