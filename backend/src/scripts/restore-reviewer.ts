
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import dotenv from 'dotenv';

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
    console.log('Restoring Reviewer data...');

    // Fix aman.workk786 account
    const reviewer = await prisma.user.findUnique({ where: { email: 'aman.workk786@gmail.com' } });

    if (reviewer) {
        await prisma.user.update({
            where: { email: 'aman.workk786@gmail.com' },
            data: {
                isActive: true,
                userType: 'REVIEWER',
                expertise: ['IPR', 'Contracts'],
                qualification: 'LLM',
                experience: 5
            }
        });
        console.log('aman.workk786@gmail.com is now an Active REVIEWER.');
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
