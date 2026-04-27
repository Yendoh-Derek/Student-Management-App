const url = process.env.SMOKE_URL ?? "http://localhost:3000";

const response = await fetch(url);
if (!response.ok) {
  console.error(`Smoke test failed: ${response.status}`);
  process.exit(1);
}

console.log(`Smoke test passed: ${url}`);
