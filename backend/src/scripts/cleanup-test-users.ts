
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
    const emails = ['test.editor@law-nation.com', 'test.reviewer@law-nation.com'];

    console.log('Cleaning up test users:', emails);

    // Need to delete related records first if any (e.g. EmailVerification, RefreshToken)
    // Usually Cascade delete handles this, but let's be safe regarding foreign keys like Article assignments if any were made.
    // Since we just created them, they shouldn't have articles unless reassign logic ran? No, they were new.

    // But wait, the previous re-assign logic might have assigned articles TO them if we were testing re-assignment?
    // No, we only created them.

    const deleted = await prisma.user.deleteMany({
        where: {
            email: {
                in: emails
            }
        }
    });

    console.log(`Deleted ${deleted.count} test users.`);
}

main()
    .catch((e) => {
        console.error(e);
    })
    .finally(async () => {
        await prisma.$disconnect();
        await pool.end();
    });
