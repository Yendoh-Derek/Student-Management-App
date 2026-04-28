import { PrismaClient, Role } from "@prisma/client";
import * as bcrypt from "bcrypt";

const prisma = new PrismaClient();

async function ensureCourse(name: string, teacherId: number) {
  const existing = await prisma.course.findFirst({ where: { name } });
  if (existing) {
    return prisma.course.update({
      where: { id: existing.id },
      data: { teacherId }
    });
  }
  return prisma.course.create({
    data: { name, teacherId }
  });
}

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

  const teacherUser = await prisma.user.upsert({
    where: { email: "teacher@sms.local" },
    update: {},
    create: {
      name: "Alex Teacher",
      email: "teacher@sms.local",
      password,
      role: Role.TEACHER
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

  const student = await prisma.student.upsert({
    where: { userId: studentUser.id },
    update: {},
    create: {
      userId: studentUser.id,
      classLevel: "Year 2",
      averageScore: 0,
      attendanceRate: 0.74,
      riskLevel: "MEDIUM"
    }
  });

  const courseMath = await ensureCourse("Mathematics", teacherUser.id);
  const courseEng = await ensureCourse("English Literature", teacherUser.id);

  const enrollMath = await prisma.enrollment.upsert({
    where: {
      studentId_courseId: { studentId: student.id, courseId: courseMath.id }
    },
    update: {},
    create: {
      studentId: student.id,
      courseId: courseMath.id
    }
  });

  await prisma.enrollment.upsert({
    where: {
      studentId_courseId: { studentId: student.id, courseId: courseEng.id }
    },
    update: {},
    create: {
      studentId: student.id,
      courseId: courseEng.id
    }
  });

  await prisma.grade.deleteMany({ where: { enrollmentId: enrollMath.id } });
  await prisma.grade.createMany({
    data: [
      { enrollmentId: enrollMath.id, score: 72, term: "Term 1" },
      { enrollmentId: enrollMath.id, score: 61, term: "Term 2" },
      { enrollmentId: enrollMath.id, score: 68, term: "Term 3" }
    ]
  });

  const allGrades = await prisma.grade.findMany({
    where: { enrollment: { studentId: student.id } }
  });
  const avg =
    allGrades.length === 0
      ? 0
      : allGrades.reduce((s, g) => s + g.score, 0) / allGrades.length;

  await prisma.student.update({
    where: { id: student.id },
    data: { averageScore: avg }
  });

  console.log(
    `Seed complete. Admin id: ${admin.id}, Teacher id: ${teacherUser.id}, Student record id: ${student.id}`
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
