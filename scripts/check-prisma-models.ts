import "dotenv/config";
import { prisma } from "../src/infra/db/client";

async function main() {
  const rows = await prisma.integrationConnection.findMany({ take: 1 });
  console.log("integrationConnection.findMany ok", rows.length);
  const staged = await prisma.stagedLead.findMany({ take: 1 });
  console.log("stagedLead.findMany ok", staged.length);
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
