import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/App';
import { login }       from '@/api/auth';
import { getProfile }  from '@/api/profile';
import { Button }   from '@/components/ui/button';
import { Input }    from '@/components/ui/input';
import { Label }    from '@/components/ui/label';
import { AlertCircle, Mail } from 'lucide-react';

// ── Role → redirect map ───────────────────────────────────────────────────────
const ROLE_REDIRECTS = {
  coach:       '/coach/dashboard',
  venue_admin: '/manager/dashboard',
  super_admin: '/admin/dashboard',
};

// ── Banners ───────────────────────────────────────────────────────────────────
function ErrorBanner({ message }) {
  return (
    <div className="flex items-start gap-2.5 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
      <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
      <p>{message}</p>
    </div>
  );
}

function UnverifiedBanner({ email }) {
  return (
    <div className="flex items-start gap-2.5 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
      <Mail className="h-4 w-4 shrink-0 mt-0.5" />
      <div>
        <p className="font-medium">Email non vérifié</p>
        <p className="mt-0.5 text-amber-700">
          Vérifiez votre boîte mail{email ? ` (${email})` : ''} et cliquez sur le lien de confirmation.
        </p>
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function Login() {
  const { setUser, setProfile } = useAuth();
  const navigate = useNavigate();

  const [form, setForm]             = useState({ email: '', password: '' });
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState(null);
  const [unverified, setUnverified] = useState(false);

  function handleChange(e) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    if (error) setError(null);
    if (unverified) setUnverified(false);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setUnverified(false);
    try {
      const data = await login(form);
      setUser(data.user);

      const role = data.user.role;

      // Non-player roles go straight to their dashboard
      if (ROLE_REDIRECTS[role]) {
        navigate(ROLE_REDIRECTS[role], { replace: true });
        return;
      }

      // Players: check profile first
      try {
        const { profile } = await getProfile();
        setProfile(profile);
        navigate(profile ? '/dashboard' : '/profile/setup', { replace: true });
      } catch {
        setProfile(null);
        navigate('/profile/setup', { replace: true });
      }
    } catch (err) {
      if (err.data?.code === 'EMAIL_NOT_VERIFIED') {
        setUnverified(true);
      } else {
        setError(err.message || 'Identifiants incorrects.');
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex bg-background">

      {/* ── Left branding panel (desktop only) ──────────────────────────── */}
      <div className="hidden lg:flex lg:w-[480px] xl:w-[520px] bg-primary shrink-0 flex-col justify-between p-12 relative overflow-hidden">
        <div className="absolute -top-20 -right-20 w-80 h-80 rounded-full bg-white/5" />
        <div className="absolute -bottom-16 -left-16 w-64 h-64 rounded-full bg-white/5" />
        <div className="absolute top-1/2 right-8 -translate-y-1/2 w-32 h-32 rounded-full bg-white/[0.03]" />

        <div className="relative z-10 flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-white/15 flex items-center justify-center">
            <span className="text-white font-bold text-sm">P</span>
          </div>
          <span className="text-white font-semibold text-lg tracking-tight">PadelConnect</span>
        </div>

        <div className="relative z-10 space-y-5">
          <h2 className="text-[2.6rem] font-semibold text-white leading-[1.15] tracking-tight">
            Jouez.<br />Connectez.<br />Progressez.
          </h2>
          <p className="text-white/55 text-base leading-relaxed max-w-[280px]">
            La plateforme de réservation padel à Abidjan — pour les joueurs qui veulent jouer plus.
          </p>
          <div className="flex items-center gap-3 pt-2">
            <div className="flex -space-x-2">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="w-8 h-8 rounded-full bg-white/20 border-2 border-primary ring-1 ring-white/10" />
              ))}
            </div>
            <span className="text-white/65 text-sm">+200 joueurs actifs</span>
          </div>
        </div>

        <p className="relative z-10 text-white/30 text-xs">© 2026 PadelConnect</p>
      </div>

      {/* ── Right form panel ─────────────────────────────────────────────── */}
      <div className="flex-1 flex items-center justify-center px-6 py-12 sm:px-12">
        <div className="w-full max-w-sm space-y-8">

          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <span className="text-white font-bold text-sm">P</span>
            </div>
            <span className="text-xl font-bold text-foreground tracking-tight">
              Padel<span className="text-primary">Connect</span>
            </span>
          </div>

          <div className="space-y-1">
            <h1 className="text-2xl font-semibold text-foreground tracking-tight">
              Bon retour 👋
            </h1>
            <p className="text-sm text-muted-foreground">
              Connectez-vous pour accéder à votre espace.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {unverified && <UnverifiedBanner email={form.email} />}
            {error && <ErrorBanner message={error} />}

            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="vous@exemple.com"
                autoComplete="email"
                value={form.email}
                onChange={handleChange}
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password">Mot de passe</Label>
              <Input
                id="password"
                name="password"
                type="password"
                placeholder="••••••••"
                autoComplete="current-password"
                value={form.password}
                onChange={handleChange}
                required
              />
            </div>

            <Button type="submit" className="w-full mt-2" size="lg" disabled={loading}>
              {loading ? (
                <>
                  <span className="w-4 h-4 border-2 border-primary-foreground/50 border-t-transparent rounded-full animate-spin" />
                  Connexion…
                </>
              ) : (
                'Se connecter'
              )}
            </Button>
          </form>

          <div className="space-y-4">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="bg-background px-3 text-muted-foreground">Pas encore de compte ?</span>
              </div>
            </div>
            <Link to="/signup" className="block">
              <Button variant="outline" className="w-full" size="lg">Créer un compte</Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
