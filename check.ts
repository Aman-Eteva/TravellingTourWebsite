import { PrismaClient } from '@prisma/client';
const db = new PrismaClient();
async function main() {
  const docs = await db.rAGDocument.findMany();
  console.log('Total Docs:', docs.length);
  console.log('Pending:', docs.filter(d => d.status === 'PENDING').length);
  console.log('Indexed:', docs.filter(d => d.status === 'INDEXED').length);
}
main().finally(() => db.$disconnect());
