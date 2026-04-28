import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, ArrowRight, Check, Eye, EyeOff, Lock, Mail, User } from "lucide-react";
import toast from "react-hot-toast";
import api from "../utils/api";
import { useUser } from "../context/UserContext";
import { calculateMacroTargets } from "../utils/macroTargets";

const GOALS = [
  { value: "lose_weight", emoji: "🎯", label: "Lose Weight", desc: "Burn fat" },
  { value: "maintain", emoji: "⚖️", label: "Maintain", desc: "Stay steady" },
  { value: "gain_weight", emoji: "💪", label: "Gain Weight", desc: "Build muscle" },
];

const ACTIVITY_LEVELS = [
  { value: "sedentary", label: "Sedentary", multiplier: 1.2 },
  { value: "lightly_active", label: "Lightly Active", multiplier: 1.375 },
  { value: "moderately_active", label: "Moderately Active", multiplier: 1.55 },
  { value: "very_active", label: "Very Active", multiplier: 1.725 },
  { value: "extra_active", label: "Extra Active", multiplier: 1.9 },
];

const GENDERS = [
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
  { value: "other", label: "Other" },
];

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function calculateDailyCalories(weight, height, age, gender, goal, activityLevel) {
  if (!weight || !height || !age || !gender || !goal || !activityLevel) return null;

  const w = parseFloat(weight);
  const h = parseFloat(height);
  const a = parseInt(age, 10);

  const maleBMR = 88.362 + 13.397 * w + 4.799 * h - 5.677 * a;
  const femaleBMR = 447.593 + 9.247 * w + 3.098 * h - 4.33 * a;
  const bmr = gender === "male" ? maleBMR : gender === "female" ? femaleBMR : (maleBMR + femaleBMR) / 2;

  const multiplier = ACTIVITY_LEVELS.find((x) => x.value === activityLevel)?.multiplier || 1.2;
  let tdee = bmr * multiplier;
  if (goal === "lose_weight") tdee = Math.max(1200, tdee - 500);
  if (goal === "gain_weight") tdee += 300;
  return Math.round(tdee);
}

function StepBar({ current }) {
  const steps = ["Account", "Body", "Goals"];
  return (
    <div className="flex items-center mb-10 mt-1 px-1">
      {steps.map((label, i) => {
        const stepNum = i + 1;
        const isActive = stepNum === current;
        const isCompleted = stepNum < current;

        return (
          <div key={label} className={`flex items-center ${i < steps.length - 1 ? "flex-1" : ""}`}>
            <div className="relative z-10 flex-shrink-0">
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-black transition-all duration-300"
                style={{
                  background: isCompleted || isActive ? "var(--green-primary)" : "rgba(0,0,0,0.04)",
                  color: isCompleted || isActive ? "var(--text-on-green)" : "var(--text-muted)",
                  boxShadow: isActive ? "0 0 0 4px rgba(34,197,94,0.15)" : "none",
                  border: isCompleted || isActive ? "none" : "1px solid rgba(0,0,0,0.08)",
                }}
              >
                {isCompleted ? <Check className="w-5 h-5" /> : stepNum}
              </div>
              <span
                className="text-[11px] font-bold transition-colors duration-300 absolute top-12 left-1/2 -translate-x-1/2 whitespace-nowrap"
                style={{ color: isCompleted || isActive ? "var(--green-primary)" : "var(--text-muted)" }}
              >
                {label}
              </span>
            </div>
            
            {i < steps.length - 1 && (
              <div className="flex-1 h-[3px] mx-3 rounded-full overflow-hidden" style={{ background: "rgba(0,0,0,0.06)" }}>
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{ width: isCompleted ? "100%" : "0%", background: "var(--green-primary)" }}
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function Register() {
  const [step, setStep] = useState(1);
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [heightUnit, setHeightUnit] = useState("ft"); // "cm" or "ft"
  const [heightFt, setHeightFt] = useState("");
  const [heightIn, setHeightIn] = useState("");
  const { login } = useUser();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    age: "",
    weight: "",
    height: "",
    gender: "",
    goal: "",
    activityLevel: "",
  });

  // Sync feet/inches -> cm whenever they change
  const updateHeightFromFeet = (ft, inches) => {
    const totalInches = (parseFloat(ft) || 0) * 12 + (parseFloat(inches) || 0);
    const cm = Math.round(totalInches * 2.54);
    if (cm > 0) setField("height", String(cm));
    else setField("height", "");
  };

  const handleHeightUnitToggle = (unit) => {
    setHeightUnit(unit);
    if (unit === "ft" && form.height) {
      // convert cm to ft/in for display
      const totalIn = parseFloat(form.height) / 2.54;
      setHeightFt(String(Math.floor(totalIn / 12)));
      setHeightIn(String(Math.round(totalIn % 12)));
    } else if (unit === "cm" && (heightFt || heightIn)) {
      updateHeightFromFeet(heightFt, heightIn);
    }
  };

  const setField = (field, value) => setForm((prev) => ({ ...prev, [field]: value }));

  const calorieGoal = useMemo(
    () => calculateDailyCalories(form.weight, form.height, form.age, form.gender, form.goal, form.activityLevel),
    [form.weight, form.height, form.age, form.gender, form.goal, form.activityLevel]
  );

  const macroTargets = useMemo(
    () => calculateMacroTargets(calorieGoal, form.goal, { weight: form.weight, height: form.height, age: form.age }),
    [calorieGoal, form.goal, form.weight, form.height, form.age]
  );

  const step1Valid = form.name.trim() && form.email.trim() && isValidEmail(form.email) && form.password.length >= 6 && form.password === form.confirmPassword;
  const step2Valid = form.gender && Number(form.age) > 0 && Number(form.weight) > 0 && Number(form.height) > 0;
  const step3Valid = form.goal && form.activityLevel;

  const canProceed = (step === 1 && step1Valid) || (step === 2 && step2Valid) || (step === 3 && step3Valid);

  const handleSubmit = async () => {
    if (!step3Valid) return;
    setIsSubmitting(true);

    try {
      const payload = {
        name: form.name.trim(),
        email: form.email.trim().toLowerCase(),
        password: form.password,
        age: parseInt(form.age, 10),
        weight: parseFloat(form.weight),
        height: parseFloat(form.height),
        gender: form.gender,
        goal: form.goal,
        activityLevel: form.activityLevel,
      };

      const res = await api.post("/auth/register", payload);
      login(res.data.user, res.data.token);
      toast.success("Account created! Welcome to PureIntake.");
      navigate("/dashboard");
    } catch (error) {
      toast.error(error.response?.data?.error || "Registration failed.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div 
      className="flex flex-col items-center px-5 py-4 pb-12" 
      style={{ background: "var(--bg-page)" }}
    >
      <div className="w-full max-w-sm profile-fade-in">
        <div className="text-center mb-3">
          <h1 className="text-xl font-black tracking-tight" style={{ color: "var(--text-primary)" }}>PureIntake</h1>
          <p className="text-xs mt-0.5 font-medium" style={{ color: "var(--text-muted)" }}>Create your account</p>
        </div>

        <div 
          className="rounded-[20px] p-5 profile-stat-card"
          style={{ 
            background: "rgba(255,255,255,0.85)",
            border: "1px solid rgba(0,0,0,0.06)",
            backdropFilter: "blur(20px)",
            WebkitBackdropFilter: "blur(20px)",
            boxShadow: "0 12px 40px rgba(0,0,0,0.06), 0 2px 8px rgba(0,0,0,0.03)",
            animationDelay: "100ms"
          }}
        >
          <StepBar current={step} />

          {step === 1 && (
            <div className="space-y-4 animate-fade-up">
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "var(--text-muted)" }} />
                <input type="text" placeholder="Full Name" value={form.name} onChange={(e) => setField("name", e.target.value)} className="input-field pl-11" />
              </div>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "var(--text-muted)" }} />
                <input type="email" placeholder="Email address" value={form.email} onChange={(e) => setField("email", e.target.value)} className="input-field pl-11" />
              </div>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "var(--text-muted)" }} />
                <input type={showPassword ? "text" : "password"} placeholder="Password (min 6 chars)" value={form.password} onChange={(e) => setField("password", e.target.value)} className="input-field pl-11 pr-11" />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3.5 top-1/2 -translate-y-1/2" style={{ color: "var(--text-muted)" }}>
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "var(--text-muted)" }} />
                <input type="password" placeholder="Confirm Password" value={form.confirmPassword} onChange={(e) => setField("confirmPassword", e.target.value)} className="input-field pl-11" />
              </div>
              {form.password && form.confirmPassword && form.password !== form.confirmPassword && (
                <p className="text-xs" style={{ color: "#ef4444" }}>Passwords do not match</p>
              )}
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4 animate-fade-up">
              <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Gender</p>
              <div className="grid grid-cols-3 gap-2">
                {GENDERS.map((g) => (
                  <button
                    key={g.value}
                    type="button"
                    onClick={() => setField("gender", g.value)}
                    className="h-10 rounded-full border text-sm font-semibold transition-all duration-200"
                    style={{
                      background: form.gender === g.value ? "var(--green-primary)" : "var(--surface-3)",
                      color: form.gender === g.value ? "var(--text-on-green)" : "var(--text-muted)",
                      borderColor: form.gender === g.value ? "var(--green-primary)" : "var(--border-default)",
                    }}
                  >
                    {g.label}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-semibold uppercase mb-1 block" style={{ color: "var(--text-muted)" }}>Age</label>
                  <input type="number" min="1" value={form.age} onChange={(e) => setField("age", e.target.value)} placeholder="25" className="input-field" />
                </div>
                <div>
                  <label className="text-[10px] font-semibold uppercase mb-1 block" style={{ color: "var(--text-muted)" }}>Weight (kg)</label>
                  <input type="number" min="1" step="0.1" value={form.weight} onChange={(e) => setField("weight", e.target.value)} placeholder="70" className="input-field" />
                </div>
              </div>

              {/* Height with unit toggle */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[10px] font-semibold uppercase" style={{ color: "var(--text-muted)" }}>Height</label>
                  <div className="flex rounded-full overflow-hidden border" style={{ borderColor: "var(--border-default)" }}>
                    {["ft", "cm"].map((u) => (
                      <button key={u} type="button" onClick={() => handleHeightUnitToggle(u)}
                        className="px-3 py-0.5 text-[10px] font-bold uppercase transition-all"
                        style={{
                          background: heightUnit === u ? "var(--green-primary)" : "transparent",
                          color: heightUnit === u ? "var(--text-on-green)" : "var(--text-muted)",
                        }}>
                        {u}
                      </button>
                    ))}
                  </div>
                </div>
                {heightUnit === "ft" ? (
                  <div className="grid grid-cols-2 gap-2">
                    <input type="number" min="1" max="8" value={heightFt}
                      onChange={(e) => { setHeightFt(e.target.value); updateHeightFromFeet(e.target.value, heightIn); }}
                      placeholder="5" className="input-field" />
                    <input type="number" min="0" max="11" value={heightIn}
                      onChange={(e) => { setHeightIn(e.target.value); updateHeightFromFeet(heightFt, e.target.value); }}
                      placeholder="8" className="input-field" />
                    <p className="text-[10px] -mt-1" style={{ color: "var(--text-muted)" }}>Feet</p>
                    <p className="text-[10px] -mt-1" style={{ color: "var(--text-muted)" }}>Inches</p>
                  </div>
                ) : (
                  <input type="number" min="100" max="250" step="1" value={form.height}
                    onChange={(e) => setField("height", e.target.value)}
                    placeholder="170" className="input-field" />
                )}
                {form.height && (
                  <p className="text-[10px] mt-1 font-medium" style={{ color: "var(--green-text)" }}>
                    {form.height} cm {heightUnit === "ft" && heightFt ? `(${heightFt}'${heightIn || 0}")` : ""}
                  </p>
                )}
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Your Goal</p>
              <div className="grid grid-cols-3 gap-2">
                {GOALS.map((g) => {
                  const selected = form.goal === g.value;
                  return (
                    <button
                      key={g.value}
                      type="button"
                      onClick={() => setField("goal", g.value)}
                      className="rounded-xl border px-2 py-2.5 text-center transition-all duration-200"
                      style={{
                        background: selected ? "var(--green-subtle)" : "var(--surface-3)",
                        borderColor: selected ? "var(--green-primary)" : "var(--border-default)",
                      }}
                    >
                      <p className="text-base">{g.emoji}</p>
                      <p style={{ color: selected ? "var(--green-text)" : "var(--text-secondary)", fontWeight: 600, fontSize: "11px" }}>
                        {g.label}
                      </p>
                    </button>
                  );
                })}
              </div>

              <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Activity Level</p>
              <div className="flex flex-wrap gap-1.5">
                {ACTIVITY_LEVELS.map((activity) => {
                  const selected = form.activityLevel === activity.value;
                  return (
                    <button
                      key={activity.value}
                      type="button"
                      onClick={() => setField("activityLevel", activity.value)}
                      className="px-2.5 py-1.5 rounded-full text-[11px] font-semibold transition-all duration-200"
                      style={{
                        background: selected ? "var(--green-primary)" : "var(--surface-3)",
                        color: selected ? "var(--text-on-green)" : "var(--text-muted)",
                      }}
                    >
                      {activity.label}
                    </button>
                  );
                })}
              </div>

              {calorieGoal && (
                <div className="rounded-xl p-3.5" style={{ background: "var(--green-subtle)", border: "1px solid var(--green-border)" }}>
                  <div className="text-center mb-2.5">
                    <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Daily Target</p>
                    <p className="text-2xl font-black mt-0.5" style={{ color: "var(--green-text)" }}>{calorieGoal} <span className="text-xs font-semibold">kcal</span></p>
                  </div>
                  
                  <div className="flex items-center justify-between px-2 pt-2.5" style={{ borderTop: "1px solid rgba(34, 197, 94, 0.15)" }}>
                    {[
                      { label: "Protein", value: `${macroTargets.proteinG}g`, color: "#3b82f6" },
                      { label: "Carbs", value: `${macroTargets.carbsG}g`, color: "#22c55e" },
                      { label: "Fat", value: `${macroTargets.fatG}g`, color: "#f97316" },
                    ].map((m) => (
                      <div key={m.label} className="text-center">
                        <p className="text-[10px] font-semibold" style={{ color: "var(--text-muted)" }}>{m.label}</p>
                        <p className="text-sm font-bold" style={{ color: m.color }}>{m.value}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="flex items-center gap-3 mt-4">
            {step > 1 && (
              <button
                type="button"
                onClick={() => setStep((s) => s - 1)}
                className="flex items-center justify-center gap-1.5 py-2 px-4 rounded-xl border text-sm font-bold transition-all duration-200"
                style={{ borderColor: "var(--border-default)", color: "var(--text-secondary)", background: "var(--surface-3)" }}
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Back
              </button>
            )}

            {step < 3 ? (
              <button
                type="button"
                onClick={() => canProceed && setStep((s) => s + 1)}
                disabled={!canProceed}
                className="flex-1 h-11 rounded-2xl flex items-center justify-center gap-1.5 text-sm font-bold transition-all duration-200 active:scale-[0.97]"
                style={{
                  background: "var(--green-primary)",
                  color: "var(--text-on-green)",
                  border: "none",
                  boxShadow: "0 6px 20px rgba(34,197,94,0.3)",
                  opacity: canProceed ? 1 : 0.5,
                }}
              >
                Next
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={!canProceed || isSubmitting}
                className="flex-1 h-11 rounded-2xl flex items-center justify-center gap-2 text-sm font-bold transition-all duration-200 active:scale-[0.97]"
                style={{
                  background: "var(--green-primary)",
                  color: "var(--text-on-green)",
                  border: "none",
                  boxShadow: "0 6px 20px rgba(34,197,94,0.3)",
                  opacity: canProceed && !isSubmitting ? 1 : 0.5,
                }}
              >
                {isSubmitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    Create Account
                    <Check className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            )}
          </div>
        </div>

        <p className="text-center text-xs mt-4 profile-stat-card" style={{ color: "var(--text-muted)", animationDelay: "200ms" }}>
          Already have an account?{" "}
          <Link to="/login" className="hover:underline" style={{ color: "var(--green-primary)", fontWeight: 700 }}>
            Sign In
          </Link>
        </p>
      </div>
    </div>
  );
}
