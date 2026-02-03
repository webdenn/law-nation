import { createRequire } from "module";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

// 1. Load CommonJS module
const require = createRequire(import.meta.url);

// 2. Extract BOTH 'PrismaClient' AND 'Prisma' (the namespace)
const { PrismaClient, Prisma } = require("@prisma/client");

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL environment variable is not set");
}

const pool = new pg.Pool({ connectionString });
const adapter = new PrismaPg(pool);

export const prisma = new PrismaClient({ adapter });

// 3. EXPORT 'Prisma' so other files can import it from here!
export { Prisma };