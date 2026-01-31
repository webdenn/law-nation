
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
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
    console.log('Restoring Aman to Active Editor status...');

    // 1. Fix Aman's account
    await prisma.user.update({
        where: { email: 'aman9811269898@gmail.com' },
        data: {
            isActive: true, // Make active again
            userType: 'EDITOR', // Set as EDITOR so he shows up in the list
            specialization: ['Criminal Law', 'Civil Law'], // Add some sample data
            title: 'Senior Editor'
        }
    });

    // 2. Ensure System Admin is Active
    await prisma.user.update({
        where: { email: 'admin@lawnation.com' },
        data: {
            isActive: true,
            userType: 'ADMIN' // Keep as Admin
        }
    });

    console.log('Transformation complete.');
    console.log('Aman is now an Active EDITOR.');
    console.log('System Administrator is an Active ADMIN.');
}

main()
    .catch((e) => {
        console.error(e);
    })
    .finally(async () => {
        await prisma.$disconnect();
        await pool.end();
    });
