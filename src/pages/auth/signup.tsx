import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/context/auth-context";
import type { UserRole } from "@/lib/types";
import { toast } from "sonner";
import { RoleSelector } from "@/components/ui/role-selector";
import { MailCheck } from "lucide-react";

export default function SignupPage() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<UserRole | "">("driver");
  const [loading, setLoading] = useState(false);
  const [signedUp, setSignedUp] = useState(false);
  const { signUp } = useAuth();

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);

    const { error } = await signUp(email, password, fullName, (role || "driver") as UserRole);

    if (error) {
      toast.error("Sign up failed", { description: error });
      setLoading(false);
      return;
    }

    setSignedUp(true);
    setLoading(false);
  }

  return (
    <div className="flex min-h-screen">
      {/* Left panel — branding (reused from login) */}
      <div
        className="hidden lg:flex lg:w-[45%] flex-col justify-between p-10 bg-cover bg-center relative"
        style={{ backgroundImage: `url('/login-banner.png')` }}
      >
        <div className="absolute inset-0 bg-black/75 z-0" />
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-2">
            <div className="flex size-10 items-center justify-center rounded-lg overflow-hidden border border-amber-500/20 bg-zinc-950">
              <img
                src="/logo.png"
                alt="TransitOps Logo"
                className="size-full object-cover"
              />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">TransitOps</h1>
              <p className="text-sm text-zinc-400">
                Smart Transport Operations Platform
              </p>
            </div>
          </div>
        </div>

        <div className="relative z-10 space-y-3">
          <h2 className="text-lg font-semibold text-white">
            Join your fleet team
          </h2>
          <p className="text-sm text-zinc-400">
            Create an account to get started. Your role will be assigned by your
            fleet administrator.
          </p>
        </div>

        <p className="relative z-10 text-xs text-zinc-500">
          TRANSITOPS © 2026 · RBAC ENF.
        </p>
      </div>

      {/* Right panel — sign up form */}
      <div className="flex flex-1 flex-col items-center justify-center bg-background px-6">
        <div className="w-full max-w-sm space-y-6">
          {/* Mobile branding */}
          <div className="flex items-center gap-3 mb-4 lg:hidden">
            <div className="flex size-10 items-center justify-center rounded-lg overflow-hidden border border-amber-500/20 bg-zinc-950">
              <img
                src="/logo.png"
                alt="TransitOps Logo"
                className="size-full object-cover"
              />
            </div>
            <h1 className="text-xl font-bold">TransitOps</h1>
          </div>

          <div>
            <h2 className="text-2xl font-bold tracking-tight">
              Create your account
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Fill in your details to get started
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {signedUp ? (
              <div className="flex flex-col items-center text-center space-y-4 py-6">
                <div className="flex size-14 items-center justify-center rounded-full bg-amber-500/10">
                  <MailCheck className="size-7 text-amber-500" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-lg font-semibold">Check your email</h3>
                  <p className="text-sm text-muted-foreground">
                    We sent a verification link to <span className="font-medium text-foreground">{email}</span>.
                    Please verify your email before signing in.
                  </p>
                </div>
                <Link
                  to="/login"
                  className="w-full h-11 flex items-center justify-center rounded-md bg-amber-600 px-4 text-sm font-semibold text-white hover:bg-amber-700 transition-colors"
                >
                  Go to Sign In
                </Link>
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  <label
                    htmlFor="full-name"
                    className="text-sm font-medium text-muted-foreground uppercase tracking-wider"
                  >
                    Full Name
                  </label>
                  <input
                    id="full-name"
                    type="text"
                    placeholder="Alex Rivera"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                    className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  />
                </div>

                <div className="space-y-2">
                  <label
                    htmlFor="email"
                    className="text-sm font-medium text-muted-foreground uppercase tracking-wider"
                  >
                    Email
                  </label>
                  <input
                    id="email"
                    type="email"
                    placeholder="alex@transitops.io"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  />
                </div>

                <div className="space-y-2">
                  <label
                    htmlFor="password"
                    className="text-sm font-medium text-muted-foreground uppercase tracking-wider"
                  >
                    Password
                  </label>
                  <input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                    className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  />
                </div>

                <RoleSelector
                  value={role}
                  onChange={setRole}
                  required
                />

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full h-11 rounded-md bg-amber-600 px-4 text-sm font-semibold text-white hover:bg-amber-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? "Creating account…" : "Create Account"}
                </button>
              </>
            )}
          </form>

          <p className="text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link
              to="/login"
              className="text-amber-500 hover:text-amber-400 font-medium"
            >
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
