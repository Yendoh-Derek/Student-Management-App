const test = require("node:test");
const assert = require("node:assert/strict");
const request = require("supertest");
const bcrypt = require("bcrypt");
const { PrismaClient, Role } = require("@prisma/client");
const { NestFactory } = require("@nestjs/core");
const { ValidationPipe } = require("@nestjs/common");

const prisma = new PrismaClient();
const shouldRun = process.env.RUN_INTEGRATION_TESTS === "1";

let app;
let adminAgent;
let teacherAgent;
let studentAgent;
let ctx;

async function loginAgent(email, password) {
  const agent = request.agent(app.getHttpServer());
  const res = await agent
    .post("/auth/login")
    .send({ email, password })
    .expect(201);
  assert.ok(res.body.user);
  return agent;
}

test("academic structures integration suite", { skip: !shouldRun }, async (t) => {
  const { AppModule } = require("../dist/src/app.module");
  app = await NestFactory.create(AppModule, { logger: false });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true
    })
  );
  await app.init();

  const stamp = Date.now();
  const password = "Password123!";
  const passwordHash = await bcrypt.hash(password, 10);

  const admin = await prisma.user.create({
    data: {
      name: `Admin ${stamp}`,
      email: `admin.integration.${stamp}@sms.local`,
      password: passwordHash,
      role: Role.ADMIN
    }
  });
  const teacher = await prisma.user.create({
    data: {
      name: `Teacher ${stamp}`,
      email: `teacher.integration.${stamp}@sms.local`,
      password: passwordHash,
      role: Role.TEACHER
    }
  });
  const studentUser = await prisma.user.create({
    data: {
      name: `Student ${stamp}`,
      email: `student.integration.${stamp}@sms.local`,
      password: passwordHash,
      role: Role.STUDENT
    }
  });
  const student = await prisma.student.create({
    data: { userId: studentUser.id, classLevel: "Year 1" }
  });

  const course = await prisma.course.create({
    data: { name: `Integration Course ${stamp}`, teacherId: teacher.id }
  });
  await prisma.enrollment.create({
    data: { courseId: course.id, studentId: student.id }
  });

  adminAgent = await loginAgent(admin.email, password);
  teacherAgent = await loginAgent(teacher.email, password);
  studentAgent = await loginAgent(studentUser.email, password);

  ctx = { admin, teacher, studentUser, student, course, stamp };

  await t.test("admin can create term", async () => {
    const res = await adminAgent.post("/terms").send({
      name: `Term ${ctx.stamp}`,
      startsOn: "2026-01-10",
      endsOn: "2026-06-10"
    });
    assert.equal(res.status, 201);
    assert.equal(res.body.name, `Term ${ctx.stamp}`);
    ctx.term = res.body;
  });

  await t.test("student cannot create term", async () => {
    const res = await studentAgent.post("/terms").send({
      name: `Blocked Term ${ctx.stamp}`,
      startsOn: "2026-01-10",
      endsOn: "2026-06-10"
    });
    assert.equal(res.status, 403);
  });

  await t.test("teacher can create assessment for own course", async () => {
    await prisma.course.update({
      where: { id: ctx.course.id },
      data: { termId: ctx.term.id }
    });
    const res = await teacherAgent.post("/assessments").send({
      title: `Midterm ${ctx.stamp}`,
      category: "Exam",
      weight: 30,
      maxScore: 100,
      courseId: ctx.course.id,
      termId: ctx.term.id
    });
    assert.equal(res.status, 201);
    assert.equal(res.body.courseId, ctx.course.id);
    ctx.assessment = res.body;
  });

  await t.test("duplicate assessment title per course-term conflicts", async () => {
    const res = await teacherAgent.post("/assessments").send({
      title: `Midterm ${ctx.stamp}`,
      category: "Exam",
      weight: 20,
      maxScore: 100,
      courseId: ctx.course.id,
      termId: ctx.term.id
    });
    assert.equal(res.status, 409);
  });

  await t.test("student sees only enrolled assessments", async () => {
    const res = await studentAgent.get("/assessments");
    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.body));
    const ids = res.body.map((item) => item.id);
    assert.ok(ids.includes(ctx.assessment.id));
  });

  await t.test("teacher cannot create assessment for another teacher course", async () => {
    const anotherTeacher = await prisma.user.create({
      data: {
        name: `Teacher2 ${ctx.stamp}`,
        email: `teacher2.integration.${ctx.stamp}@sms.local`,
        password: await bcrypt.hash("Password123!", 10),
        role: Role.TEACHER
      }
    });
    const foreignCourse = await prisma.course.create({
      data: { name: `Foreign ${ctx.stamp}`, teacherId: anotherTeacher.id, termId: ctx.term.id }
    });
    const res = await teacherAgent.post("/assessments").send({
      title: "Blocked",
      category: "Quiz",
      weight: 10,
      maxScore: 20,
      courseId: foreignCourse.id,
      termId: ctx.term.id
    });
    assert.equal(res.status, 403);
  });

  await app.close();
  await prisma.$disconnect();
});
