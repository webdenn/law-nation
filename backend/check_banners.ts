
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
    const banners = await prisma.banner.findMany();
    console.log("Banners:", JSON.stringify(banners, null, 2));
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
