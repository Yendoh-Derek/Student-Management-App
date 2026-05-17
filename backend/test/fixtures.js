const bcrypt = require("bcrypt");
const { PrismaClient, Role } = require("@prisma/client");
const request = require("supertest");

const prisma = new PrismaClient();

/**
 * Hash a password for storage in database
 */
async function hashPassword(password) {
  return bcrypt.hash(password, 10);
}

/**
 * Create a user with the given role
 */
async function createUser(
  email,
  password,
  role = Role.STUDENT,
  name = "Test User",
) {
  const hashedPassword = await hashPassword(password);
  return prisma.user.create({
    data: {
      email,
      password: hashedPassword,
      role,
      name,
    },
  });
}

/**
 * Create a student linked to a user
 */
async function createStudent(userId, classLevel = "Grade 10", options = {}) {
  return prisma.student.create({
    data: {
      userId,
      classLevel,
      averageScore: options.averageScore ?? 0,
      attendanceRate: options.attendanceRate ?? 1,
      riskLevel: options.riskLevel ?? "LOW",
    },
  });
}

/**
 * Create a course taught by a user
 */
async function createCourse(teacherId, name, options = {}) {
  return prisma.course.create({
    data: {
      teacherId,
      name,
      termId: options.termId,
      sectionId: options.sectionId,
    },
  });
}

/**
 * Create an enrollment linking a student to a course
 */
async function createEnrollment(studentId, courseId, options = {}) {
  return prisma.enrollment.create({
    data: {
      studentId,
      courseId,
      termId: options.termId,
    },
  });
}

/**
 * Create a grade for an enrollment
 */
async function createGrade(enrollmentId, score, term, options = {}) {
  return prisma.grade.create({
    data: {
      enrollmentId,
      score,
      term,
      assessmentId: options.assessmentId,
    },
  });
}

/**
 * Create a term
 */
async function createTerm(name, startsOn, endsOn) {
  return prisma.term.create({
    data: {
      name,
      startsOn,
      endsOn,
    },
  });
}

/**
 * Create an assessment
 */
async function createAssessment(courseId, termId, title, options = {}) {
  return prisma.assessment.create({
    data: {
      courseId,
      termId,
      title,
      category: options.category ?? "exam",
      weight: options.weight ?? 1,
      maxScore: options.maxScore ?? 100,
      dueAt: options.dueAt,
    },
  });
}

/**
 * Login as a user and return supertest agent with cookies
 */
async function loginAs(app, email, password) {
  const agent = request.agent(app.getHttpServer());
  const res = await agent.post("/auth/login").send({ email, password });

  if (!res.ok) {
    throw new Error(`Login failed for ${email}: ${res.status}`);
  }

  return agent;
}

/**
 * Reset database: truncate all tables
 */
async function resetDatabase() {
  // Delete in dependency order
  await prisma.grade.deleteMany({});
  await prisma.assessment.deleteMany({});
  await prisma.enrollment.deleteMany({});
  await prisma.course.deleteMany({});
  await prisma.section.deleteMany({});
  await prisma.term.deleteMany({});
  await prisma.student.deleteMany({});
  await prisma.user.deleteMany({});
}

/**
 * Cleanup: disconnect Prisma
 */
async function cleanup() {
  await prisma.$disconnect();
}

module.exports = {
  prisma,
  hashPassword,
  createUser,
  createStudent,
  createCourse,
  createEnrollment,
  createGrade,
  createTerm,
  createAssessment,
  loginAs,
  resetDatabase,
  cleanup,
};
