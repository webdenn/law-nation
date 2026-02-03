import { createRequire } from "module";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

// --- THE FIX START ---
// We create a 'require' function to load the CommonJS Prisma Client
// This bypasses the "Named export 'PrismaClient' not found" error
const require = createRequire(import.meta.url);
const { PrismaClient } = require("@prisma/client");
// --- THE FIX END ---

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL environment variable is not set");
}

// 1. Create a PostgreSQL connection pool
const pool = new pg.Pool({ connectionString });

// 2. Initialize the Prisma Adapter for Postgres
const adapter = new PrismaPg(pool);

// 3. Pass the adapter to the Prisma Client
export const prisma = new PrismaClient({ adapter });

/**
 * Graceful shutdown
 */
const shutdown = async (signal: string) => {
  console.log(`${signal} received. Closing database connections...`);
  await prisma.$disconnect();
  await pool.end(); // Close the pg pool as well
  process.exit(0);
};

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));