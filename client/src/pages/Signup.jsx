import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { signup } from '@/api/auth';
import { Button }   from '@/components/ui/button';
import { Input }    from '@/components/ui/input';
import { Label }    from '@/components/ui/label';
import { AlertCircle, CheckCircle2, User, Dumbbell, Building2 } from 'lucide-react';
import { cn } from '@/lib/utils';

function ErrorBanner({ message }) {
  return (
    <div className="flex items-start gap-2.5 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
      <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
      <p>{message}</p>
    </div>
  );
}

// ── Password requirements ─────────────────────────────────────────────────────
const REQUIREMENTS = [
  { label: 'Au moins 8 caractères',          test: (p) => p.length >= 8 },
  { label: 'Une lettre majuscule',           test: (p) => /[A-Z]/.test(p) },
  { label: 'Un chiffre',                     test: (p) => /[0-9]/.test(p) },
  { label: 'Un caractère spécial (!@#$%^&*)', test: (p) => /[!@#$%^&*]/.test(p) },
];

// ── Role selection data ───────────────────────────────────────────────────────
const ROLES = [
  {
    value: 'player',
    label: 'Joueur',
    icon: User,
    description: 'Je cherche des partenaires et réserve des créneaux.',
  },
  {
    value: 'coach',
    label: 'Coach',
    icon: Dumbbell,
    description: "Je propose des séances d'entraînement.",
  },
  {
    value: 'venue_admin',
    label: 'Gérant de club',
    icon: Building2,
    description: 'Je gère un club et ses terrains.',
  },
];

// ── Left branding panel (shared) ──────────────────────────────────────────────
const PERKS = [
  'Réservez vos créneaux en quelques secondes',
  'Trouvez des partenaires à votre niveau',
  'Accédez à votre calendrier de sessions',
];

function BrandingPanel() {
  return (
    <div className="hidden lg:flex lg:w-[480px] xl:w-[520px] bg-primary shrink-0 flex-col justify-between p-12 relative overflow-hidden">
      <div className="absolute -top-20 -right-20 w-80 h-80 rounded-full bg-white/5" />
      <div className="absolute -bottom-16 -left-16 w-64 h-64 rounded-full bg-white/5" />

      <div className="relative z-10 flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-lg bg-white/15 flex items-center justify-center">
          <span className="text-white font-bold text-sm">P</span>
        </div>
        <span className="text-white font-semibold text-lg tracking-tight">PadelConnect</span>
      </div>

      <div className="relative z-10 space-y-8">
        <div className="space-y-3">
          <h2 className="text-[2.6rem] font-semibold text-white leading-[1.15] tracking-tight">
            Rejoignez la communauté padel d'Abidjan.
          </h2>
          <p className="text-white/55 text-base leading-relaxed">
            Gratuit, sans engagement. Prêt en 30 secondes.
          </p>
        </div>
        <ul className="space-y-3">
          {PERKS.map((perk) => (
            <li key={perk} className="flex items-center gap-3 text-white/75 text-sm">
              <CheckCircle2 className="h-4 w-4 shrink-0" style={{ color: '#74C69D' }} />
              {perk}
            </li>
          ))}
        </ul>
      </div>

      <p className="relative z-10 text-white/30 text-xs">© 2026 PadelConnect</p>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function Signup() {
  const navigate = useNavigate();

  const [step, setStep] = useState(0); // 0 = role, 1 = email+password
  const [selectedRole, setSelectedRole] = useState(null);

  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', password: '', confirmPassword: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  function handleChange(e) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    if (error) setError(null);
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
      await signup({ email: form.email, password: form.password, role: selectedRole, first_name: form.firstName.trim(), last_name: form.lastName.trim() });
      // No JWT cookie yet — user must verify email
      navigate('/verify-email', { state: { email: form.email } });
    } catch (err) {
      setError(err.message || 'Erreur lors de la création du compte.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex bg-background">
      <BrandingPanel />

      {/* Right form panel */}
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

          {/* ── STEP 0: Role selection ──────────────────────────────────── */}
          {step === 0 && (
            <div className="space-y-8">
              <div className="space-y-1">
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
                        : 'border-border bg-card hover:border-primary/30 hover:bg-accent'
                    )}
                  >
                    <div className={cn(
                      'flex h-10 w-10 shrink-0 items-center justify-center rounded-lg transition-colors',
                      selectedRole === value ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                    )}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={cn(
                        'font-semibold text-sm',
                        selectedRole === value ? 'text-primary' : 'text-foreground'
                      )}>
                        {label}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                        {description}
                      </p>
                    </div>
                    {selectedRole === value && (
                      <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                    )}
                  </button>
                ))}
              </div>

              <Button
                className="w-full"
                size="lg"
                disabled={!selectedRole}
                onClick={() => setStep(1)}
              >
                Continuer
              </Button>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-border" />
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="bg-background px-3 text-muted-foreground">Déjà un compte ?</span>
                </div>
              </div>

              <Link to="/login" className="block">
                <Button variant="outline" className="w-full" size="lg">Se connecter</Button>
              </Link>
            </div>
          )}

          {/* ── STEP 1: Email + password ────────────────────────────────── */}
          {step === 1 && (
            <div className="space-y-8">
              <div className="space-y-1">
                <div className="flex items-center gap-2 mb-3">
                  <button
                    type="button"
                    onClick={() => { setStep(0); setError(null); }}
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

              <form onSubmit={handleSubmit} className="space-y-5">
                {error && <ErrorBanner message={error} />}

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="firstName">Prénom</Label>
                    <Input
                      id="firstName"
                      name="firstName"
                      type="text"
                      placeholder="Kofi"
                      autoComplete="given-name"
                      value={form.firstName}
                      onChange={handleChange}
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="lastName">Nom</Label>
                    <Input
                      id="lastName"
                      name="lastName"
                      type="text"
                      placeholder="Mensah"
                      autoComplete="family-name"
                      value={form.lastName}
                      onChange={handleChange}
                      required
                    />
                  </div>
                </div>

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
                    placeholder="8 caractères minimum"
                    autoComplete="new-password"
                    value={form.password}
                    onChange={handleChange}
                    required
                  />
                  {form.password && (
                    <ul className="space-y-1 pt-1">
                      {REQUIREMENTS.map(({ label, test }) => {
                        const met = test(form.password);
                        return (
                          <li key={label} className={cn('flex items-center gap-2 text-xs transition-colors', met ? 'text-green-600' : 'text-muted-foreground')}>
                            <CheckCircle2 className={cn('h-3.5 w-3.5 shrink-0 transition-colors', met ? 'text-green-600' : 'text-muted-foreground/30')} />
                            {label}
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="confirmPassword">Confirmer le mot de passe</Label>
                  <Input
                    id="confirmPassword"
                    name="confirmPassword"
                    type="password"
                    placeholder="••••••••"
                    autoComplete="new-password"
                    value={form.confirmPassword}
                    onChange={handleChange}
                    required
                  />
                </div>

                <Button type="submit" className="w-full mt-2" size="lg" disabled={loading || !passwordMeetsAll || !form.firstName.trim() || !form.lastName.trim()}>
                  {loading ? (
                    <>
                      <span className="w-4 h-4 border-2 border-primary-foreground/50 border-t-transparent rounded-full animate-spin" />
                      Création…
                    </>
                  ) : (
                    'Créer mon compte'
                  )}
                </Button>

                <p className="text-center text-xs text-muted-foreground">
                  En créant un compte, vous acceptez nos{' '}
                  <span className="text-foreground/70 underline underline-offset-2 cursor-pointer">
                    conditions d'utilisation
                  </span>
                  .
                </p>
              </form>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-border" />
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="bg-background px-3 text-muted-foreground">Déjà un compte ?</span>
                </div>
              </div>

              <Link to="/login" className="block">
                <Button variant="outline" className="w-full" size="lg">Se connecter</Button>
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
