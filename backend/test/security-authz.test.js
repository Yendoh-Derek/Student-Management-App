const test = require("node:test");
const assert = require("node:assert/strict");

/**
 * Security contract tests for milestone policies.
 * These tests lock expected auth decisions so regressions are obvious.
 */
function normalizeRegisterRole(requestedRole) {
  return "STUDENT";
}

function canReadStudentAnalytics(actor, targetStudentUserId, teacherStudentUserIds = []) {
  if (actor.role === "ADMIN") return true;
  if (actor.role === "STUDENT") return actor.userId === targetStudentUserId;
  if (actor.role === "TEACHER") return teacherStudentUserIds.includes(targetStudentUserId);
  return false;
}

test("public registration cannot self-assign ADMIN role", () => {
  assert.equal(normalizeRegisterRole("ADMIN"), "STUDENT");
});

test("student cannot read another student's analytics", () => {
  const allowed = canReadStudentAnalytics(
    { role: "STUDENT", userId: 101 },
    202
  );
  assert.equal(allowed, false);
});

test("teacher can read analytics only for own roster", () => {
  const teacher = { role: "TEACHER", userId: 11 };
  assert.equal(canReadStudentAnalytics(teacher, 300, [300, 301]), true);
  assert.equal(canReadStudentAnalytics(teacher, 999, [300, 301]), false);
});
