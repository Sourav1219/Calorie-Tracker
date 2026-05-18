const test = require("node:test");
const assert = require("node:assert/strict");
const { formatDateKey } = require("../utils/dailyLog");

test("formats Date values into YYYY-MM-DD in IST", () => {
  const output = formatDateKey(new Date("2026-05-19T00:00:00.000Z"));
  assert.match(output, /^\d{4}-\d{2}-\d{2}$/);
});

test("preserves calendar date for IST midnight input", () => {
  const output = formatDateKey(new Date("2026-05-18T18:30:00.000Z"));
  assert.equal(output, "2026-05-19");
});
