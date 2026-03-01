import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const articles = await prisma.article.findMany({
    where: {
      citationNumber: {
        not: null,
      },
    },
    select: {
      id: true,
      title: true,
      citationNumber: true,
    },
    take: 5,
  });
  console.log(JSON.stringify(articles, null, 2));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
