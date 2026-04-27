function calculateMacroTargets(calorieGoal, goal = "maintain", profile = {}) {
  const calories = Number(calorieGoal);
  if (!Number.isFinite(calories) || calories <= 0) {
    return { proteinG: 0, carbsG: 0, fatG: 0 };
  }

  const weight = Number(profile?.weight);
  const height = Number(profile?.height);
  const age = Number(profile?.age);
  const hasWeight = Number.isFinite(weight) && weight > 0;
  const hasHeight = Number.isFinite(height) && height > 0;
  const hasAge = Number.isFinite(age) && age > 0;

  const bmi = hasWeight && hasHeight ? weight / ((height / 100) * (height / 100)) : null;

  const profileFactors = {
    lose_weight: { proteinPerKg: 1.9, fatPerKg: 0.7 },
    maintain: { proteinPerKg: 1.6, fatPerKg: 0.8 },
    gain_weight: { proteinPerKg: 1.8, fatPerKg: 0.9 },
  };

  const selected = profileFactors[goal] || profileFactors.maintain;

  if (hasWeight) {
    let proteinPerKg = selected.proteinPerKg;
    let fatPerKg = selected.fatPerKg;

    if (hasAge && age >= 50) proteinPerKg += 0.1;
    if (goal === "lose_weight" && Number.isFinite(bmi) && bmi >= 30) fatPerKg = Math.max(0.65, fatPerKg - 0.05);

    let proteinG = Math.round(weight * proteinPerKg);
    let fatG = Math.round(weight * fatPerKg);

    const proteinCalories = proteinG * 4;
    let fatCalories = fatG * 9;
    let carbCalories = calories - proteinCalories - fatCalories;

    if (carbCalories < 0) {
      const minFatG = Math.max(Math.round(weight * 0.5), 20);
      fatG = Math.max(minFatG, Math.round((calories - proteinCalories) / 9));
      fatCalories = fatG * 9;
      carbCalories = calories - proteinCalories - fatCalories;
    }

    if (carbCalories < 0) {
      const minProteinG = Math.max(Math.round(weight * 1.2), 40);
      proteinG = Math.max(minProteinG, Math.round((calories - fatCalories) / 4));
      carbCalories = calories - proteinG * 4 - fatCalories;
    }

    return {
      proteinG: Math.max(0, proteinG),
      carbsG: Math.max(0, Math.round(carbCalories / 4)),
      fatG: Math.max(0, fatG),
    };
  }

  const ratioByGoal = {
    lose_weight: { protein: 0.35, carbs: 0.35, fat: 0.30 },
    maintain: { protein: 0.30, carbs: 0.40, fat: 0.30 },
    gain_weight: { protein: 0.30, carbs: 0.45, fat: 0.25 },
  };

  const ratio = ratioByGoal[goal] || ratioByGoal.maintain;

  return {
    proteinG: Math.round((calories * ratio.protein) / 4),
    carbsG: Math.round((calories * ratio.carbs) / 4),
    fatG: Math.round((calories * ratio.fat) / 9),
  };
}

module.exports = { calculateMacroTargets };