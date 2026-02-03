
import { createRequire } from "module";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

// --- THE FIX ---
const require = createRequire(import.meta.url);
const { PrismaClient } = require("@prisma/client");
import dotenv from 'dotenv';
import bcrypt from 'bcrypt';

// Load env vars
dotenv.config();

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
    throw new Error("DATABASE_URL environment variable is not set");
}

const pool = new pg.Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
    const email = 'test.reviewer@law-nation.com';
    const hashedPassword = await bcrypt.hash('password123', 10);

    // Check if test user exists
    const existing = await prisma.user.findUnique({ where: { email } });

    if (existing) {
        console.log(`Updating existing test reviewer ${email} to ACTIVE state...`);
        await prisma.user.update({
            where: { email },
            data: {
                isActive: true,
                userType: 'REVIEWER',
                passwordHash: hashedPassword
            }
        });
    } else {
        console.log(`Creating new test reviewer ${email}...`);
        await prisma.user.create({
            data: {
                name: 'Test Reviewer',
                email,
                passwordHash: hashedPassword,
                userType: 'REVIEWER',
                isActive: true, // Should show Green status and Remove Button
                expertise: ['Constitutional Law', 'Review Expert'],
                qualification: 'PhD in Law',
                experience: 10,
                passwordSetupDate: new Date()
            }
        });
    }

    console.log('Test Reviewer ready.');
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
