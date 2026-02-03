
import { createRequire } from "module";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import dotenv from 'dotenv';

// --- THE FIX ---
const require = createRequire(import.meta.url);
const { PrismaClient } = require("@prisma/client");

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
    const email = 'test.editor@law-nation.com';
    const user = await prisma.user.findUnique({ where: { email } });

    if (user) {
        console.log('User found:', user.name);
        console.log('Email:', user.email);
        console.log('isActive (DB value):', user.isActive); // This is the source of truth
        console.log('UserType:', user.userType);
    } else {
        console.log('User not found!');
    }
}

main()
    .catch((e) => {
        console.error(e);
    })
    .finally(async () => {
        await prisma.$disconnect();
        await pool.end();
    });
