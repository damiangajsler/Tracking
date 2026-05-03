import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../lib/api";
import { useAuth } from "../context/AuthContext";

// REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
export default function AuthCallback() {
  const navigate = useNavigate();
  const { setUser } = useAuth();
  const hasProcessed = useRef(false);

  useEffect(() => {
    if (hasProcessed.current) return;
    hasProcessed.current = true;
    const run = async () => {
      const hash = window.location.hash || "";
      const match = hash.match(/session_id=([^&]+)/);
      if (!match) { navigate("/login"); return; }
      const session_id = match[1];
      try {
        const { data } = await api.post("/auth/session", { session_id });
        setUser(data.user);
        // clear hash
        window.history.replaceState(null, "", window.location.pathname);
        navigate("/dashboard", { state: { user: data.user }, replace: true });
      } catch (_e) {
        navigate("/login", { replace: true });
      }
    };
    run();
  }, [navigate, setUser]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-50" data-testid="auth-callback">
      <div className="text-center">
        <div className="w-8 h-8 border-2 border-zinc-300 border-t-blue-600 rounded-full animate-spin mx-auto mb-4" />
        <p className="text-zinc-600">Signing you in…</p>
      </div>
    </div>
  );
}
