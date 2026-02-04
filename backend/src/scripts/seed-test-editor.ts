
import { createRequire } from "module";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import dotenv from 'dotenv';

// --- THE FIX ---
const require = createRequire(import.meta.url);
const { PrismaClient } = require("@prisma/client");
import bcrypt from 'bcrypt';

// Load env vars
dotenv.config();

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
    throw new Error("DATABASE_URL environment variable is not set");
}

console.log('Using database URL:', connectionString.replace(/:[^:]+@/, ':****@')); // Hide password

// 1. Create a PostgreSQL connection pool
const pool = new pg.Pool({ connectionString });

// 2. Initialize the Prisma Adapter for Postgres
const adapter = new PrismaPg(pool);

// 3. Pass the adapter to the Prisma Client
const prisma = new PrismaClient({ adapter });

async function main() {
    const email = 'test.editor@law-nation.com';
    const hashedPassword = await bcrypt.hash('password123', 10);

    // Check if test user exists
    const existing = await prisma.user.findUnique({ where: { email } });

    if (existing) {
        console.log(`Updating existing test user ${email} to ACTIVE state...`);
        await prisma.user.update({
            where: { email },
            data: {
                isActive: true,
                userType: 'EDITOR',
                passwordHash: hashedPassword
            }
        });
    } else {
        console.log(`Creating new test user ${email}...`);
        await prisma.user.create({
            data: {
                name: 'Test Editor',
                email,
                passwordHash: hashedPassword,
                userType: 'EDITOR',
                isActive: true, // Should show Green status and Remove Button
                specialization: ['Corporate Law', 'Test Specialization'],
                title: 'Senior Test Editor',
                passwordSetupDate: new Date()
            }
        });
    }

    console.log('Test Editor ready. You can now login as this user or remove their access from Admin Panel.');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
        await pool.end();
    });
