import { useState, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { AlertCircle, ArrowRight, Eye, EyeOff, Lock, Mail } from "lucide-react";
import toast from "react-hot-toast";
import api, { setAuthToken } from "../utils/api";
import { useUser } from "../context/UserContext";
import BrandMark from "../components/BrandMark";
import GoogleSignInButton from "../components/GoogleSignInButton";

function isValidEmail(email) {
  return /^[a-zA-Z0-9.]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(email);
}

export default function Login() {
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ email: "", password: "" });
  const { login } = useUser();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  useEffect(() => {
    if (searchParams.get("expired") === "true") {
      setError("Session expired. Please log in again.");
      setSearchParams({});
    }
  }, [searchParams, setSearchParams]);

  const setField = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (error) setError("");
  };

  const isFormValid = form.email.trim() && form.password;

  const handleSubmit = async (e) => {
    if (window.loginDebug) console.log("LOGIN FUNCTION RUNNING");
    e.preventDefault();
    if (!isFormValid) return setError("Email and password are required");

    setIsSubmitting(true);
    setError("");

    try {
      const res = await api.post("/auth/login", {
        email: form.email.trim().toLowerCase(),
        password: form.password,
        rememberMe,
      });

      // Auth token is set by the server as an httpOnly cookie; we also keep a
      // bearer-token copy for browsers that block the cross-site cookie (Safari).
      setAuthToken(res.data.token, rememberMe);
      login(res.data.user, rememberMe);

      // ✅ Redirect
      navigate("/dashboard");
    } catch (err) {
      console.error("LOGIN ERROR:", err); // 🔥
      
      if (!err.response) {
        toast.error("Server is starting, please wait a moment...");
      } else {
        setError(err.response?.data?.message || "Login failed. Please try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div 
      className="flex flex-col items-center justify-center px-5 py-4 relative overflow-hidden" 
      style={{ background: "var(--bg-page)", minHeight: "100%", height: "100%" }}
    >
      {/* ── Decorative background orbs ── */}
      <div className="absolute -top-20 -right-20 w-52 h-52 rounded-full opacity-[0.07]" style={{ background: "radial-gradient(circle, var(--green-primary), transparent)" }}></div>
      <div className="absolute -bottom-16 -left-16 w-40 h-40 rounded-full opacity-[0.05]" style={{ background: "radial-gradient(circle, #3b82f6, transparent)" }}></div>
      <div className="absolute top-1/3 right-6 w-20 h-20 rounded-full opacity-[0.04]" style={{ background: "radial-gradient(circle, #f59e0b, transparent)" }}></div>

      <div className="w-full max-w-sm relative z-10 profile-fade-in">
        {/* ── Logo & Brand ── */}
        <div className="text-center mb-5">
          <BrandMark
            size={60}
            className="mx-auto mb-3"
            style={{ filter: "drop-shadow(0 10px 24px rgba(34,197,94,0.35))" }}
          />
          <h1 className="text-xl font-black tracking-tight font-display" style={{ color: "var(--text-primary)" }}>PureIntake</h1>
          <p className="text-xs mt-1 font-medium" style={{ color: "var(--text-muted)" }}>Track smarter. Eat better.</p>
        </div>

        {/* ── Login Card ── */}
        <div 
          className="rounded-[20px] p-5 profile-stat-card"
          style={{ 
            background: "var(--surface-glass)",
            border: "1px solid var(--border-glass)",
            backdropFilter: "blur(20px)",
            WebkitBackdropFilter: "blur(20px)",
            boxShadow: "0 12px 40px rgba(0,0,0,0.06), 0 2px 8px rgba(0,0,0,0.03)",
            animationDelay: "100ms"
          }}
        >
          <div className="mb-4">
            <h2 className="text-lg font-black" style={{ color: "var(--text-primary)" }}>Welcome back</h2>
            <p className="text-xs mt-0.5 font-medium" style={{ color: "var(--text-muted)" }}>Sign in to continue your journey</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label htmlFor="login-email" className="block text-[10px] font-bold uppercase tracking-wider mb-1 ml-1" style={{ color: "var(--text-muted)" }}>
                Email
              </label>
              <div className="relative flex items-center">
                <Mail className="absolute left-3 w-4 h-4 pointer-events-none z-10" style={{ color: "var(--text-muted)" }} />
                <input
                  id="login-email"
                  type="email"
                  placeholder="you@example.com"
                  value={form.email}
                  onChange={(e) => setField("email", e.target.value)}
                  className="input-field pl-10 text-sm h-11"
                />
              </div>
              {form.email.trim() && !isValidEmail(form.email.trim()) && (
                <p className="text-[11px] font-semibold mt-1 ml-1" style={{ color: "#dc2626" }}>Enter a valid email address</p>
              )}
            </div>

            <div>
              <label htmlFor="login-password" className="block text-[10px] font-bold uppercase tracking-wider mb-1 ml-1" style={{ color: "var(--text-muted)" }}>
                Password
              </label>
              <div className="relative flex items-center">
                <Lock className="absolute left-3 w-4 h-4 pointer-events-none z-10" style={{ color: "var(--text-muted)" }} />
                <input
                  id="login-password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={form.password}
                  onChange={(e) => setField("password", e.target.value)}
                  className="input-field pl-10 pr-10 text-sm h-11"
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 z-10 flex items-center justify-center no-spring" style={{ color: "var(--text-muted)" }}>
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <label className="flex w-fit items-center gap-2.5 text-xs font-semibold cursor-pointer select-none" style={{ color: "var(--text-secondary)" }}>
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="hidden"
              />
              <span
                className="w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0 transition-all duration-200"
                style={{
                  background: rememberMe
                    ? "linear-gradient(180deg, rgba(34,197,94,0.22), rgba(34,197,94,0.10))"
                    : "var(--lg-tint)",
                  border: rememberMe
                    ? "1.5px solid var(--green-border)"
                    : "1.5px solid var(--lg-border)",
                  boxShadow: rememberMe
                    ? "inset 0 1px 0 rgba(255,255,255,0.35), 0 0 8px rgba(34,197,94,0.15)"
                    : "inset 0 1px 0 var(--lg-hl-top)",
                }}
              >
                {rememberMe && (
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                    <path d="M2.5 6L5 8.5L9.5 3.5" stroke="var(--green-primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </span>
              Remember me
            </label>

            {error && (
              <div
                className="flex items-center gap-2 rounded-xl px-3 py-2.5 text-xs font-semibold"
                style={{
                  background: "linear-gradient(135deg, rgba(239,68,68,0.1), rgba(239,68,68,0.04))",
                  color: "#dc2626",
                  border: "1px solid rgba(239,68,68,0.15)",
                }}
              >
                <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                <p>{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="glass-green w-full h-12 rounded-2xl flex items-center justify-center gap-2 text-sm font-bold transition-all duration-200 hover:scale-[1.02] active:scale-[0.97] no-spring disabled:opacity-60"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-current/30 border-t-current rounded-full animate-spin" />
                  Signing in...
                </>
              ) : (
                "Sign In"
              )}
            </button>
          </form>

          <GoogleSignInButton mode="signin" />
        </div>

        {/* ── Create Account Link ── */}
        <p 
          className="text-center text-xs mt-4 profile-stat-card" 
          style={{ color: "var(--text-muted)", animationDelay: "200ms" }}
        >
          New here?{" "}
          <Link to="/register" className="inline-flex items-center gap-1 hover:underline" style={{ color: "var(--green-primary)", fontWeight: 700 }}>
            Create your account
            <ArrowRight className="w-3 h-3" />
          </Link>
        </p>
      </div>
    </div>
  );
}
