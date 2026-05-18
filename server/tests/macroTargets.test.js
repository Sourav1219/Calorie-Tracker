const test = require("node:test");
const assert = require("node:assert/strict");
const { calculateMacroTargets } = require("../utils/macroTargets");

test("returns zero macros for invalid calorie targets", () => {
  assert.deepEqual(calculateMacroTargets(0), {
    proteinG: 0,
    carbsG: 0,
    fatG: 0,
  });
});

test("returns positive macros for valid profile", () => {
  const result = calculateMacroTargets(2400, "maintain", {
    weight: 75,
    height: 178,
    age: 30,
  });

  assert.ok(result.proteinG > 0);
  assert.ok(result.carbsG > 0);
  assert.ok(result.fatG > 0);
});
