/**
 * A profile is "complete" once the user has all the stats needed to compute
 * a personalised calorie goal. Google sign-ups start incomplete (no body
 * stats) and are routed through onboarding to fill these in.
 */
export function isProfileComplete(user) {
  if (!user) return false;
  return Boolean(
    user.age &&
      user.weight &&
      user.height &&
      user.gender &&
      user.goal &&
      user.activityLevel
  );
}
