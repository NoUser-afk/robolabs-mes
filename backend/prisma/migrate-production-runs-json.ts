import { MesService } from '../src/mes.service';
import { PrismaService } from '../src/prisma.service';

async function main() {
  const source = process.argv[2] || process.env.PRODUCTION_RUNS_FILE || '/app/data/production-runs.json';
  const prisma = new PrismaService();
  await prisma.$connect();
  try {
    const mes = new MesService(prisma);
    const result = await mes.migrateProductionRunsJson(source);
    console.log(JSON.stringify(result, null, 2));
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
