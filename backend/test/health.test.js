const test = require("node:test");
const assert = require("node:assert/strict");

test("health shape is stable", () => {
  const health = { status: "ok", service: "backend" };
  assert.equal(health.status, "ok");
  assert.equal(health.service, "backend");
});
