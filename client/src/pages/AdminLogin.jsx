import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/App';
import { login } from '@/api/auth';
import { Button } from '@/components/ui/button';
import { Input }  from '@/components/ui/input';
import { Label }  from '@/components/ui/label';
import { AlertCircle, ShieldCheck, Lock } from 'lucide-react';

function ErrorBanner({ message }) {
  return (
    <div className="flex items-start gap-2.5 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
      <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
      <p>{message}</p>
    </div>
  );
}

export default function AdminLogin() {
  const { setUser } = useAuth();
  const navigate = useNavigate();

  const [form, setForm]       = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState(null);

  function handleChange(e) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    if (error) setError(null);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const data = await login(form);
      if (data.user.role !== 'super_admin') {
        setError('Accès non autorisé.');
        return;
      }
      setUser(data.user);
      navigate('/admin/dashboard', { replace: true });
    } catch (err) {
      setError(err.message || 'Identifiants incorrects.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex bg-background">

      {/* ── Left branding panel ──────────────────────────────────────────── */}
      <div className="hidden lg:flex lg:w-[480px] xl:w-[520px] bg-primary shrink-0 flex-col justify-between p-12 relative overflow-hidden">
        <div className="absolute -top-20 -right-20 w-80 h-80 rounded-full bg-white/5" />
        <div className="absolute -bottom-16 -left-16 w-64 h-64 rounded-full bg-white/5" />

        <div className="relative z-10 flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-white/15 flex items-center justify-center">
            <span className="text-white font-bold text-sm">P</span>
          </div>
          <span className="text-white font-semibold text-lg tracking-tight">PadelConnect</span>
        </div>

        <div className="relative z-10 space-y-5">
          <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-white/10 mb-4">
            <ShieldCheck className="h-8 w-8 text-white" />
          </div>
          <h2 className="text-[2.6rem] font-semibold text-white leading-[1.15] tracking-tight">
            Espace<br />administrateur.
          </h2>
          <p className="text-white/55 text-base leading-relaxed max-w-[280px]">
            Accès réservé aux super-administrateurs de la plateforme PadelConnect.
          </p>
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
            <div className="flex items-center gap-2 mb-2">
              <Lock className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-widest">
                Accès restreint
              </span>
            </div>
            <h1 className="text-2xl font-semibold text-foreground tracking-tight">
              Administration PadelConnect
            </h1>
            <p className="text-sm text-muted-foreground">
              Connectez-vous avec vos identifiants super-administrateur.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {error && <ErrorBanner message={error} />}

            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="admin@padelconnect.ci"
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
                  Vérification…
                </>
              ) : (
                'Accéder au panneau admin'
              )}
            </Button>
          </form>

          <p className="text-center text-xs text-muted-foreground">
            Portail réservé aux administrateurs.{' '}
            <Link to="/login" className="text-foreground/70 underline underline-offset-2">
              Connexion joueur
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
