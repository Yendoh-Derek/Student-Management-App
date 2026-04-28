const test = require("node:test");
const assert = require("node:assert/strict");

/** Mirrors backend rollup: mean of all grade scores for a student. */
function averageFromScores(scores) {
  if (scores.length === 0) return 0;
  return scores.reduce((a, b) => a + b, 0) / scores.length;
}

test("averageFromScores empty is zero", () => {
  assert.equal(averageFromScores([]), 0);
});

test("averageFromScores matches seeded math terms", () => {
  assert.equal(averageFromScores([72, 61, 68]), 67);
});
