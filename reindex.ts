import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { indexDocument } from './apps/api/src/services/ai.ts';

const db = new PrismaClient();
async function main() {
  const docs = await db.rAGDocument.findMany({ where: { status: 'PENDING' } });
  console.log(`Found ${docs.length} pending documents to index.`);
  let success = 0;
  for (const doc of docs) {
    try {
      await indexDocument(doc.id);
      success++;
      console.log(`Indexed document: ${doc.title}`);
    } catch (e) {
      console.error(`Failed to index ${doc.title}:`, e);
    }
  }
  console.log(`Successfully indexed ${success}/${docs.length} documents.`);
}
main().finally(() => db.$disconnect());
