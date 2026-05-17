const test = require("node:test");
const assert = require("node:assert/strict");

function canModifyCourse(actor, courseTeacherId) {
  if (actor.role === "ADMIN") return true;
  if (actor.role === "TEACHER") return actor.userId === courseTeacherId;
  return false;
}

function canReassignCourseTeacher(actor) {
  return actor.role === "ADMIN";
}

function nextEnrollmentShape(existing, patch) {
  return {
    studentId: patch.studentId ?? existing.studentId,
    courseId: patch.courseId ?? existing.courseId
  };
}

function isDuplicateEnrollment(candidate, records, currentId) {
  return records.some(
    (record) =>
      record.id !== currentId &&
      record.studentId === candidate.studentId &&
      record.courseId === candidate.courseId
  );
}

function isValidGradeScore(score) {
  return Number.isFinite(score) && score >= 0 && score <= 100;
}

test("teacher can only modify own course", () => {
  assert.equal(canModifyCourse({ role: "TEACHER", userId: 11 }, 11), true);
  assert.equal(canModifyCourse({ role: "TEACHER", userId: 11 }, 12), false);
});

test("only admin can reassign course teacher", () => {
  assert.equal(canReassignCourseTeacher({ role: "ADMIN" }), true);
  assert.equal(canReassignCourseTeacher({ role: "TEACHER" }), false);
});

test("enrollment patch keeps original fields when omitted", () => {
  const merged = nextEnrollmentShape({ studentId: 3, courseId: 9 }, { courseId: 10 });
  assert.deepEqual(merged, { studentId: 3, courseId: 10 });
});

test("enrollment duplicate detector catches same student-course pair", () => {
  const records = [
    { id: 1, studentId: 2, courseId: 5 },
    { id: 2, studentId: 2, courseId: 6 }
  ];
  assert.equal(isDuplicateEnrollment({ studentId: 2, courseId: 5 }, records, 2), true);
  assert.equal(isDuplicateEnrollment({ studentId: 2, courseId: 7 }, records, 2), false);
});

test("grade score validator enforces 0..100 bounds", () => {
  assert.equal(isValidGradeScore(0), true);
  assert.equal(isValidGradeScore(100), true);
  assert.equal(isValidGradeScore(-0.1), false);
  assert.equal(isValidGradeScore(100.1), false);
  assert.equal(isValidGradeScore(Number.NaN), false);
});
