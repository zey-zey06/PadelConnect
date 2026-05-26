import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { signup } from '@/api/auth';
import { useAuth, homeFor } from '@/App';
import { Button }   from '@/components/ui/button';
import { Input }    from '@/components/ui/input';
import { Label }    from '@/components/ui/label';
import { AlertCircle, CheckCircle2, User, Dumbbell, Building2, Eye, EyeOff } from 'lucide-react';
import { cn } from '@/lib/utils';

function ErrorBanner({ message }) {
  return (
    <div className="flex items-start gap-2.5 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
      <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
      <p>{message}</p>
    </div>
  );
}

const REQUIREMENTS = [
  { label: 'Au moins 8 caractères',           test: (p) => p.length >= 8 },
  { label: 'Une lettre majuscule',            test: (p) => /[A-Z]/.test(p) },
  { label: 'Un chiffre',                      test: (p) => /[0-9]/.test(p) },
  { label: 'Un caractère spécial (!@#$%^&*)', test: (p) => /[!@#$%^&*]/.test(p) },
];

const ROLES = [
  { value: 'player',      label: 'Joueur',         icon: User,      description: 'Je cherche des partenaires et réserve des créneaux.' },
  { value: 'coach',       label: 'Coach',          icon: Dumbbell,  description: "Je propose des séances d'entraînement." },
  { value: 'venue_admin', label: 'Gérant de club', icon: Building2, description: 'Je gère un club et ses terrains.' },
];

const VALID_ROLES = ROLES.map((r) => r.value);

export default function Signup() {
  const navigate = useNavigate();
  const { setUser } = useAuth();
  const [searchParams] = useSearchParams();

  // If a valid role is in the URL, pre-select it and skip the role-selection step
  const urlRole     = searchParams.get('role');
  const initialRole = VALID_ROLES.includes(urlRole) ? urlRole : null;

  const [step,         setStep]         = useState(initialRole ? 1 : 0);
  const [selectedRole, setSelectedRole] = useState(initialRole);
  const [isBallPicker, setIsBallPicker] = useState(false);

  const [form,        setForm]        = useState({ firstName: '', lastName: '', email: '', password: '', confirmPassword: '' });
  const [loading,     setLoading]     = useState(false);
  const [error,       setError]       = useState(null);
  const [showPwd,     setShowPwd]     = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  function handleChange(e) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    if (error) setError(null);
  }

  function handleBack() {
    if (initialRole) {
      navigate('/', { replace: true });
    } else {
      setStep(0);
      setError(null);
    }
  }

  const passwordMeetsAll = REQUIREMENTS.every(({ test }) => test(form.password));

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.firstName.trim() || !form.lastName.trim()) {
      setError('Le prénom et le nom sont obligatoires.');
      return;
    }
    if (!passwordMeetsAll) {
      setError('Le mot de passe ne respecte pas les critères requis.');
      return;
    }
    if (form.password !== form.confirmPassword) {
      setError('Les mots de passe ne correspondent pas.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await signup({
        email:          form.email,
        password:       form.password,
        role:           selectedRole,
        first_name:     form.firstName.trim(),
        last_name:      form.lastName.trim(),
        is_ball_picker: selectedRole === 'coach' ? isBallPicker : false,
      });
      setUser(data.user);
      navigate(
        data.user.role === 'player' ? '/profile/setup' : homeFor(data.user),
        { replace: true },
      );
    } catch (err) {
      setError(err.message || 'Erreur lors de la création du compte.');
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

        {/* ── STEP 0: Role selection ────────────────────────────────────────── */}
        {step === 0 && (
          <div className="space-y-8">
            <div className="space-y-1 text-center">
              <h1 className="text-2xl font-semibold text-foreground tracking-tight">
                Vous êtes…
              </h1>
              <p className="text-sm text-muted-foreground">
                Choisissez votre profil pour démarrer.
              </p>
            </div>

            <div className="space-y-3">
              {ROLES.map(({ value, label, icon: Icon, description }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setSelectedRole(value)}
                  className={cn(
                    'w-full flex items-center gap-4 rounded-xl border p-4 text-left transition-all',
                    selectedRole === value
                      ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
                      : 'border-border bg-card hover:border-primary/30 hover:bg-accent',
                  )}
                >
                  <div className={cn(
                    'flex h-10 w-10 shrink-0 items-center justify-center rounded-lg transition-colors',
                    selectedRole === value ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground',
                  )}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={cn('font-semibold text-sm', selectedRole === value ? 'text-primary' : 'text-foreground')}>
                      {label}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{description}</p>
                  </div>
                  {selectedRole === value && (
                    <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                  )}
                </button>
              ))}
            </div>

            <Button className="w-full" size="lg" disabled={!selectedRole} onClick={() => setStep(1)}>
              Continuer
            </Button>

            <p className="text-center text-sm text-muted-foreground">
              Déjà un compte ?{' '}
              <Link to="/login" className="text-primary font-medium hover:underline">
                Se connecter
              </Link>
            </p>
          </div>
        )}

        {/* ── STEP 1: Email + password ──────────────────────────────────────── */}
        {step === 1 && (
          <div className="space-y-8">
            <div className="space-y-1">
              <div className="flex items-center gap-2 mb-3">
                <button
                  type="button"
                  onClick={handleBack}
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  ← Retour
                </button>
                <span className="text-xs text-muted-foreground">·</span>
                <span className="text-xs font-medium text-primary">
                  {ROLES.find((r) => r.value === selectedRole)?.label}
                </span>
              </div>
              <h1 className="text-2xl font-semibold text-foreground tracking-tight">
                Créer un compte
              </h1>
              <p className="text-sm text-muted-foreground">
                Rejoignez PadelConnect et jouez dès aujourd'hui.
              </p>
            </div>

            {/* Ball-picker option — coach only */}
            {selectedRole === 'coach' && (
              <label className="flex items-start gap-3 cursor-pointer rounded-xl border border-border bg-card p-4 hover:border-primary/30 hover:bg-accent transition-all">
                <input
                  type="checkbox"
                  checked={isBallPicker}
                  onChange={(e) => setIsBallPicker(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-input accent-primary cursor-pointer"
                />
                <div>
                  <p className="text-sm font-medium text-foreground leading-tight">
                    Je peux aussi servir de ramasseur
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Vous serez disponible pour aider lors des sessions en tant que ramasseur de balles.
                  </p>
                </div>
              </label>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              {error && <ErrorBanner message={error} />}

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="firstName">Prénom</Label>
                  <Input id="firstName" name="firstName" type="text" placeholder="Kofi"
                    autoComplete="given-name" value={form.firstName} onChange={handleChange} required />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="lastName">Nom</Label>
                  <Input id="lastName" name="lastName" type="text" placeholder="Mensah"
                    autoComplete="family-name" value={form.lastName} onChange={handleChange} required />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="email">Email</Label>
                <Input id="email" name="email" type="email" placeholder="vous@exemple.com"
                  autoComplete="email" value={form.email} onChange={handleChange} required />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="password">Mot de passe</Label>
                <div className="relative">
                  <Input id="password" name="password" type={showPwd ? 'text' : 'password'}
                    placeholder="8 caractères minimum" autoComplete="new-password"
                    value={form.password} onChange={handleChange} required className="pr-10" />
                  <button type="button" tabIndex={-1} onClick={() => setShowPwd((v) => !v)}
                    aria-label={showPwd ? 'Masquer' : 'Voir'}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                    {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {form.password && (
                  <ul className="space-y-1 pt-1">
                    {REQUIREMENTS.map(({ label, test }) => {
                      const met = test(form.password);
                      return (
                        <li key={label} className={cn('flex items-center gap-2 text-xs transition-colors', met ? 'text-green-600' : 'text-muted-foreground')}>
                          <CheckCircle2 className={cn('h-3.5 w-3.5 shrink-0', met ? 'text-green-600' : 'text-muted-foreground/30')} />
                          {label}
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="confirmPassword">Confirmer le mot de passe</Label>
                <div className="relative">
                  <Input id="confirmPassword" name="confirmPassword" type={showConfirm ? 'text' : 'password'}
                    placeholder="••••••••" autoComplete="new-password"
                    value={form.confirmPassword} onChange={handleChange} required className="pr-10" />
                  <button type="button" tabIndex={-1} onClick={() => setShowConfirm((v) => !v)}
                    aria-label={showConfirm ? 'Masquer' : 'Voir'}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                    {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <Button type="submit" className="w-full mt-2" size="lg"
                disabled={loading || !passwordMeetsAll || !form.firstName.trim() || !form.lastName.trim()}>
                {loading ? (
                  <>
                    <span className="w-4 h-4 border-2 border-primary-foreground/50 border-t-transparent rounded-full animate-spin" />
                    Création…
                  </>
                ) : 'Créer mon compte'}
              </Button>

              <p className="text-center text-xs text-muted-foreground">
                En créant un compte, vous acceptez nos{' '}
                <span className="text-foreground/70 underline underline-offset-2 cursor-pointer">
                  conditions d'utilisation
                </span>.
              </p>
            </form>

            <p className="text-center text-sm text-muted-foreground">
              Déjà un compte ?{' '}
              <Link to="/login" className="text-primary font-medium hover:underline">
                Se connecter
              </Link>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
