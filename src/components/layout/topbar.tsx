import { useAuth } from '@/context/auth-context';
import { useTheme } from '@/context/theme-context';
import { ROLE_LABELS } from '@/lib/permissions';
import { Sun, Moon, LogOut } from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

export function Topbar() {
  const { profile, role, signOut } = useAuth();
  const { theme, setTheme } = useTheme();
  const navigate = useNavigate();

  async function handleSignOut() {
    await signOut();
    toast.success('Signed out');
    navigate('/login');
  }

  function toggleTheme() {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  }

  return (
    <header className="flex h-14 items-center justify-between border-b bg-card px-6">
      {/* Search stub — matching mockup's search bar */}
      <div className="flex items-center gap-4">
        <input
          type="text"
          placeholder="Search..."
          className="h-8 w-64 rounded-md border border-input bg-transparent px-3 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          // TODO: Wire global search in a future phase
        />
      </div>

      {/* Right side — user info + controls */}
      <div className="flex items-center gap-3">
        {/* Dark mode toggle */}
        <button
          onClick={toggleTheme}
          className="flex size-8 items-center justify-center rounded-md hover:bg-muted transition-colors"
          title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {theme === 'dark' ? (
            <Sun className="size-4 text-muted-foreground" />
          ) : (
            <Moon className="size-4 text-muted-foreground" />
          )}
        </button>

        {/* User info */}
        {profile && (
          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-medium leading-none">{profile.full_name}</p>
              <p className="text-xs text-muted-foreground">
                {role ? ROLE_LABELS[role] : ''}
              </p>
            </div>

            {/* Avatar */}
            <div className="flex size-8 items-center justify-center rounded-full bg-amber-600 text-xs font-bold text-white">
              {profile.full_name
                .split(' ')
                .map((n) => n[0])
                .join('')
                .toUpperCase()
                .slice(0, 2)}
            </div>
          </div>
        )}

        {/* Sign out */}
        <button
          onClick={handleSignOut}
          className="flex size-8 items-center justify-center rounded-md hover:bg-muted transition-colors"
          title="Sign out"
        >
          <LogOut className="size-4 text-muted-foreground" />
        </button>
      </div>
    </header>
  );
}
