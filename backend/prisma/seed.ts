import "dotenv/config";
import argon2 from "argon2";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const email = process.env.SEED_ADMIN_EMAIL ?? "admin@fullykioks.local";
  const password = process.env.SEED_ADMIN_PASSWORD ?? "change-me-now";

  const passwordHash = await argon2.hash(password);

  const admin = await prisma.adminUser.upsert({
    where: { email },
    update: { passwordHash },
    create: { email, passwordHash },
  });

  console.log(`Seeded admin user: ${admin.email} (password: ${password} — change this after first login)`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
