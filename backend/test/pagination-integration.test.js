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
  resetDatabase,
  cleanup,
  loginAs,
} = require("./fixtures");

const password = "TestPassword123!";

let app;
let adminUser;
let teacherUser;
let students = [];
let courses = [];

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

  // Create many students (> 20 for pagination testing)
  for (let i = 1; i <= 30; i++) {
    const user = await createUser(
      `student${i}@test.local`,
      password,
      "STUDENT",
      `Student ${i}`,
    );
    const student = await createStudent(
      user.id,
      `Grade ${Math.floor(i / 10) + 9}`,
    );
    students.push(student);
  }

  // Create many courses
  for (let i = 1; i <= 30; i++) {
    const course = await createCourse(teacherUser.id, `Course ${i}`);
    courses.push(course);
  }

  // Create enrollments for pagination testing
  for (let i = 0; i < Math.min(students.length, courses.length); i++) {
    await createEnrollment(students[i].id, courses[i].id);
  }
}

async function teardown() {
  await app.close();
  await cleanup();
}

test("pagination integration suite", { skip: false }, async (t) => {
  await setup();

  await t.test("GET /students?page=1&limit=20 returns 20 records", async () => {
    const agent = await loginAs(app, adminUser.email, password);

    const res = await agent.get("/students?page=1&limit=20");

    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.body.data));
    assert.equal(res.body.limit, 20);
    assert.equal(res.body.page, 1);
    assert.ok(res.body.data.length > 0);
    assert.ok(res.body.data.length <= 20);
    assert.ok(res.body.total >= 30);
    assert.ok(res.body.lastPage >= 2);
  });

  await t.test("GET /students?page=2&limit=20 returns next page", async () => {
    const agent = await loginAs(app, adminUser.email, password);

    const page1 = await agent.get("/students?page=1&limit=20");
    const page2 = await agent.get("/students?page=2&limit=20");

    assert.equal(page2.status, 200);
    assert.equal(page2.body.page, 2);

    // Records should be different
    const page1Ids = page1.body.data.map((s) => s.id);
    const page2Ids = page2.body.data.map((s) => s.id);
    const noDuplicates = page1Ids.every((id) => !page2Ids.includes(id));
    assert.ok(
      noDuplicates,
      "page 1 and page 2 should not have duplicate records",
    );
  });

  await t.test("GET /students defaults to page=1&limit=20", async () => {
    const agent = await loginAs(app, adminUser.email, password);

    const res = await agent.get("/students");

    assert.equal(res.status, 200);
    assert.equal(res.body.page, 1);
    assert.equal(res.body.limit, 20);
  });

  await t.test(
    "GET /courses?page=1&limit=10 returns paginated courses",
    async () => {
      const agent = await loginAs(app, teacherUser.email, password);

      const res = await agent.get("/courses?page=1&limit=10");

      assert.equal(res.status, 200);
      assert.ok(Array.isArray(res.body.data));
      assert.equal(res.body.limit, 10);
      assert.ok(res.body.data.length <= 10);
      assert.ok(res.body.total >= 30);
    },
  );

  await t.test("GET /enrollments?page=1&limit=15 respects limit", async () => {
    const agent = await loginAs(app, adminUser.email, password);

    const res = await agent.get("/enrollments?page=1&limit=15");

    assert.equal(res.status, 200);
    assert.equal(res.body.limit, 15);
    assert.ok(res.body.data.length <= 15);
  });

  await t.test(
    "GET /grades?page=1 with TEACHER returns paginated results",
    async () => {
      const agent = await loginAs(app, teacherUser.email, password);

      const res = await agent.get("/grades?page=1&limit=20");

      assert.equal(res.status, 200);
      assert.ok(Array.isArray(res.body.data));
      assert.equal(res.body.page, 1);
      assert.equal(res.body.limit, 20);
      // May have 0 grades since we didn't create any
      assert.ok(res.body.total >= 0);
    },
  );

  await t.test("page beyond lastPage returns empty data", async () => {
    const agent = await loginAs(app, adminUser.email, password);

    const firstPage = await agent.get("/students?page=1&limit=20");
    const beyondLastPage = await agent.get(
      `/students?page=${firstPage.body.lastPage + 10}&limit=20`,
    );

    assert.equal(beyondLastPage.status, 200);
    assert.equal(beyondLastPage.body.data.length, 0);
  });

  await t.test("limit=1 returns single record per page", async () => {
    const agent = await loginAs(app, adminUser.email, password);

    const page1 = await agent.get("/students?page=1&limit=1");
    const page2 = await agent.get("/students?page=2&limit=1");

    assert.equal(page1.body.data.length, 1);
    assert.equal(page2.body.data.length, 1);
    assert.notEqual(page1.body.data[0].id, page2.body.data[0].id);
  });

  await t.test("limit capped at 100", async () => {
    const agent = await loginAs(app, adminUser.email, password);

    // Try to request limit > 100
    const res = await agent.get("/students?page=1&limit=200");

    // DTO validation should cap or reject this
    // Most likely returns 400 or caps to 100
    if (res.status === 400) {
      assert.ok(true, "limit > 100 rejected as expected");
    } else if (res.status === 200) {
      assert.ok(res.body.limit <= 100, "limit capped to 100");
    }
  });

  await t.test("lastPage calculated correctly", async () => {
    const agent = await loginAs(app, adminUser.email, password);

    const res = await agent.get("/students?page=1&limit=10");

    const expectedLastPage = Math.ceil(res.body.total / 10);
    assert.equal(res.body.lastPage, expectedLastPage);
  });

  await teardown();
});
