import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth, homeFor } from '@/App';
import { login }       from '@/api/auth';
import { getProfile }  from '@/api/profile';
import { Button }   from '@/components/ui/button';
import { Input }    from '@/components/ui/input';
import { Label }    from '@/components/ui/label';
import { AlertCircle, Mail, Eye, EyeOff } from 'lucide-react';

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

export default function Login() {
  const { setUser, setProfile } = useAuth();
  const navigate = useNavigate();

  const [form, setForm]             = useState({ email: '', password: '' });
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState(null);
  const [unverified, setUnverified] = useState(false);
  const [showPwd, setShowPwd]       = useState(false);

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
      const role = data.user.role;

      if (role === 'super_admin') {
        setError('Utilisez le portail administrateur (/admin/login).');
        return;
      }

      setUser(data.user);

      if (role === 'player') {
        try {
          const { profile } = await getProfile();
          setProfile(profile);
          navigate(profile ? '/sessions' : '/profile/setup', { replace: true });
        } catch {
          setProfile(null);
          navigate('/profile/setup', { replace: true });
        }
        return;
      }

      navigate(homeFor(data.user), { replace: true });
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
    <div className="min-h-screen bg-background flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-sm space-y-8">

        {/* Logo */}
        <div className="flex flex-col items-center gap-2">
          <div className="w-12 h-12 rounded-2xl bg-primary flex items-center justify-center shadow-sm">
            <span className="text-white font-bold text-xl">P</span>
          </div>
          <span className="text-xl font-bold tracking-tight">
            <span className="text-foreground">Padel</span>
            <span className="text-primary">Connect</span>
          </span>
        </div>

        <div className="space-y-1 text-center">
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
            <div className="relative">
              <Input
                id="password"
                name="password"
                type={showPwd ? 'text' : 'password'}
                placeholder="••••••••"
                autoComplete="current-password"
                value={form.password}
                onChange={handleChange}
                required
                className="pr-10"
              />
              <button
                type="button"
                tabIndex={-1}
                onClick={() => setShowPwd((v) => !v)}
                aria-label={showPwd ? 'Masquer le mot de passe' : 'Voir le mot de passe'}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <Button type="submit" className="w-full" size="lg" disabled={loading}>
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

        <p className="text-center text-sm text-muted-foreground">
          Pas encore de compte ?{' '}
          <Link to="/" className="text-primary font-medium hover:underline">
            Choisir mon rôle
          </Link>
        </p>

      </div>
    </div>
  );
}
