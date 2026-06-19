import { useEffect, useState, useRef, useCallback } from "react";
import { ArrowLeft, Bell, BellOff, Droplets, Flame, LogOut, ShieldCheck, Target, User, Zap, Camera, Check, Pencil, Trash2, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { authAPI } from "../utils/api";
import { useUser } from "../context/UserContext";
import ImageCropModal from "../components/ImageCropModal";
import {
  registerSW,
  getPushPermission,
  getCurrentSubscription,
  subscribeToPush,
  unsubscribeFromPush,
} from "../utils/pushNotifications";

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

// Physiologically sane bounds — kept in sync with the server's validation.
const LIMITS = {
  age: { min: 13, max: 120 },
  weight: { min: 25, max: 350 }, // kg
  height: { min: 100, max: 250 }, // cm
};

const inRange = (value, { min, max }) => {
  const n = Number(value);
  return Number.isFinite(n) && n >= min && n <= max;
};

const GENDERS = [
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
  { value: "other", label: "Other" },
];

const WATER_PRESETS = [1500, 2000, 2500, 3000, 3500];
// Allow any custom daily water goal within a sane safety range (kept in sync with server).
const WATER_LIMITS = { min: 500, max: 20000 };

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
  const [cropSrc, setCropSrc] = useState(null);
  const [heightUnit, setHeightUnit] = useState("cm");
  const [ftHeight, setFtHeight] = useState({ ft: "", in: "" });

  // Push notification state
  const [pushSupported, setPushSupported] = useState(false);
  const [pushEnabled, setPushEnabled] = useState(false);
  const [pushLoading, setPushLoading] = useState(false);

  const avatarLetter = (user?.name || "U").trim().charAt(0).toUpperCase();

  useEffect(() => {
    const editable = toEditableUser(user);
    setForm(editable);
    setOriginalUser(editable);
  }, [user]);

  useEffect(() => {
    setEstimatedCalories(calculateEstimate(form));
  }, [form]);

  // Derive ft/in from the cm height only when switching into ft mode (or on load),
  // not on every form change — otherwise typing in ft/in fights itself.
  useEffect(() => {
    if (heightUnit === "ft" && form.height) {
      const totalInches = Number(form.height) / 2.54;
      const ft = Math.floor(totalInches / 12);
      const inch = Math.round(totalInches % 12);
      setFtHeight({ ft: String(ft), in: String(inch) });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [heightUnit]);

  useEffect(() => {
    setHasChanges(JSON.stringify(form) !== JSON.stringify(originalUser));
  }, [form, originalUser]);

  // Check push support and current subscription status
  useEffect(() => {
    const supported = "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
    setPushSupported(supported);
    if (!supported) return;
    registerSW().then(() => {
      getCurrentSubscription().then((sub) => setPushEnabled(!!sub));
    });
  }, []);

  const handlePushToggle = useCallback(async () => {
    if (pushLoading) return;
    setPushLoading(true);
    const wasEnabled = pushEnabled;
    // Optimistic update — flip immediately so the toggle feels instant
    setPushEnabled(!wasEnabled);
    try {
      if (wasEnabled) {
        await unsubscribeFromPush();
        toast.success("Push notifications disabled");
      } else {
        const result = await subscribeToPush();
        if (result.ok) {
          toast.success("Push notifications enabled!");
        } else {
          // Revert on failure
          setPushEnabled(wasEnabled);
          if (result.reason === "denied") {
            toast.error("Notifications blocked — enable them in browser settings.");
          } else {
            toast.error("Push notifications not supported on this browser.");
          }
        }
      }
    } catch (err) {
      setPushEnabled(wasEnabled); // revert on error
      toast.error("Something went wrong. Try again.");
    } finally {
      setPushLoading(false);
    }
  }, [pushEnabled, pushLoading]);

  const setField = (field, value) => setForm((prev) => ({ ...prev, [field]: value }));

  const handleSave = async () => {
    // Validate body stats before hitting the server so the user gets
    // immediate, field-specific feedback.
    if (!inRange(form.age, LIMITS.age)) {
      return toast.error(`Enter a valid age (${LIMITS.age.min}–${LIMITS.age.max})`);
    }
    if (!inRange(form.weight, LIMITS.weight)) {
      return toast.error(`Enter a valid weight (${LIMITS.weight.min}–${LIMITS.weight.max} kg)`);
    }
    if (!inRange(form.height, LIMITS.height)) {
      return toast.error(`Enter a valid height (${LIMITS.height.min}–${LIMITS.height.max} cm)`);
    }
    if (!inRange(form.dailyWaterGoalMl, WATER_LIMITS)) {
      return toast.error(`Enter a water goal between ${WATER_LIMITS.min} and ${WATER_LIMITS.max} ml`);
    }

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

  // Step 1: file selected → read as data URL → open the crop modal
  const handlePhotoUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (fileInputRef.current) fileInputRef.current.value = "";

    const reader = new FileReader();
    reader.onload = () => setCropSrc(reader.result);
    reader.readAsDataURL(file);
  };

  // Step 2: crop confirmed → upload the cropped (square) data URL
  const handleCropConfirm = async (dataUrl) => {
    setCropSrc(null);
    try {
      setIsUploadingPhoto(true);
      const res = await authAPI.updateProfile({ photoUrl: dataUrl });
      updateUser(res.data.user);
      setJustUploaded(true);
      setShowCheckmark(true);
      setTimeout(() => setShowCheckmark(false), 1500);
    } catch (error) {
      toast.error("Failed to upload photo");
      console.error(error);
    } finally {
      setIsUploadingPhoto(false);
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
      <ImageCropModal
        imageSrc={cropSrc}
        onConfirm={handleCropConfirm}
        onCancel={() => setCropSrc(null)}
      />
      {mode === "view" ? (
        <div className="w-full pb-10">

          {/* ── Hero Profile Header ── */}
          <div
            className="relative rounded-[24px] p-6 mb-6 overflow-hidden profile-fade-in"
            style={{
              background: "linear-gradient(145deg, rgba(34,197,94,0.18) 0%, rgba(34,197,94,0.08) 60%, rgba(34,197,94,0.13) 100%)",
              border: "1px solid var(--green-border)",
              backdropFilter: "blur(24px) saturate(200%)",
              WebkitBackdropFilter: "blur(24px) saturate(200%)",
              boxShadow: "0 8px 32px rgba(34,197,94,0.15), inset 0 1px 0 rgba(255,255,255,0.45), inset 0 -1px 0 rgba(34,197,94,0.06)",
            }}
          >
            {/* Subtle radial shimmer — top-right only */}
            <div
              className="absolute -top-8 -right-8 w-36 h-36 rounded-full pointer-events-none"
              style={{ background: "radial-gradient(circle, rgba(34,197,94,0.18), transparent 70%)" }}
            />

            <div className="relative z-10 flex items-center gap-4">
              <div className="relative flex-shrink-0">
                {/* Avatar — single glass ring, same as navbar avatar */}
                <div
                  className="h-[84px] w-[84px] rounded-full flex items-center justify-center text-3xl font-bold overflow-hidden"
                  style={{
                    background: "linear-gradient(145deg, rgba(34,150,84,0.95) 0%, rgba(22,120,66,0.97) 55%, rgba(20,90,52,1) 100%)",
                    border: "1.5px solid rgba(187,247,208,0.50)",
                    boxShadow: "0 6px 22px rgba(20,90,52,0.32), inset 0 1px 0 rgba(255,255,255,0.30), inset 0 -2px 6px rgba(0,0,0,0.20)",
                    color: "#f0fdf4",
                  }}
                >
                  {isUploadingPhoto ? (
                    <div className="w-7 h-7 border-[3px] border-t-transparent rounded-full animate-spin" style={{ borderColor: "#dcfce7", borderTopColor: "transparent" }} />
                  ) : user?.photoUrl ? (
                    <img src={user.photoUrl} alt="Profile" className="w-full h-full object-cover" />
                  ) : (
                    avatarLetter
                  )}
                </div>

                {!user?.photoUrl ? (
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="glass-green absolute -bottom-0.5 -right-0.5 p-1.5 rounded-full transition-all duration-200 hover:scale-110 active:scale-95 z-10 no-spring"
                    title="Upload Photo"
                  >
                    <Camera className="w-3.5 h-3.5" />
                  </button>
                ) : (
                  <button
                    onClick={() => setShowRemoveToast(true)}
                    className="absolute -bottom-0.5 -right-0.5 p-1.5 rounded-full transition-all duration-200 hover:scale-110 active:scale-95 z-10 no-spring"
                    style={{
                      background: "linear-gradient(180deg, rgba(239,68,68,0.18), rgba(239,68,68,0.08))",
                      border: "1px solid rgba(239,68,68,0.28)",
                      boxShadow: "inset 0 1px 0 rgba(255,255,255,0.35), 0 3px 10px rgba(239,68,68,0.15)",
                      color: "#ef4444",
                    }}
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
                <h1 className="text-xl font-black truncate" style={{ color: "var(--green-primary)" }}>{user?.name || "User"}</h1>
                <p className="text-xs mt-1 font-medium truncate" style={{ color: "var(--text-muted)" }}>{user?.email || ""}</p>
                <button
                  type="button"
                  onClick={() => setMode("edit")}
                  className="glass-green mt-3 px-5 py-2 rounded-full text-xs font-bold transition-all duration-200 hover:-translate-y-0.5 active:scale-[0.97] no-spring"
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

          {/* Push Notifications toggle — view mode */}
          {pushSupported && (
            <div
              className="mb-4 flex items-center justify-between p-4 rounded-2xl"
              style={{
                background: pushEnabled
                  ? "linear-gradient(145deg, rgba(34,197,94,0.13), rgba(34,197,94,0.05))"
                  : "linear-gradient(145deg, rgba(120,124,134,0.20), rgba(120,124,134,0.09))",
                border: pushEnabled
                  ? "1px solid rgba(34,197,94,0.30)"
                  : "1px solid rgba(120,124,134,0.28)",
                backdropFilter: "blur(12px)",
                WebkitBackdropFilter: "blur(12px)",
                boxShadow: pushEnabled
                  ? "0 2px 12px rgba(34,197,94,0.08), inset 0 1px 0 rgba(255,255,255,0.5)"
                  : "0 1px 6px rgba(0,0,0,0.06), inset 0 1px 0 rgba(255,255,255,0.6)",
              }}
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{
                    background: pushEnabled
                      ? "linear-gradient(180deg, rgba(34,197,94,0.22), rgba(34,197,94,0.1))"
                      : "linear-gradient(180deg, rgba(120,124,134,0.22), rgba(120,124,134,0.12))",
                    border: pushEnabled ? "1px solid var(--green-border)" : "1px solid rgba(120,124,134,0.30)",
                  }}
                >
                  {pushEnabled
                    ? <Bell className="w-4 h-4" style={{ color: "var(--green-primary)" }} />
                    : <BellOff className="w-4 h-4" style={{ color: "var(--text-muted)" }} />
                  }
                </div>
                <div>
                  <p className="text-[13px] font-bold leading-tight" style={{ color: "var(--text-primary)" }}>
                    Push Notifications
                  </p>
                  <p className="text-[11px] mt-0.5" style={{ color: "var(--text-muted)" }}>
                    {pushEnabled ? "Meal, water & streak alerts on" : "Tap to enable reminders"}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handlePushToggle}
                disabled={pushLoading}
                aria-label={pushEnabled ? "Disable push notifications" : "Enable push notifications"}
                className="relative flex-shrink-0 w-[52px] h-[30px] rounded-full transition-all duration-150 no-spring disabled:opacity-60"
                style={{
                  background: pushEnabled
                    ? "linear-gradient(180deg, rgba(34,197,94,0.42) 0%, rgba(34,197,94,0.24) 100%)"
                    : "linear-gradient(180deg, rgba(0,0,0,0.10) 0%, rgba(0,0,0,0.06) 100%)",
                  border: pushEnabled
                    ? "1px solid rgba(34,197,94,0.50)"
                    : "1px solid rgba(0,0,0,0.13)",
                  boxShadow: pushEnabled
                    ? "inset 0 1px 0 rgba(255,255,255,0.35), 0 0 12px rgba(34,197,94,0.20), 0 2px 6px rgba(34,197,94,0.12)"
                    : "inset 0 1px 0 rgba(255,255,255,0.50), inset 0 -1px 0 rgba(0,0,0,0.06)",
                  backdropFilter: "blur(8px)",
                  WebkitBackdropFilter: "blur(8px)",
                }}
              >
                <span
                  className="absolute w-[22px] h-[22px] rounded-full transition-[left] duration-150"
                  style={{
                    top: "50%",
                    transform: "translateY(-50%)",
                    left: pushEnabled ? "calc(100% - 26px)" : "4px",
                    background: "linear-gradient(160deg, rgba(255,255,255,0.98) 0%, rgba(235,255,243,0.92) 100%)",
                    border: "1px solid rgba(255,255,255,0.7)",
                    boxShadow: pushEnabled
                      ? "0 2px 8px rgba(34,197,94,0.28), inset 0 1px 0 rgba(255,255,255,0.95)"
                      : "0 2px 6px rgba(0,0,0,0.18), inset 0 1px 0 rgba(255,255,255,0.95)",
                  }}
                />
              </button>
            </div>
          )}

          {user?.isAdmin && (
            <button
              onClick={() => navigate("/admin/bulk-upload")}
              className="glass-green w-full mb-4 flex items-center justify-center gap-2 h-[48px] rounded-xl font-bold transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] no-spring"
            >
              <ShieldCheck className="w-5 h-5" />
              Open Admin Bulk Upload
            </button>
          )}

          <button
            onClick={logout}
            className="w-full flex items-center justify-center gap-2 h-[48px] rounded-xl font-bold transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] no-spring"
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
        <div className="w-full pb-6">

          <div className="mb-6 card p-5">
            <p style={sectionHeadingStyle} className="mb-4">Personal Info</p>
            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-[10px] font-bold ml-1 uppercase" style={{ color: "var(--text-muted)" }}>Full Name</label>
                <input className="input-field" value={form.name} onChange={(e) => setField("name", e.target.value)} placeholder="Name" />
              </div>
              <div className="space-y-1">
                <input className="input-field opacity-60" style={{ background: "var(--lg-tint)" }} value={form.email} readOnly />
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

          <div className="mb-6 card p-5">
            <p style={sectionHeadingStyle} className="mb-4">Body Measurements</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[10px] font-bold ml-1 uppercase" style={{ color: "var(--text-muted)" }}>Age</label>
                <input className="input-field" type="number" min={LIMITS.age.min} max={LIMITS.age.max} value={form.age} onChange={(e) => setField("age", e.target.value)} placeholder="Age" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold ml-1 uppercase" style={{ color: "var(--text-muted)" }}>Weight (kg)</label>
                <input className="input-field" type="number" min={LIMITS.weight.min} max={LIMITS.weight.max} step="0.1" value={form.weight} onChange={(e) => setField("weight", e.target.value)} placeholder="0.0" />
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
                          min={LIMITS.height.min}
                          max={LIMITS.height.max}
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
                    className="input-field w-[70px] px-2 py-1 text-sm font-bold cursor-pointer" 
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
                  className="flex-1 h-11 rounded-xl border text-sm font-bold transition-all active:scale-95"
                  style={{
                    background: form.gender === gender.value
                      ? "linear-gradient(180deg, rgba(34,197,94,0.22), rgba(34,197,94,0.10))"
                      : "var(--tab-inactive-bg)",
                    borderColor: form.gender === gender.value ? "rgba(34,197,94,0.38)" : "var(--tab-inactive-border)",
                    color: form.gender === gender.value ? "var(--green-primary)" : "var(--tab-inactive-color)",
                    boxShadow: form.gender === gender.value
                      ? "inset 0 1px 0 rgba(255,255,255,0.45), 0 2px 8px rgba(34,197,94,0.14)"
                      : "var(--tab-inactive-shadow)",
                    backdropFilter: "blur(8px)",
                    WebkitBackdropFilter: "blur(8px)",
                  }}
                >
                  {gender.label}
                </button>
              ))}
            </div>
          </div>

          <div className="mb-6 card p-5">
            <p style={sectionHeadingStyle} className="mb-4">Goal & Activity</p>
            <div className="grid grid-cols-3 gap-2 mb-4">
              {GOAL_OPTIONS.map((goal) => {
                const selected = form.goal === goal.value;
                return (
                  <button
                    key={goal.value}
                    type="button"
                    onClick={() => setField("goal", goal.value)}
                    className="min-h-[85px] rounded-xl border px-1 py-2 flex flex-col items-center justify-center transition-all active:scale-95"
                    style={{
                      background: selected
                        ? "linear-gradient(180deg, rgba(34,197,94,0.22), rgba(34,197,94,0.10))"
                        : "var(--tab-inactive-bg)",
                      borderColor: selected ? "rgba(34,197,94,0.38)" : "var(--tab-inactive-border)",
                      boxShadow: selected
                        ? "inset 0 1px 0 rgba(255,255,255,0.45), 0 2px 8px rgba(34,197,94,0.14)"
                        : "var(--tab-inactive-shadow)",
                      backdropFilter: "blur(8px)",
                      WebkitBackdropFilter: "blur(8px)",
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
                    className="whitespace-nowrap px-4 py-2.5 rounded-full text-xs font-bold transition-all flex-shrink-0 active:scale-95"
                    style={{
                      background: selected
                        ? "linear-gradient(180deg, rgba(34,197,94,0.22), rgba(34,197,94,0.10))"
                        : "var(--tab-inactive-bg)",
                      border: selected ? "1px solid rgba(34,197,94,0.38)" : "1px solid var(--tab-inactive-border)",
                      color: selected ? "var(--green-primary)" : "var(--tab-inactive-color)",
                      boxShadow: selected
                        ? "inset 0 1px 0 rgba(255,255,255,0.45), 0 2px 8px rgba(34,197,94,0.14)"
                        : "var(--tab-inactive-shadow)",
                      backdropFilter: "blur(8px)",
                      WebkitBackdropFilter: "blur(8px)",
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

          <div className="mb-6 card p-5">
            <div className="flex items-center justify-between mb-4">
              <p style={sectionHeadingStyle}>Water Goal</p>
              <div className="glass-blue w-9 h-9 rounded-xl flex items-center justify-center">
                <Droplets className="w-4 h-4" style={{ color: "#0ea5e9" }} />
              </div>
            </div>

            {/* Prominent value */}
            <div className="flex items-end gap-1.5 mb-4">
              <span className="text-4xl font-black leading-none" style={{ color: "#0ea5e9", letterSpacing: "-1px" }}>
                {form.dailyWaterGoalMl || 0}
              </span>
              <span className="text-sm font-semibold pb-1" style={{ color: "var(--text-muted)" }}>
                ml / day{Number(form.dailyWaterGoalMl) > 0 ? ` (${(Number(form.dailyWaterGoalMl) / 1000).toFixed(2).replace(/\.?0+$/, "")} L)` : ""}
              </span>
            </div>

            {/* Slider */}
            <input
              type="range"
              min="1000"
              max="20000"
              step="250"
              value={Math.min(20000, Math.max(1000, Number(form.dailyWaterGoalMl) || 1000))}
              onChange={(e) => setField("dailyWaterGoalMl", Number(e.target.value))}
              className="water-range"
            />
            <div className="flex justify-between mt-1.5 text-[10px] font-bold" style={{ color: "var(--text-muted)" }}>
              <span>1L</span>
              <span>20L</span>
            </div>

            {/* Presets */}
            <div className="mt-4 grid grid-cols-5 gap-1.5">
              {WATER_PRESETS.map((preset) => {
                const active = Number(form.dailyWaterGoalMl) === preset;
                return (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setField("dailyWaterGoalMl", preset)}
                    className="py-2 rounded-xl text-xs font-bold transition-all active:scale-95"
                    style={{
                      background: active
                        ? "linear-gradient(180deg, rgba(56,189,248,0.24), rgba(14,165,233,0.12))"
                        : "var(--tab-inactive-bg)",
                      border: active ? "1px solid rgba(56,189,248,0.36)" : "1px solid var(--tab-inactive-border)",
                      color: active ? "#0ea5e9" : "var(--tab-inactive-color)",
                      boxShadow: active
                        ? "inset 0 1px 0 rgba(255,255,255,0.45), 0 2px 8px rgba(14,165,233,0.14)"
                        : "var(--tab-inactive-shadow)",
                      backdropFilter: "blur(8px)",
                      WebkitBackdropFilter: "blur(8px)",
                    }}
                  >
                    {preset >= 1000 ? `${preset / 1000}L` : preset}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Push Notifications */}
          {pushSupported && (
            <div
              className="mb-6 card p-5 transition-all duration-300"
              style={!pushEnabled ? {
                // Off → muted grey liquid-glass gradient (card keeps its backdrop blur).
                background: "linear-gradient(145deg, rgba(120,124,134,0.20), rgba(120,124,134,0.09))",
                border: "1px solid rgba(120,124,134,0.28)",
                boxShadow: "inset 0 1px 0 var(--lg-hl-top), inset 0 -1px 1px 0 var(--lg-hl-bottom)",
              } : undefined}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{
                      background: pushEnabled
                        ? "linear-gradient(180deg, rgba(34,197,94,0.22), rgba(34,197,94,0.1))"
                        : "var(--lg-tint)",
                      border: pushEnabled ? "1px solid var(--green-border)" : "1px solid var(--lg-border)",
                    }}
                  >
                    {pushEnabled
                      ? <Bell className="w-4 h-4" style={{ color: "var(--green-primary)" }} />
                      : <BellOff className="w-4 h-4" style={{ color: "var(--text-muted)" }} />
                    }
                  </div>
                  <div>
                    <p className="text-[13px] font-bold leading-tight" style={{ color: "var(--text-primary)" }}>
                      Push Notifications
                    </p>
                    <p className="text-[11px] mt-0.5 leading-tight" style={{ color: "var(--text-muted)" }}>
                      {pushEnabled ? "Meal, water & streak alerts on" : "Get reminders even when app is closed"}
                    </p>
                  </div>
                </div>

                {/* Toggle switch */}
                <button
                  type="button"
                  onClick={handlePushToggle}
                  disabled={pushLoading}
                  aria-label={pushEnabled ? "Disable push notifications" : "Enable push notifications"}
                  className="relative flex-shrink-0 w-[52px] h-[30px] rounded-full transition-all duration-150 no-spring disabled:opacity-60"
                  style={{
                    background: pushEnabled
                      ? "linear-gradient(180deg, rgba(34,197,94,0.42) 0%, rgba(34,197,94,0.24) 100%)"
                      : "linear-gradient(180deg, rgba(0,0,0,0.10) 0%, rgba(0,0,0,0.06) 100%)",
                    border: pushEnabled
                      ? "1px solid rgba(34,197,94,0.50)"
                      : "1px solid rgba(0,0,0,0.13)",
                    boxShadow: pushEnabled
                      ? "inset 0 1px 0 rgba(255,255,255,0.35), 0 0 12px rgba(34,197,94,0.20), 0 2px 6px rgba(34,197,94,0.12)"
                      : "inset 0 1px 0 rgba(255,255,255,0.50), inset 0 -1px 0 rgba(0,0,0,0.06)",
                    backdropFilter: "blur(8px)",
                    WebkitBackdropFilter: "blur(8px)",
                  }}
                >
                  <span
                    className="absolute w-[22px] h-[22px] rounded-full transition-[left] duration-150"
                    style={{
                      top: "50%",
                      transform: "translateY(-50%)",
                      left: pushEnabled ? "calc(100% - 26px)" : "4px",
                      background: "linear-gradient(160deg, rgba(255,255,255,0.98) 0%, rgba(235,255,243,0.92) 100%)",
                      border: "1px solid rgba(255,255,255,0.7)",
                      boxShadow: pushEnabled
                        ? "0 2px 8px rgba(34,197,94,0.28), inset 0 1px 0 rgba(255,255,255,0.95)"
                        : "0 2px 6px rgba(0,0,0,0.18), inset 0 1px 0 rgba(255,255,255,0.95)",
                    }}
                  />
                </button>
              </div>
            </div>
          )}

          <div className="flex flex-col gap-3">
            <button
              type="button"
              onClick={() => setMode("view")}
              className="flex items-center justify-center w-full h-[54px] rounded-[16px] transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] no-spring"
              style={{
                background: "linear-gradient(135deg, rgba(239,68,68,0.16) 0%, rgba(239,68,68,0.08) 100%)",
                color: "#f87171",
                border: "1px solid rgba(239,68,68,0.25)",
                backdropFilter: "blur(12px)",
                WebkitBackdropFilter: "blur(12px)",
                boxShadow: "inset 0 1px 0 rgba(255,255,255,0.30), 0 2px 8px rgba(239,68,68,0.10)",
                fontWeight: 800,
                fontSize: "16px",
              }}
            >
              Cancel Edit
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={!hasChanges || isSaving}
              className="glass-green w-full h-[54px] rounded-[16px] transition-all duration-200 active:scale-[0.98] no-spring"
              style={{
                fontWeight: 800,
                fontSize: "16px",
                opacity: !hasChanges || isSaving ? 0.5 : 1,
              }}
            >
              {isSaving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </div>
      )}

      {/* Remove Photo Confirm — centered in viewport */}
      {showRemoveToast && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-fade-in"
          style={{ background: "var(--bg-modal-overlay)", backdropFilter: "blur(4px)", WebkitBackdropFilter: "blur(4px)" }}
          onClick={() => setShowRemoveToast(false)}
        >
          <div
            className="w-full max-w-[280px] rounded-2xl p-5 animate-toast-slide-up flex flex-col"
            onClick={(e) => e.stopPropagation()}
            style={{ background: "linear-gradient(180deg, var(--lg-sheen), transparent 30%), var(--surface-glass)", backdropFilter: "blur(24px) saturate(180%)", WebkitBackdropFilter: "blur(24px) saturate(180%)", border: "1px solid var(--lg-border)", boxShadow: "0 24px 80px rgba(0,0,0,0.18), 0 4px 20px rgba(0,0,0,0.1)" }}
          >
            <p className="text-[var(--text-primary)] font-bold text-[15px] mb-4 text-center">Remove this photo?</p>
            <div className="flex gap-2.5">
              <button
                onClick={() => setShowRemoveToast(false)}
                className="flex-1 h-[36px] rounded-full text-sm font-bold transition-all active:scale-95"
                style={{ background: "var(--lg-tint)", border: "1px solid var(--lg-border)", boxShadow: "inset 0 1px 0 var(--lg-hl-top)", color: "var(--text-secondary)" }}
              >
                Cancel
              </button>
              <button
                onClick={confirmRemovePhoto}
                className="flex-1 h-[36px] rounded-full text-sm font-bold transition-all active:scale-95"
                style={{ background: "linear-gradient(180deg, rgba(239,68,68,0.18), rgba(239,68,68,0.08))", border: "1px solid rgba(239,68,68,0.3)", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.35), 0 4px 12px rgba(239,68,68,0.18)", color: "#ef4444" }}
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
