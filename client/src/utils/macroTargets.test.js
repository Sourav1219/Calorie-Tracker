import { describe, expect, it } from "vitest";
import { calculateMacroTargets, macroProgress } from "./macroTargets";

describe("calculateMacroTargets", () => {
  it("returns zero macros for invalid calorie goals", () => {
    expect(calculateMacroTargets(0)).toEqual({ proteinG: 0, carbsG: 0, fatG: 0 });
    expect(calculateMacroTargets("invalid")).toEqual({ proteinG: 0, carbsG: 0, fatG: 0 });
  });

  it("calculates profile-based macros when weight exists", () => {
    const result = calculateMacroTargets(2200, "maintain", { weight: 70, height: 172, age: 28 });
    expect(result.proteinG).toBeGreaterThan(0);
    expect(result.carbsG).toBeGreaterThan(0);
    expect(result.fatG).toBeGreaterThan(0);
  });

  it("falls back to ratio-based macros without weight", () => {
    const lose = calculateMacroTargets(2000, "lose_weight", {});
    const gain = calculateMacroTargets(2000, "gain_weight", {});
    expect(lose.carbsG).toBeLessThan(gain.carbsG);
    expect(lose.proteinG).toBeGreaterThanOrEqual(gain.proteinG);
  });
});

describe("macroProgress", () => {
  it("clamps progress between 0 and 100", () => {
    expect(macroProgress(0, 100)).toBe(0);
    expect(macroProgress(50, 100)).toBe(50);
    expect(macroProgress(300, 100)).toBe(100);
    expect(macroProgress(-20, 100)).toBe(0);
  });
});
