import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Sparkles, Upload, CheckCircle2, ChevronRight, ChevronLeft, AlertCircle, X, Phone } from 'lucide-react';
import { useAuth } from '@/App';
import { generateProfile, updateProfile, uploadPhoto, getProfile } from '@/api/profile';
import { Button }   from '@/components/ui/button';
import { Label }    from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select }   from '@/components/ui/select';
import { Badge }    from '@/components/ui/badge';
import { cn }       from '@/lib/utils';

// ── Constants ────────────────────────────────────────────────────────────────
const LEVEL_LABELS = {
  1: 'Débutant',
  2: 'Débutant +',
  3: 'Intermédiaire',
  4: 'Intermédiaire +',
  5: 'Confirmé',
  6: 'Avancé',
  7: 'Expert',
};

const YEARS_OPTIONS = [
  { value: '<1',  label: 'Moins d\'un an' },
  { value: '1-2', label: '1 à 2 ans' },
  { value: '3-5', label: '3 à 5 ans' },
  { value: '5+',  label: 'Plus de 5 ans' },
];

const STEP_LABELS = ['Informations', 'Profil IA', 'Photo & fin'];

// ── Step progress indicator ──────────────────────────────────────────────────
function StepIndicator({ current, total }) {
  return (
    <div className="flex items-center gap-2">
      {Array.from({ length: total }, (_, i) => {
        const n = i + 1;
        const done    = n < current;
        const active  = n === current;
        return (
          <div key={n} className="flex items-center gap-2">
            <div className={cn(
              'w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold transition-all',
              done   && 'bg-primary text-white',
              active && 'bg-primary text-white ring-4 ring-primary/20',
              !done && !active && 'bg-muted text-muted-foreground',
            )}>
              {done ? <CheckCircle2 className="w-4 h-4" /> : n}
            </div>
            {n < total && (
              <div className={cn(
                'h-px w-8 transition-colors',
                n < current ? 'bg-primary' : 'bg-border'
              )} />
            )}
          </div>
        );
      })}
      <span className="ml-2 text-sm text-muted-foreground">
        {STEP_LABELS[current - 1]}
      </span>
    </div>
  );
}

// ── Error banner ─────────────────────────────────────────────────────────────
function ErrorBanner({ message, onClose }) {
  return (
    <div className="flex items-start gap-2.5 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
      <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
      <p className="flex-1">{message}</p>
      {onClose && (
        <button onClick={onClose} className="shrink-0 hover:opacity-70">
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function ProfileSetup() {
  const { setProfile } = useAuth();
  const navigate = useNavigate();

  // ── shared error
  const [error, setError] = useState(null);

  // ── Step 1: basic info
  const [birthDate,    setBirthDate]    = useState('');
  const [yearsPlaying, setYearsPlaying] = useState('');
  const [selfLevel,    setSelfLevel]    = useState(null);
  const [phoneNumber,  setPhoneNumber]  = useState('');

  // ── Step 2: description + AI result
  const [description,      setDescription]      = useState('');
  const [generatedProfile, setGeneratedProfile] = useState(null);
  const [generating,       setGenerating]       = useState(false);

  // ── Step 3: photo
  const [photo,        setPhoto]        = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [saving,       setSaving]       = useState(false);

  const [step, setStep] = useState(1);

  // ── Step 1 → 2 ──────────────────────────────────────────────────────────
  function handleStep1Next() {
    if (!birthDate || !yearsPlaying || !selfLevel) {
      setError('Veuillez renseigner tous les champs.');
      return;
    }
    setError(null);
    const age       = Math.floor((Date.now() - new Date(birthDate)) / (365.25 * 24 * 3600 * 1000));
    const yearsText = YEARS_OPTIONS.find((o) => o.value === yearsPlaying)?.label?.toLowerCase() ?? yearsPlaying;
    const levelText = LEVEL_LABELS[selfLevel]?.toLowerCase() ?? String(selfLevel);
    setDescription(
      `J'ai ${age} ans. Je joue au padel depuis ${yearsText}. Mon niveau de forme physique et de jeu est ${levelText} (${selfLevel}/7). ` +
      `Décrivez ici votre style de jeu, vos points forts, ce que vous aimez et souhaitez améliorer.`
    );
    setStep(2);
  }

  // ── AI generation ────────────────────────────────────────────────────────
  async function handleGenerate() {
    if (description.trim().length < 10) {
      setError('Décrivez votre jeu en au moins 10 caractères.');
      return;
    }
    setError(null);
    setGenerating(true);
    try {
      const { profile } = await generateProfile(description.trim());
      setGeneratedProfile(profile);
    } catch (err) {
      setError(err.message || 'Erreur lors de la génération du profil.');
    } finally {
      setGenerating(false);
    }
  }

  // ── Photo selection ──────────────────────────────────────────────────────
  function handlePhotoChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setError('La photo ne doit pas dépasser 5 Mo.');
      return;
    }
    setError(null);
    setPhoto(file);
    setPhotoPreview(URL.createObjectURL(file));
  }

  // ── Final save ───────────────────────────────────────────────────────────
  async function handleComplete() {
    setSaving(true);
    setError(null);
    try {
      const saves = [];
      if (photo) saves.push(uploadPhoto(photo));
      if (phoneNumber.trim()) saves.push(updateProfile({ phone_number: phoneNumber.trim() }));
      await Promise.all(saves);
      // Re-fetch from server so photo_url (and any server-side updates) are reflected in context
      const { profile: saved } = await getProfile();
      setProfile(saved);
      navigate('/sessions', { replace: true });
    } catch (err) {
      setError(err.message || 'Erreur lors de la sauvegarde.');
    } finally {
      setSaving(false);
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b border-border bg-white/95 backdrop-blur-sm">
        <div className="mx-auto flex h-14 max-w-2xl items-center justify-between px-4 sm:px-6">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-primary flex items-center justify-center">
              <span className="text-white font-bold text-[10px]">P</span>
            </div>
            <span className="text-sm font-bold text-foreground tracking-tight">
              Padel<span className="text-primary">Connect</span>
            </span>
          </Link>
          <StepIndicator current={step} total={3} />
        </div>
      </header>

      {/* Body */}
      <div className="flex-1 flex items-start justify-center px-4 py-10 sm:px-6">
        <div className="w-full max-w-lg space-y-8">

          {error && (
            <ErrorBanner message={error} onClose={() => setError(null)} />
          )}

          {/* ── STEP 1 ──────────────────────────────────────────────── */}
          {step === 1 && (
            <div className="space-y-8">
              <div>
                <h1 className="text-2xl font-semibold text-foreground tracking-tight">
                  Parlez-nous de vous
                </h1>
                <p className="mt-1 text-sm text-muted-foreground">
                  Ces informations aident notre IA à créer un profil précis.
                </p>
              </div>

              <div className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="birthDate">Date de naissance</Label>
                  <input
                    id="birthDate"
                    type="date"
                    max={new Date().toISOString().split('T')[0]}
                    value={birthDate}
                    onChange={(e) => setBirthDate(e.target.value)}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="years">Depuis combien de temps jouez-vous au padel ?</Label>
                  <Select
                    id="years"
                    value={yearsPlaying}
                    onChange={(e) => setYearsPlaying(e.target.value)}
                  >
                    <option value="" disabled>Choisir…</option>
                    {YEARS_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>
                    Niveau de jeu / forme physique{' '}
                    {selfLevel && (
                      <span className="text-primary font-medium">
                        — {LEVEL_LABELS[selfLevel]}
                      </span>
                    )}
                  </Label>
                  <div className="flex gap-2 flex-wrap">
                    {[1, 2, 3, 4, 5, 6, 7].map((n) => (
                      <button
                        key={n}
                        type="button"
                        onClick={() => setSelfLevel(n)}
                        className={cn(
                          'w-10 h-10 rounded-lg text-sm font-semibold border transition-all',
                          selfLevel === n
                            ? 'bg-primary text-white border-primary shadow-sm'
                            : 'bg-card text-foreground/70 border-border hover:border-primary/40 hover:text-foreground'
                        )}
                      >
                        {n}
                      </button>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    1 = Débutant complet &nbsp;·&nbsp; 7 = Expert
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">
                    Numéro de téléphone{' '}
                    <span className="font-normal text-muted-foreground">(optionnel)</span>
                  </Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                    <input
                      id="phone"
                      type="tel"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      placeholder="+225 07 XX XX XX XX"
                      className="flex h-10 w-full rounded-md border border-input bg-background pl-9 pr-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    />
                  </div>
                </div>
              </div>

              <Button className="w-full" size="lg" onClick={handleStep1Next}>
                Continuer
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}

          {/* ── STEP 2 ──────────────────────────────────────────────── */}
          {step === 2 && (
            <div className="space-y-6">
              <div>
                <h1 className="text-2xl font-semibold text-foreground tracking-tight">
                  Décrivez votre jeu
                </h1>
                <p className="mt-1 text-sm text-muted-foreground">
                  L'IA va analyser votre texte pour générer votre profil joueur.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="desc">Description libre</Label>
                <Textarea
                  id="desc"
                  rows={6}
                  value={description}
                  onChange={(e) => {
                    setDescription(e.target.value);
                    if (generatedProfile) setGeneratedProfile(null);
                  }}
                  placeholder="Je joue au padel depuis…"
                />
                <p className="text-right text-xs text-muted-foreground">
                  {description.length} / 2000
                </p>
              </div>

              {/* AI result card */}
              {generatedProfile && (
                <div className="rounded-xl border border-primary/20 bg-primary/5 p-5 space-y-4">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-primary" />
                    <p className="text-sm font-semibold text-primary">Profil généré ✨</p>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="space-y-0.5">
                      <p className="text-xs text-muted-foreground uppercase tracking-wide">Niveau</p>
                      <p className="font-semibold text-foreground">
                        {generatedProfile.level}/7 — {LEVEL_LABELS[generatedProfile.level] ?? ''}
                      </p>
                    </div>
                    <div className="space-y-0.5">
                      <p className="text-xs text-muted-foreground uppercase tracking-wide">Style</p>
                      <p className="font-semibold text-foreground capitalize">
                        {generatedProfile.style ?? '—'}
                      </p>
                    </div>
                  </div>

                  {generatedProfile.description && (
                    <p className="text-sm text-foreground/80 italic">
                      "{generatedProfile.description}"
                    </p>
                  )}

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <p className="text-xs text-muted-foreground uppercase tracking-wide">Points forts</p>
                      <div className="flex flex-wrap gap-1">
                        {(generatedProfile.strengths ?? []).map((s) => (
                          <Badge key={s} variant="success">{s}</Badge>
                        ))}
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <p className="text-xs text-muted-foreground uppercase tracking-wide">À améliorer</p>
                      <div className="flex flex-wrap gap-1">
                        {(generatedProfile.weaknesses ?? []).map((w) => (
                          <Badge key={w} variant="secondary">{w}</Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => { setStep(1); setError(null); }}
                  className="gap-1"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Retour
                </Button>

                {!generatedProfile ? (
                  <Button
                    className="flex-1"
                    size="lg"
                    onClick={handleGenerate}
                    disabled={generating || description.trim().length < 10}
                  >
                    {generating ? (
                      <>
                        <span className="w-4 h-4 border-2 border-primary-foreground/50 border-t-transparent rounded-full animate-spin" />
                        Génération en cours…
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-4 w-4" />
                        Générer avec l'IA
                      </>
                    )}
                  </Button>
                ) : (
                  <Button
                    className="flex-1"
                    size="lg"
                    onClick={() => { setError(null); setStep(3); }}
                  >
                    Continuer
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          )}

          {/* ── STEP 3 ──────────────────────────────────────────────── */}
          {step === 3 && (
            <div className="space-y-6">
              <div>
                <h1 className="text-2xl font-semibold text-foreground tracking-tight">
                  Dernière étape
                </h1>
                <p className="mt-1 text-sm text-muted-foreground">
                  Ajoutez une photo — optionnel, vous pourrez la changer plus tard.
                </p>
              </div>

              {/* Photo upload */}
              <div className="space-y-3">
                <Label>Photo de profil</Label>
                <label
                  htmlFor="photo-upload"
                  className="group flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-border bg-muted/20 p-8 cursor-pointer transition-colors hover:border-primary/40 hover:bg-accent"
                >
                  {photoPreview ? (
                    <img
                      src={photoPreview}
                      alt="Aperçu"
                      className="w-24 h-24 rounded-full object-cover ring-4 ring-border"
                    />
                  ) : (
                    <>
                      <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center group-hover:bg-accent transition-colors">
                        <Upload className="w-5 h-5 text-muted-foreground" />
                      </div>
                      <div className="text-center">
                        <p className="text-sm font-medium text-foreground/80">
                          Cliquez pour choisir une photo
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          JPG, PNG ou WEBP — max 5 Mo
                        </p>
                      </div>
                    </>
                  )}
                  <input
                    id="photo-upload"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handlePhotoChange}
                  />
                </label>
                {photoPreview && (
                  <button
                    type="button"
                    onClick={() => { setPhoto(null); setPhotoPreview(null); }}
                    className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Supprimer la photo
                  </button>
                )}
              </div>

              {/* Generated profile summary */}
              {generatedProfile && (
                <div className="rounded-xl border border-border bg-card p-4 shadow-card space-y-3">
                  <p className="text-sm font-semibold text-foreground">Votre profil</p>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-muted-foreground">Niveau : </span>
                      <span className="font-medium">{generatedProfile.level}/7</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Style : </span>
                      <span className="font-medium capitalize">{generatedProfile.style}</span>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {(generatedProfile.strengths ?? []).map((s) => (
                      <Badge key={s} variant="success">{s}</Badge>
                    ))}
                    {(generatedProfile.weaknesses ?? []).map((w) => (
                      <Badge key={w} variant="secondary">{w}</Badge>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => { setStep(2); setError(null); }}
                  className="gap-1"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Retour
                </Button>

                <Button
                  className="flex-1"
                  size="lg"
                  onClick={handleComplete}
                  disabled={saving}
                >
                  {saving ? (
                    <>
                      <span className="w-4 h-4 border-2 border-primary-foreground/50 border-t-transparent rounded-full animate-spin" />
                      Enregistrement…
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="h-4 w-4" />
                      Terminer l'inscription
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
