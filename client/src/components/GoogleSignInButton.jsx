import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { authAPI } from "../utils/api";
import { useUser } from "../context/UserContext";
import { isProfileComplete } from "../utils/user";

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
const GSI_SRC = "https://accounts.google.com/gsi/client";

/** Load the Google Identity Services script once, shared across mounts. */
function loadGsiScript() {
  if (window.google?.accounts?.id) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${GSI_SRC}"]`);
    if (existing) {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", reject);
      return;
    }
    const script = document.createElement("script");
    script.src = GSI_SRC;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

/** Official multi-colour Google "G" mark. */
function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true" className="flex-shrink-0">
      <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62z" />
      <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.81.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.33A9 9 0 0 0 9 18z" />
      <path fill="#FBBC05" d="M3.97 10.72a5.41 5.41 0 0 1 0-3.44V4.95H.96a9 9 0 0 0 0 8.1l3.01-2.33z" />
      <path fill="#EA4335" d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58A9 9 0 0 0 .96 4.95l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58z" />
    </svg>
  );
}

/**
 * "Continue with Google" — liquid-glass styled. Google's real button is
 * rendered transparently on top to capture the click (keeps the secure
 * ID-token flow); our styled button shows through underneath.
 * Renders nothing until a client ID is configured.
 */
export default function GoogleSignInButton() {
  const overlayRef = useRef(null);
  const navigate = useNavigate();
  const { login } = useUser();

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID) return;
    let cancelled = false;

    const handleCredential = async (response) => {
      try {
        const res = await authAPI.googleLogin(response.credential);
        login(res.data.user, true);
        // New Google users have no body stats yet → finish onboarding first.
        navigate(isProfileComplete(res.data.user) ? "/dashboard" : "/register");
      } catch (err) {
        toast.error(err.response?.data?.error || "Google sign-in failed");
      }
    };

    loadGsiScript()
      .then(() => {
        if (cancelled || !window.google?.accounts?.id || !overlayRef.current) return;
        window.google.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback: handleCredential,
        });
        window.google.accounts.id.renderButton(overlayRef.current, {
          type: "standard",
          theme: "outline",
          size: "large",
          text: "continue_with",
          width: overlayRef.current.offsetWidth || 320,
        });
      })
      .catch(() => {
        // Script blocked/offline — silently skip; email login still works.
      });

    return () => {
      cancelled = true;
    };
  }, [login, navigate]);

  if (!GOOGLE_CLIENT_ID) return null;

  return (
    <div className="mt-4">
      <div className="flex items-center gap-3 mb-4">
        <div className="h-px flex-1" style={{ background: "var(--lg-border)" }} />
        <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
          or
        </span>
        <div className="h-px flex-1" style={{ background: "var(--lg-border)" }} />
      </div>

      {/* Visual liquid-glass button + invisible Google button overlay on top */}
      <div className="relative w-full h-12 rounded-2xl transition-all duration-200 hover:scale-[1.02] active:scale-[0.97] no-spring cursor-pointer">
        <button
          type="button"
          tabIndex={-1}
          aria-hidden="true"
          className="absolute inset-0 w-full h-full flex items-center justify-center gap-2.5 rounded-2xl text-sm font-semibold pointer-events-none transition-all duration-200"
          style={{
            background: "var(--lg-tint)",
            border: "1px solid var(--lg-border)",
            boxShadow: "inset 0 1px 0 var(--lg-hl-top), 0 2px 10px var(--lg-shadow)",
            backdropFilter: "blur(12px)",
            WebkitBackdropFilter: "blur(12px)",
            color: "var(--text-primary)",
          }}
        >
          <GoogleIcon />
          Continue with Google
        </button>

        {/* Real Google button: transparent, sits on top, captures the click */}
        <div
          ref={overlayRef}
          className="absolute inset-0 w-full h-full opacity-0 overflow-hidden"
          style={{ colorScheme: "light" }}
        />
      </div>
    </div>
  );
}
