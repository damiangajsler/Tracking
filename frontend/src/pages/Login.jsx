import { Link } from "react-router-dom";
import { Button } from "../components/ui/button";

export default function Login() {
  // REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
  const handleLogin = () => {
    const redirectUrl = window.location.origin + "/dashboard";
    window.location.href = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}`;
  };

  return (
    <div className="min-h-screen flex" data-testid="login-page">
      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm">
          <Link to="/" className="flex items-center gap-2 mb-10" data-testid="login-logo">
            <div className="w-8 h-8 rounded-md bg-zinc-950 text-white grid place-items-center font-heading font-bold">L</div>
            <span className="font-heading font-semibold text-lg">Linkly</span>
          </Link>
          <h1 className="font-heading font-semibold text-3xl tracking-tight">Welcome back</h1>
          <p className="text-zinc-600 mt-2">Sign in to view your campaigns and conversions.</p>

          <Button
            onClick={handleLogin}
            className="w-full mt-8 h-11 bg-white border border-zinc-300 text-zinc-900 hover:bg-zinc-50 rounded-md"
            data-testid="google-login-button"
          >
            <svg className="h-5 w-5 mr-2" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18A10.99 10.99 0 0 0 1 12c0 1.77.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Continue with Google
          </Button>

          <p className="text-xs text-zinc-500 mt-6 text-center">
            By continuing, you agree to our Terms and Privacy Policy.
          </p>
        </div>
      </div>

      <div className="hidden lg:flex flex-1 bg-zinc-950 text-white p-12 relative overflow-hidden">
        <div className="absolute inset-0 opacity-20" style={{ backgroundImage: "radial-gradient(circle at 20% 20%, rgba(59,130,246,0.4), transparent 40%)" }} />
        <div className="relative m-auto max-w-md">
          <div className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-400">Linkly</div>
          <h2 className="font-heading font-semibold text-4xl tracking-tight mt-3 leading-tight">
            One dashboard for every click, campaign, and conversion.
          </h2>
          <p className="text-zinc-400 mt-4">Sign in to see your traffic in crisp, no-nonsense charts.</p>
          <div className="mt-10 rounded-lg border border-zinc-800 bg-zinc-900 p-5">
            <div className="text-xs text-zinc-500 uppercase tracking-wider">Today's conversions</div>
            <div className="font-heading text-5xl font-semibold mt-2">47</div>
            <div className="mt-4 flex items-end gap-1 h-16">
              {[30, 45, 20, 60, 40, 70, 55, 80, 35, 65, 75, 50].map((h, i) => (
                <div key={i} className="flex-1 rounded-sm bg-blue-500" style={{ height: `${h}%` }} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
