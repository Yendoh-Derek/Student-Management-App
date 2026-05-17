const test = require("node:test");
const assert = require("node:assert/strict");
const request = require("supertest");
const { NestFactory } = require("@nestjs/core");
const { ValidationPipe } = require("@nestjs/common");
const {
  createUser,
  createStudent,
  createCourse,
  createEnrollment,
  createGrade,
  resetDatabase,
  cleanup,
  loginAs,
} = require("./fixtures");

const password = "TestPassword123!";

let app;
let adminUser;
let teacherUser;
let studentUser;
let student1;
let course1;
let enrollment1;

async function setup() {
  const { AppModule } = require("../dist/src/app.module");
  app = await NestFactory.create(AppModule, { logger: false });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );
  await app.init();

  await resetDatabase();

  // Create users
  adminUser = await createUser("admin@test.local", password, "ADMIN", "Admin");
  teacherUser = await createUser(
    "teacher@test.local",
    password,
    "TEACHER",
    "Teacher",
  );
  studentUser = await createUser(
    "student@test.local",
    password,
    "STUDENT",
    "Student",
  );

  // Create student profile
  student1 = await createStudent(studentUser.id, "Grade 10");

  // Create course taught by teacher
  course1 = await createCourse(teacherUser.id, "Math 101");

  // Create enrollment
  enrollment1 = await createEnrollment(student1.id, course1.id);
}

async function teardown() {
  await app.close();
  await cleanup();
}

test("grades integration suite", { skip: false }, async (t) => {
  await setup();

  await t.test(
    "POST /grades creates grade and recalculates student average",
    async () => {
      const agent = await loginAs(app, teacherUser.email, password);

      const res = await agent.post("/grades").send({
        enrollmentId: enrollment1.id,
        score: 85,
        term: "Term 1",
      });

      assert.equal(res.status, 201);
      assert.ok(res.body.id);
      assert.equal(res.body.score, 85);
      assert.equal(res.body.term, "Term 1");

      // Verify student average was updated
      const updatedStudent = await app
        .get("StudentsService")
        .findOne(student1.id, {
          role: "ADMIN",
          userId: adminUser.id,
        });
      assert.equal(updatedStudent.averageScore, 85);
    },
  );

  await t.test(
    "POST /grades rejects if student role tries to create",
    async () => {
      const agent = await loginAs(app, studentUser.email, password);

      const res = await agent.post("/grades").send({
        enrollmentId: enrollment1.id,
        score: 90,
        term: "Term 1",
      });

      assert.equal(res.status, 403);
    },
  );

  await t.test(
    "POST /grades rejects teacher grading outside own courses",
    async () => {
      // Create another teacher and course
      const otherTeacher = await createUser(
        "other@test.local",
        password,
        "TEACHER",
        "Other",
      );
      const otherCourse = await createCourse(otherTeacher.id, "History 101");
      const otherEnrollment = await createEnrollment(
        student1.id,
        otherCourse.id,
      );

      const agent = await loginAs(app, teacherUser.email, password);

      const res = await agent.post("/grades").send({
        enrollmentId: otherEnrollment.id,
        score: 75,
        term: "Term 1",
      });

      assert.equal(res.status, 403);
      assert.match(res.body.message, /own courses/i);
    },
  );

  await t.test(
    "GET /grades?page=1 returns paginated grades for authorized user",
    async () => {
      const agent = await loginAs(app, teacherUser.email, password);

      // Create multiple grades
      await agent.post("/grades").send({
        enrollmentId: enrollment1.id,
        score: 88,
        term: "Term 1",
      });

      const res = await agent.get("/grades?page=1&limit=20");

      assert.equal(res.status, 200);
      assert.ok(Array.isArray(res.body.data));
      assert.equal(res.body.page, 1);
      assert.equal(res.body.limit, 20);
      assert.ok(res.body.total > 0);
      assert.ok(typeof res.body.lastPage === "number");
    },
  );

  await t.test("GET /grades respects student role isolation", async () => {
    const agent = await loginAs(app, studentUser.email, password);

    const res = await agent.get("/grades?page=1");

    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.body.data));
    // Student should only see their own grades
    if (res.body.data.length > 0) {
      const grade = res.body.data[0];
      assert.equal(grade.enrollment.studentId, student1.id);
    }
  });

  await t.test(
    "PUT /grades updates grade and recalculates average",
    async () => {
      const agent = await loginAs(app, teacherUser.email, password);

      // Create initial grade
      const createRes = await agent.post("/grades").send({
        enrollmentId: enrollment1.id,
        score: 75,
        term: "Term 2",
      });

      const gradeId = createRes.body.id;

      // Update grade
      const updateRes = await agent.patch(`/grades/${gradeId}`).send({
        score: 95,
        term: "Term 2",
      });

      assert.equal(updateRes.status, 200);
      assert.equal(updateRes.body.score, 95);

      // Verify average updated
      const studentsService = app.get("StudentsService");
      const updatedStudent = await studentsService.findOne(student1.id, {
        role: "ADMIN",
        userId: adminUser.id,
      });
      assert.ok(updatedStudent.averageScore > 75);
    },
  );

  await t.test("PUT /grades rejects student role", async () => {
    const agent = await loginAs(app, studentUser.email, password);

    const res = await agent.patch("/grades/999").send({
      score: 90,
      term: "Term 1",
    });

    assert.equal(res.status, 403);
  });

  await t.test(
    "DELETE /grades removes grade and recalculates average",
    async () => {
      const agent = await loginAs(app, teacherUser.email, password);

      // Create grade
      const createRes = await agent.post("/grades").send({
        enrollmentId: enrollment1.id,
        score: 80,
        term: "Term 3",
      });

      const gradeId = createRes.body.id;
      const averageBefore = (
        await app.get("StudentsService").findOne(student1.id, {
          role: "ADMIN",
          userId: adminUser.id,
        })
      ).averageScore;

      // Delete grade
      const deleteRes = await agent.delete(`/grades/${gradeId}`);

      assert.equal(deleteRes.status, 200);

      // Verify average recalculated (should be less than before)
      const averageAfter = (
        await app.get("StudentsService").findOne(student1.id, {
          role: "ADMIN",
          userId: adminUser.id,
        })
      ).averageScore;
      assert.ok(averageAfter <= averageBefore);
    },
  );

  await teardown();
});
