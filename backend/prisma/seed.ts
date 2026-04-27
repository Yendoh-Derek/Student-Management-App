import { PrismaClient, Role } from "@prisma/client";
import * as bcrypt from "bcrypt";

const prisma = new PrismaClient();

async function main() {
  const password = await bcrypt.hash("Password123!", 10);

  const admin = await prisma.user.upsert({
    where: { email: "admin@sms.local" },
    update: {},
    create: {
      name: "System Admin",
      email: "admin@sms.local",
      password,
      role: Role.ADMIN
    }
  });

  const studentUser = await prisma.user.upsert({
    where: { email: "student@sms.local" },
    update: {},
    create: {
      name: "Jane Student",
      email: "student@sms.local",
      password,
      role: Role.STUDENT
    }
  });

  await prisma.student.upsert({
    where: { userId: studentUser.id },
    update: {},
    create: {
      userId: studentUser.id,
      classLevel: "Year 2",
      averageScore: 67,
      attendanceRate: 0.74,
      riskLevel: "MEDIUM",
      grades: {
        create: [
          { score: 72, term: "Term 1" },
          { score: 61, term: "Term 2" },
          { score: 68, term: "Term 3" }
        ]
      }
    }
  });

  console.log(`Seed complete. Admin user id: ${admin.id}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
