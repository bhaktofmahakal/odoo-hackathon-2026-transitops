import { useState, type FormEvent } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/context/auth-context';
import { toast } from 'sonner';
import { Truck } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { signIn } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);

    const { error } = await signIn(email, password);

    if (error) {
      toast.error('Sign in failed', { description: error });
      setLoading(false);
      return;
    }

    toast.success('Welcome back!');
    navigate('/dashboard');
  }

  return (
    <div className="flex min-h-screen">
      {/* Left panel — branding */}
      <div 
        className="hidden lg:flex lg:w-[45%] flex-col justify-between p-10 bg-cover bg-center relative"
        style={{ backgroundImage: `url('/login-banner.png')` }}
      >
        <div className="absolute inset-0 bg-black/75 z-0" />
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-2">
            <div className="flex size-10 items-center justify-center rounded-lg overflow-hidden border border-amber-500/20 bg-zinc-950">
              <img src="/logo.png" alt="TransitOps Logo" className="size-full object-cover" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">TransitOps</h1>
              <p className="text-sm text-zinc-400">Smart Transport Operations Platform</p>
            </div>
          </div>
        </div>

        <div className="relative z-10 space-y-4">
          <p className="text-sm font-medium text-zinc-300">One login, four roles:</p>
          <ul className="space-y-2 text-sm text-zinc-400">
            <li className="flex items-center gap-2">
              <span className="size-1.5 rounded-full bg-amber-500" />
              Fleet Manager
            </li>
            <li className="flex items-center gap-2">
              <span className="size-1.5 rounded-full bg-amber-500" />
              Dispatcher
            </li>
            <li className="flex items-center gap-2">
              <span className="size-1.5 rounded-full bg-amber-500" />
              Safety Officer
            </li>
            <li className="flex items-center gap-2">
              <span className="size-1.5 rounded-full bg-amber-500" />
              Financial Analyst
            </li>
          </ul>
        </div>

        <p className="relative z-10 text-xs text-zinc-500">TRANSITOPS © 2026 · RBAC ENF.</p>
      </div>

      {/* Right panel — sign in form */}
      <div className="flex flex-1 flex-col items-center justify-center bg-background px-6">
        <div className="w-full max-w-sm space-y-6">
          {/* Mobile branding */}
          <div className="flex items-center gap-3 mb-4 lg:hidden">
            <div className="flex size-10 items-center justify-center rounded-lg overflow-hidden border border-amber-500/20 bg-zinc-950">
              <img src="/logo.png" alt="TransitOps Logo" className="size-full object-cover" />
            </div>
            <h1 className="text-xl font-bold">TransitOps</h1>
          </div>

          <div>
            <h2 className="text-2xl font-bold tracking-tight">Sign in to your account</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Enter your credentials to continue
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                Email
              </label>
              <input
                id="email"
                type="email"
                placeholder="raven@transitops.io"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                Password
              </label>
              <input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full h-11 rounded-md bg-amber-600 px-4 text-sm font-semibold text-white hover:bg-amber-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Signing in…' : 'Sign In'}
            </button>
          </form>

          <div className="space-y-3 border-t pt-4">
            <p className="text-xs text-muted-foreground font-medium">
              Access is scoped by role after login:
            </p>
            <ul className="text-xs text-muted-foreground space-y-1">
              <li>• Fleet Manager → Fleet, Maintenance</li>
              <li>• Dispatcher → Dashboard, Trips</li>
              <li>• Safety Officer → Drivers, Compliance</li>
              <li>• Financial Analyst → Fuel & Expenses, Analytics</li>
            </ul>
          </div>

          <p className="text-center text-sm text-muted-foreground">
            Don't have an account?{' '}
            <Link to="/signup" className="text-amber-500 hover:text-amber-400 font-medium">
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
