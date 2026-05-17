const test = require("node:test");
const assert = require("node:assert/strict");
const request = require("supertest");
const { NestFactory } = require("@nestjs/core");
const { ValidationPipe } = require("@nestjs/common");
const { createUser, resetDatabase, cleanup, loginAs } = require("./fixtures");

const password = "TestPassword123!";

let app;
let adminUser;
let teacherUser;
let studentUser;

// Setup
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

  // Create test users
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
}

// Teardown
async function teardown() {
  await app.close();
  await cleanup();
}

test("auth integration suite", { skip: false }, async (t) => {
  await setup();

  await t.test(
    "POST /auth/register creates user and returns tokens",
    async () => {
      const agent = request.agent(app.getHttpServer());
      const res = await agent.post("/auth/register").send({
        name: "New User",
        email: "newuser@test.local",
        password: "NewPass123!",
      });

      assert.equal(res.status, 201);
      assert.ok(res.body.accessToken);
      assert.ok(res.body.refreshToken);
      assert.ok(res.body.user);
      assert.equal(res.body.user.email, "newuser@test.local");
      assert.equal(res.body.user.role, "STUDENT");
    },
  );

  await t.test("POST /auth/register rejects duplicate email", async () => {
    const agent = request.agent(app.getHttpServer());
    const res = await agent.post("/auth/register").send({
      name: "Duplicate",
      email: adminUser.email,
      password: "SomePass123!",
    });

    assert.equal(res.status, 400);
    assert.match(res.body.message, /already registered/i);
  });

  await t.test(
    "POST /auth/login with valid credentials returns tokens",
    async () => {
      const agent = request.agent(app.getHttpServer());
      const res = await agent
        .post("/auth/login")
        .send({ email: adminUser.email, password });

      assert.equal(res.status, 201);
      assert.ok(res.body.accessToken);
      assert.ok(res.body.refreshToken);
      assert.equal(res.body.user.email, adminUser.email);
      assert.equal(res.body.user.role, "ADMIN");
    },
  );

  await t.test("POST /auth/login rejects invalid email", async () => {
    const agent = request.agent(app.getHttpServer());
    const res = await agent
      .post("/auth/login")
      .send({ email: "nonexistent@test.local", password });

    assert.equal(res.status, 401);
    assert.match(res.body.message, /invalid/i);
  });

  await t.test("POST /auth/login rejects wrong password", async () => {
    const agent = request.agent(app.getHttpServer());
    const res = await agent
      .post("/auth/login")
      .send({ email: adminUser.email, password: "WrongPassword123!" });

    assert.equal(res.status, 401);
    assert.match(res.body.message, /invalid/i);
  });

  await t.test("GET /auth/me returns authenticated user", async () => {
    const agent = await loginAs(app, adminUser.email, password);
    const res = await agent.get("/auth/me");

    assert.equal(res.status, 200);
    assert.ok(res.body.user);
    assert.equal(res.body.user.email, adminUser.email);
    assert.equal(res.body.user.role, "ADMIN");
  });

  await t.test("GET /auth/me returns 401 when not authenticated", async () => {
    const agent = request.agent(app.getHttpServer());
    const res = await agent.get("/auth/me");

    assert.equal(res.status, 401);
  });

  await t.test("POST /auth/refresh issues new access token", async () => {
    const agent = await loginAs(app, adminUser.email, password);

    // Make a request to populate cookies
    await agent.get("/auth/me");

    // Now refresh
    const res = await agent.post("/auth/refresh").send({});

    assert.equal(res.status, 201);
    assert.ok(res.body.accessToken);
    assert.ok(res.body.refreshToken);
  });

  await t.test("POST /auth/logout clears refresh token", async () => {
    const agent = await loginAs(app, adminUser.email, password);

    const logoutRes = await agent.post("/auth/logout").send({});

    assert.equal(logoutRes.status, 200);

    // Verify refresh token no longer works
    const refreshRes = await agent.post("/auth/refresh").send({});

    assert.equal(refreshRes.status, 401);
  });

  await t.test("cookies are httpOnly", async () => {
    const agent = request.agent(app.getHttpServer());
    const res = await agent
      .post("/auth/login")
      .send({ email: adminUser.email, password });

    const setCookieHeaders = res.headers["set-cookie"] || [];
    const accessTokenCookie = setCookieHeaders.find((c) =>
      c.includes("accessToken"),
    );
    const refreshTokenCookie = setCookieHeaders.find((c) =>
      c.includes("refreshToken"),
    );

    assert.ok(accessTokenCookie, "accessToken cookie is set");
    assert.ok(refreshTokenCookie, "refreshToken cookie is set");
    assert.ok(
      accessTokenCookie.includes("HttpOnly"),
      "accessToken is HttpOnly",
    );
    assert.ok(
      refreshTokenCookie.includes("HttpOnly"),
      "refreshToken is HttpOnly",
    );
  });

  await teardown();
});
