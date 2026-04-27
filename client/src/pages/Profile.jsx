import { useEffect, useState, useRef } from "react";
import { ArrowLeft, Droplets, Flame, LogOut, ShieldCheck, Target, User, Zap, Camera, Check, Pencil, Trash2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { authAPI } from "../utils/api";
import { useUser } from "../context/UserContext";

const GOAL_OPTIONS = [
  { value: "lose_weight", label: "Lose Weight", emoji: "🎯" },
  { value: "maintain", label: "Maintain", emoji: "⚖️" },
  { value: "gain_weight", label: "Gain Weight", emoji: "💪" },
];

const ACTIVITY_OPTIONS = [
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

const WATER_PRESETS = [1500, 2000, 2500, 3000, 3500];

function toEditableUser(user) {
  return {
    name: user?.name || "",
    email: user?.email || "",
    age: user?.age ?? "",
    weight: user?.weight ?? "",
    height: user?.height ?? "",
    gender: user?.gender || "other",
    goal: user?.goal || "maintain",
    activityLevel: user?.activityLevel || "sedentary",
    dailyWaterGoalMl: user?.dailyWaterGoalMl ?? 2500,
  };
}

function calculateEstimate(form) {
  const age = Number(form.age);
  const weight = Number(form.weight);
  const height = Number(form.height);
  if (!age || !weight || !height || age <= 0 || weight <= 0 || height <= 0) return null;

  const maleBMR = 88.362 + 13.397 * weight + 4.799 * height - 5.677 * age;
  const femaleBMR = 447.593 + 9.247 * weight + 3.098 * height - 4.33 * age;

  const bmr = form.gender === "male" ? maleBMR : form.gender === "female" ? femaleBMR : (maleBMR + femaleBMR) / 2;
  const multiplier = ACTIVITY_OPTIONS.find((a) => a.value === form.activityLevel)?.multiplier || 1.2;
  const tdee = bmr * multiplier;

  let adjusted = tdee;
  if (form.goal === "lose_weight") adjusted = Math.max(1200, tdee - 500);
  if (form.goal === "gain_weight") adjusted = tdee + 300;

  return { bmr: Math.round(bmr), tdee: Math.round(tdee), adjusted: Math.round(adjusted) };
}

export default function Profile() {
  const { user, logout, updateUser } = useUser();
  const navigate = useNavigate();

  const [mode, setMode] = useState("view");
  const [form, setForm] = useState(toEditableUser(user));
  const [originalUser, setOriginalUser] = useState(toEditableUser(user));
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [estimatedCalories, setEstimatedCalories] = useState(null);

  const fileInputRef = useRef(null);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [showCheckmark, setShowCheckmark] = useState(false);
  const [showRemoveToast, setShowRemoveToast] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);
  const [justUploaded, setJustUploaded] = useState(false);
  const [heightUnit, setHeightUnit] = useState("cm");
  const [ftHeight, setFtHeight] = useState({ ft: "", in: "" });

  const avatarLetter = (user?.name || "U").trim().charAt(0).toUpperCase();

  useEffect(() => {
    const editable = toEditableUser(user);
    setForm(editable);
    setOriginalUser(editable);
  }, [user]);

  useEffect(() => {
    setEstimatedCalories(calculateEstimate(form));
    // Sync ft/in when height changes (e.g. on initial load)
    if (form.height && heightUnit === "ft") {
      const totalInches = Number(form.height) / 2.54;
      const ft = Math.floor(totalInches / 12);
      const inch = Math.round(totalInches % 12);
      setFtHeight({ ft: String(ft), in: String(inch) });
    }
  }, [form]);

  useEffect(() => {
    setHasChanges(JSON.stringify(form) !== JSON.stringify(originalUser));
  }, [form, originalUser]);

  const setField = (field, value) => setForm((prev) => ({ ...prev, [field]: value }));

  const handleSave = async () => {
    try {
      setIsSaving(true);
      const payload = {
        name: form.name,
        age: Number(form.age),
        weight: Number(form.weight),
        height: Number(form.height),
        gender: form.gender,
        goal: form.goal,
        activityLevel: form.activityLevel,
        dailyWaterGoalMl: Number(form.dailyWaterGoalMl),
      };
      const res = await authAPI.updateProfile(payload);
      updateUser(res.data.user);
      setOriginalUser(toEditableUser(res.data.user));
      setMode("view");
      toast.success("Profile updated!");
    } catch (error) {
      toast.error(error?.response?.data?.error || "Failed to update profile");
    } finally {
      setIsSaving(false);
    }
  };

  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploadingPhoto(true);

      const reader = new FileReader();
      reader.readAsDataURL(file);

      const base64Str = await new Promise((resolve, reject) => {
        reader.onload = (event) => {
          const img = new Image();
          img.src = event.target.result;
          img.onload = () => {
            const canvas = document.createElement("canvas");

            const MAX_WIDTH = 1920;
            const MAX_HEIGHT = 1080;
            let width = img.width;
            let height = img.height;

            if (width > height) {
              if (width > MAX_WIDTH) {
                height *= MAX_WIDTH / width;
                width = MAX_WIDTH;
              }
            } else {
              if (height > MAX_HEIGHT) {
                width *= MAX_HEIGHT / height;
                height = MAX_HEIGHT;
              }
            }

            canvas.width = width;
            canvas.height = height;

            const ctx = canvas.getContext("2d");
            ctx.drawImage(img, 0, 0, width, height);

            resolve(canvas.toDataURL("image/jpeg", 0.9));
          };
          img.onerror = (error) => reject(error);
        };
        reader.onerror = (error) => reject(error);
      });

      await new Promise(r => setTimeout(r, 1000));

      const res = await authAPI.updateProfile({ photoUrl: base64Str });
      updateUser(res.data.user);

      setJustUploaded(true);
      setShowCheckmark(true);
      setTimeout(() => setShowCheckmark(false), 1500);

    } catch (error) {
      toast.error("Failed to upload photo");
      console.error(error);
    } finally {
      setIsUploadingPhoto(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const confirmRemovePhoto = async () => {
    setIsRemoving(true);
    setShowRemoveToast(false);

    setTimeout(async () => {
      try {
        const res = await authAPI.updateProfile({ photoUrl: "" });
        updateUser(res.data.user);
        toast.success("Photo removed");
      } catch (error) {
        toast.error("Failed to remove photo");
        console.error(error);
      } finally {
        setIsRemoving(false);
        setJustUploaded(false);
      }
    }, 300);
  };

  const sectionHeadingStyle = {
    color: "var(--text-muted)",
    textTransform: "uppercase",
    letterSpacing: "0.08em",
    borderLeft: "3px solid var(--green-primary)",
    paddingLeft: "8px",
    fontWeight: 700,
    fontSize: "12px",
  };

  return (
    <div className="page-container" style={{ background: "var(--bg-page)", minHeight: "100vh" }}>
      {mode === "view" ? (
        <div className="w-full pb-10">

          {/* ── Hero Profile Header ── */}
          <div 
            className="relative rounded-[24px] p-6 mb-6 overflow-hidden profile-fade-in"
            style={{
              background: "linear-gradient(145deg, rgba(34,197,94,0.12) 0%, rgba(34,197,94,0.03) 50%, rgba(59,130,246,0.06) 100%)",
              border: "1px solid rgba(34,197,94,0.15)",
              backdropFilter: "blur(20px)",
              WebkitBackdropFilter: "blur(20px)",
            }}
          >
            {/* Decorative orbs */}
            <div className="absolute -top-10 -right-10 w-32 h-32 rounded-full opacity-20" style={{ background: "radial-gradient(circle, var(--green-primary), transparent)" }}></div>
            <div className="absolute -bottom-8 -left-8 w-24 h-24 rounded-full opacity-10" style={{ background: "radial-gradient(circle, #3b82f6, transparent)" }}></div>

            <div className="relative z-10 flex items-center gap-4">
              <div className="relative flex-shrink-0">
                <div
                  className="h-20 w-20 rounded-full flex items-center justify-center text-3xl font-bold overflow-hidden"
                  style={{ 
                    background: "var(--green-primary)", 
                    color: "var(--text-on-green)", 
                    border: "3px solid rgba(255,255,255,0.8)",
                    boxShadow: "0 8px 24px rgba(34,197,94,0.3)"
                  }}
                >
                  {isUploadingPhoto ? (
                    <div className="w-7 h-7 border-[3px] border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : user?.photoUrl ? (
                    <img src={user.photoUrl} alt="Profile" className="w-full h-full object-cover" />
                  ) : (
                    avatarLetter
                  )}
                </div>

                {!user?.photoUrl ? (
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="absolute -bottom-1 -right-1 p-1.5 rounded-full bg-white shadow-lg border border-gray-100 transition-all duration-200 hover:scale-110 active:scale-95 z-10"
                    style={{ color: "var(--green-primary)" }}
                    title="Upload Photo"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                ) : (
                  <button
                    onClick={() => setShowRemoveToast(true)}
                    className="absolute -bottom-1 -right-1 p-1.5 rounded-full bg-white shadow-lg border border-gray-100 transition-all duration-200 hover:scale-110 active:scale-95 z-10"
                    style={{ color: "#ef4444" }}
                    title="Remove Photo"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}

                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/*"
                  className="hidden"
                  onChange={handlePhotoUpload}
                />
              </div>
              <div className="flex-1 min-w-0">
                <h1 className="text-xl font-black truncate" style={{ color: "var(--text-primary)" }}>{user?.name || "User"}</h1>
                <p className="text-xs mt-1 font-medium truncate" style={{ color: "var(--text-muted)" }}>{user?.email || ""}</p>
                <button
                  type="button"
                  onClick={() => setMode("edit")}
                  className="mt-3 px-5 py-2 rounded-full text-xs font-bold transition-all duration-200 hover:-translate-y-0.5 active:scale-[0.97]"
                  style={{
                    background: "var(--green-primary)",
                    color: "var(--text-on-green)",
                    boxShadow: "0 4px 14px rgba(34,197,94,0.3)"
                  }}
                >
                  ✏️ Edit Profile
                </button>
              </div>
            </div>
          </div>

          {/* ── Stats Grid ── */}
          <div className="grid grid-cols-2 gap-3 mb-6">
            {[
              { label: "Goal", value: GOAL_OPTIONS.find((g) => g.value === user?.goal)?.label || "-", Icon: Target, accent: "#22c55e", bgTint: "rgba(34,197,94,0.08)" },
              { label: "Activity", value: ACTIVITY_OPTIONS.find((a) => a.value === user?.activityLevel)?.label || "-", Icon: Zap, accent: "#f59e0b", bgTint: "rgba(245,158,11,0.08)" },
              { label: "Calorie Goal", value: `${user?.dailyCalorieGoal || 2000}`, unit: "kcal", Icon: Flame, accent: "#ef4444", bgTint: "rgba(239,68,68,0.08)" },
              { label: "Water Goal", value: `${user?.dailyWaterGoalMl || 2500}`, unit: "ml", Icon: Droplets, accent: "#3b82f6", bgTint: "rgba(59,130,246,0.08)" },
            ].map((item, index) => (
              <div
                key={item.label}
                className="rounded-2xl p-4 transition-all duration-300 hover:-translate-y-0.5 profile-stat-card"
                style={{ 
                  background: item.bgTint,
                  border: `1px solid ${item.accent}15`,
                  animationDelay: `${index * 80}ms`
                }}
              >
                <div className="flex items-center gap-2 mb-3">
                  <div 
                    className="p-2 rounded-xl"
                    style={{ background: `${item.accent}18` }}
                  >
                    <item.Icon className="h-4 w-4" style={{ color: item.accent }} />
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>{item.label}</span>
                </div>
                <p className="text-lg font-black leading-tight" style={{ color: "var(--text-primary)" }}>
                  {item.value}
                  {item.unit && <span className="text-[11px] font-bold ml-1 opacity-50">{item.unit}</span>}
                </p>
              </div>
            ))}
          </div>

          {/* ── Gender Badge ── */}
          <div 
            className="flex items-center gap-3 rounded-2xl p-4 mb-6 profile-stat-card"
            style={{ 
              background: "rgba(168,85,247,0.06)", 
              border: "1px solid rgba(168,85,247,0.12)",
              animationDelay: "320ms"
            }}
          >
            <div className="p-2 rounded-xl" style={{ background: "rgba(168,85,247,0.12)" }}>
              <User className="h-4 w-4" style={{ color: "#a855f7" }} />
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider block" style={{ color: "var(--text-muted)" }}>Gender</span>
              <span className="text-sm font-black capitalize" style={{ color: "var(--text-primary)" }}>{user?.gender || "-"}</span>
            </div>
          </div>

          {user?.isAdmin && (
            <button
              onClick={() => navigate("/admin/bulk-upload")}
              className="w-full mb-4 flex items-center justify-center gap-2 h-[48px] rounded-xl font-bold shadow-sm transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98]"
              style={{ background: "var(--green-subtle)", color: "var(--green-text)", border: "1px solid var(--green-border)" }}
            >
              <ShieldCheck className="w-5 h-5" />
              Open Admin Bulk Upload
            </button>
          )}

          <button
            onClick={logout}
            className="w-full flex items-center justify-center gap-2 h-[48px] rounded-xl font-bold transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98]"
            style={{
              background: "linear-gradient(135deg, rgba(239,68,68,0.1) 0%, rgba(239,68,68,0.02) 100%)",
              color: "#ef4444",
              border: "1px solid rgba(239,68,68,0.2)",
              backdropFilter: "blur(12px)",
              WebkitBackdropFilter: "blur(12px)",
              boxShadow: "0 4px 16px rgba(239,68,68,0.06)"
            }}
          >
            <LogOut className="w-5 h-5" />
            Sign Out
          </button>
        </div>
      ) : (
        <div className="w-full pb-28">
          <button
            type="button"
            onClick={() => setMode("view")}
            className="inline-flex items-center gap-1 text-sm font-bold mb-6 transition-transform hover:-translate-x-1 mt-2"
            style={{ color: "var(--text-muted)" }}
          >
            <ArrowLeft className="h-4 w-4" />
            Cancel Edit
          </button>

          <div className="mb-6 card p-5 shadow-sm border border-gray-50">
            <p style={sectionHeadingStyle} className="mb-4">Personal Info</p>
            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-[10px] font-bold ml-1 uppercase" style={{ color: "var(--text-muted)" }}>Full Name</label>
                <input className="input-field" value={form.name} onChange={(e) => setField("name", e.target.value)} placeholder="Name" />
              </div>
              <div className="space-y-1">
                <input className="input-field opacity-60 bg-gray-50" value={form.email} readOnly />
                <p
                  className="text-[10px] ml-1 font-bold italic px-2.5 py-1.5 rounded-lg inline-flex items-center gap-1.5"
                  style={{
                    background: "linear-gradient(135deg, rgba(239,68,68,0.1) 0%, rgba(239,68,68,0.05) 100%)",
                    color: "#dc2626",
                    border: "1px solid rgba(239,68,68,0.15)",
                    backdropFilter: "blur(8px)",
                    WebkitBackdropFilter: "blur(8px)",
                    marginTop: "4px"
                  }}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></span>
                  Email cannot be changed as it is linked to your account.
                </p>
              </div>
            </div>
          </div>

          <div className="mb-6 card p-5 shadow-sm border border-gray-50">
            <p style={sectionHeadingStyle} className="mb-4">Body Measurements</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[10px] font-bold ml-1 uppercase" style={{ color: "var(--text-muted)" }}>Age</label>
                <input className="input-field" type="number" min="1" value={form.age} onChange={(e) => setField("age", e.target.value)} placeholder="Age" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold ml-1 uppercase" style={{ color: "var(--text-muted)" }}>Weight (kg)</label>
                <input className="input-field" type="number" min="1" step="0.1" value={form.weight} onChange={(e) => setField("weight", e.target.value)} placeholder="0.0" />
              </div>
              <div className="space-y-1 col-span-2">
                <label className="text-[10px] font-bold ml-1 uppercase" style={{ color: "var(--text-muted)" }}>Height</label>
                <div className="flex gap-2">
                  <div className="flex-1">
                    {heightUnit === "cm" ? (
                      <div className="relative">
                        <input 
                          className="input-field pr-8" 
                          type="number" 
                          min="1" 
                          step="0.1" 
                          value={form.height} 
                          onChange={(e) => setField("height", e.target.value)} 
                          placeholder="0.0" 
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] font-bold opacity-40">cm</span>
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        <div className="relative flex-1">
                          <input 
                            className="input-field pr-6" 
                            type="number" 
                            value={ftHeight.ft} 
                            onChange={(e) => {
                              const newFt = e.target.value;
                              setFtHeight(prev => ({ ...prev, ft: newFt }));
                              const cm = (Number(newFt) * 12 + Number(ftHeight.in)) * 2.54;
                              setField("height", cm.toFixed(1));
                            }} 
                            placeholder="0" 
                          />
                          <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[11px] font-bold opacity-40">ft</span>
                        </div>
                        <div className="relative flex-1">
                          <input 
                            className="input-field pr-6" 
                            type="number" 
                            value={ftHeight.in} 
                            onChange={(e) => {
                              const newIn = e.target.value;
                              setFtHeight(prev => ({ ...prev, in: newIn }));
                              const cm = (Number(ftHeight.ft) * 12 + Number(newIn)) * 2.54;
                              setField("height", cm.toFixed(1));
                            }} 
                            placeholder="0" 
                          />
                          <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[11px] font-bold opacity-40">in</span>
                        </div>
                      </div>
                    )}
                  </div>
                  <select 
                    className="input-field w-[70px] px-2 py-1 text-sm font-bold bg-gray-50 cursor-pointer" 
                    value={heightUnit} 
                    onChange={(e) => setHeightUnit(e.target.value)}
                  >
                    <option value="cm">CM</option>
                    <option value="ft">FT</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="mt-4 flex gap-2">
              {GENDERS.map((gender) => (
                <button
                  key={gender.value}
                  type="button"
                  onClick={() => setField("gender", gender.value)}
                  className="flex-1 h-11 rounded-xl border text-sm font-bold transition-all"
                  style={{
                    background: form.gender === gender.value ? "var(--green-primary)" : "var(--surface-3)",
                    borderColor: form.gender === gender.value ? "var(--green-primary)" : "var(--border-default)",
                    color: form.gender === gender.value ? "var(--text-on-green)" : "var(--text-muted)",
                    boxShadow: form.gender === gender.value ? "0 2px 8px rgba(34,197,94,0.2)" : "none"
                  }}
                >
                  {gender.label}
                </button>
              ))}
            </div>
          </div>

          <div className="mb-6 card p-5 shadow-sm border border-gray-50">
            <p style={sectionHeadingStyle} className="mb-4">Goal & Activity</p>
            <div className="grid grid-cols-3 gap-2 mb-4">
              {GOAL_OPTIONS.map((goal) => {
                const selected = form.goal === goal.value;
                return (
                  <button
                    key={goal.value}
                    type="button"
                    onClick={() => setField("goal", goal.value)}
                    className="min-h-[85px] rounded-xl border px-1 py-2 flex flex-col items-center justify-center transition-all"
                    style={{
                      background: selected ? "var(--green-subtle)" : "var(--surface-3)",
                      borderColor: selected ? "var(--green-primary)" : "var(--border-default)",
                      boxShadow: selected ? "0 2px 8px rgba(34,197,94,0.1)" : "none"
                    }}
                  >
                    <span className="text-[28px] leading-none mb-1">{goal.emoji}</span>
                    <span style={{ color: selected ? "var(--green-text)" : "var(--text-secondary)", fontWeight: 700, fontSize: "11px", textAlign: "center" }}>
                      {goal.label}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="flex gap-2 overflow-x-auto pb-2 hide-scrollbar">
              {ACTIVITY_OPTIONS.map((activity) => {
                const selected = form.activityLevel === activity.value;
                return (
                  <button
                    key={activity.value}
                    type="button"
                    onClick={() => setField("activityLevel", activity.value)}
                    className="whitespace-nowrap px-4 py-2.5 rounded-full text-xs font-bold transition-all flex-shrink-0"
                    style={{
                      background: selected ? "var(--green-primary)" : "var(--surface-3)",
                      color: selected ? "var(--text-on-green)" : "var(--text-muted)",
                      boxShadow: selected ? "0 2px 8px rgba(34,197,94,0.2)" : "none"
                    }}
                  >
                    {activity.label}
                  </button>
                );
              })}
            </div>
          </div>

          {estimatedCalories && (
            <div className="mb-6 rounded-[20px] p-5 shadow-sm transition-all" style={{ background: "var(--green-subtle)", border: "1px solid var(--green-border)" }}>
              <p style={{ color: "var(--text-primary)", fontWeight: 700, fontSize: "14px" }}>Estimated Daily Target</p>
              <p style={{ color: "var(--green-text)", fontSize: "36px", fontWeight: 900, letterSpacing: "-1px" }}>{estimatedCalories.adjusted} <span className="text-lg font-bold opacity-80">kcal</span></p>
              <div className="mt-4 space-y-1.5 text-sm" style={{ color: "var(--text-secondary)", fontWeight: 600 }}>
                <div className="flex justify-between border-b border-white/40 pb-1"><span>BMR (Base rate):</span><span className="font-bold">{estimatedCalories.bmr}</span></div>
                <div className="flex justify-between border-b border-white/40 pb-1 pt-1"><span>TDEE (With activity):</span><span className="font-bold">{estimatedCalories.tdee}</span></div>
                <div className="flex justify-between pt-1 text-green-800"><span>Adjusted for goal:</span><span className="font-bold">{estimatedCalories.adjusted}</span></div>
              </div>
            </div>
          )}

          <div className="mb-6 card p-5 shadow-sm border border-gray-50">
            <p style={sectionHeadingStyle} className="mb-4">Water Goal</p>
            <div className="flex items-center justify-between mb-2">
              <span className="font-bold text-gray-900">{form.dailyWaterGoalMl} ml</span>
              <Droplets className="w-5 h-5 text-blue-500" />
            </div>
            <input
              type="range"
              min="1000"
              max="5000"
              step="250"
              value={form.dailyWaterGoalMl}
              onChange={(e) => setField("dailyWaterGoalMl", Number(e.target.value))}
              className="w-full h-2 rounded-lg appearance-none cursor-pointer"
              style={{ accentColor: "var(--blue-primary)", background: "var(--surface-3)" }}
            />
            <div className="mt-4 flex flex-wrap gap-2">
              {WATER_PRESETS.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setField("dailyWaterGoalMl", preset)}
                  className="px-3 py-1.5 rounded-full text-xs font-bold transition-all"
                  style={{
                    background: Number(form.dailyWaterGoalMl) === preset ? "var(--blue-primary)" : "var(--surface-3)",
                    borderColor: Number(form.dailyWaterGoalMl) === preset ? "var(--blue-primary)" : "var(--border-default)",
                    color: Number(form.dailyWaterGoalMl) === preset ? "white" : "var(--text-muted)",
                    border: "none",
                    boxShadow: Number(form.dailyWaterGoalMl) === preset ? "0 2px 8px rgba(59,130,246,0.3)" : "none"
                  }}
                >
                  {preset}
                </button>
              ))}
            </div>
          </div>

          <button
            type="button"
            onClick={handleSave}
            disabled={!hasChanges || isSaving}
            className="w-full h-[54px] rounded-[16px] transition-all duration-200 active:scale-[0.98]"
            style={{
              background: "var(--green-primary)",
              color: "var(--text-on-green)",
              border: "none",
              boxShadow: "0 6px 16px rgba(34,197,94,0.3)",
              fontWeight: 800,
              fontSize: "16px",
              opacity: !hasChanges || isSaving ? 0.5 : 1,
            }}
          >
            {isSaving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      )}

      {/* Remove Photo Toast Overlay */}
      {showRemoveToast && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center pointer-events-none p-4 pb-24 bg-black/20 animate-fade-in">
          <div className="w-full max-w-[380px] bg-white rounded-2xl shadow-2xl border border-gray-100 p-5 pointer-events-auto animate-toast-slide-up flex flex-col">
            <p className="text-gray-900 font-bold text-lg mb-5 text-center">Remove this photo?</p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowRemoveToast(false)}
                className="flex-1 h-[44px] rounded-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmRemovePhoto}
                className="flex-1 h-[44px] rounded-full bg-red-500 hover:bg-red-600 text-white font-bold shadow-[0_4px_12px_rgba(239,68,68,0.3)] transition-colors"
              >
                Remove
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
