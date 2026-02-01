
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
    console.log('Fetching all users from database...');

    const users = await prisma.user.findMany({
        select: {
            id: true,
            name: true,
            email: true,
            userType: true,
            isActive: true,
            roles: {
                include: {
                    role: true
                }
            }
        },
        orderBy: {
            createdAt: 'desc'
        }
    });

    console.log(`Found ${users.length} total users:`);
    console.table(users.map(u => ({
        Name: u.name,
        Email: u.email,
        Type: u.userType,
        Active: u.isActive,
        Roles: u.roles.map(r => r.role.name).join(', ')
    })));

    const editorCount = await prisma.user.count({ where: { userType: 'EDITOR' } });
    const reviewerCount = await prisma.user.count({ where: { userType: 'REVIEWER' } });

    console.log('\nSummary:');
    console.log(`Editors (userType='EDITOR'): ${editorCount}`);
    console.log(`Reviewers (userType='REVIEWER'): ${reviewerCount}`);
}

main()
    .catch((e) => {
        console.error(e);
    })
    .finally(async () => {
        await prisma.$disconnect();
        await pool.end();
    });
