import { useState, useRef, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Sparkles, Upload, CheckCircle2, ChevronRight, ChevronLeft,
  AlertCircle, X, Phone, Send,
} from 'lucide-react';
import { useAuth } from '@/App';
import { generateProfileFromQA, updateProfile, uploadPhoto, getProfile } from '@/api/profile';
import { updateMe } from '@/api/auth';
import { Button }   from '@/components/ui/button';
import { Label }    from '@/components/ui/label';
import { Select }   from '@/components/ui/select';
import { Badge }    from '@/components/ui/badge';
import { cn }       from '@/lib/utils';
import DateScrollPicker from '@/components/DateScrollPicker';

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
  { value: '<1',  label: "Moins d'un an" },
  { value: '1-2', label: '1 à 2 ans'     },
  { value: '3-5', label: '3 à 5 ans'     },
  { value: '5+',  label: 'Plus de 5 ans' },
];

const STEP_LABELS = ['Informations', 'Entretien IA', 'Votre profil', 'Photo & fin'];

// PIA interview — QCM version (each question has preset chips + "Autre" option)
const QUESTIONS_QCM = [
  {
    text:    'Depuis combien de temps jouez-vous au padel ?',
    options: ['Moins de 6 mois', '6 mois – 1 an', '1 – 3 ans', 'Plus de 3 ans'],
  },
  {
    text:    'Comment décririez-vous votre niveau actuel ?',
    options: ['Débutant', 'Intermédiaire', 'Avancé', 'Expert'],
  },
  {
    text:    'Quel est votre style de jeu favori ?',
    options: ['Défensif', 'Attaquant', 'Polyvalent', 'Je ne sais pas encore'],
  },
  {
    text:    'Quels sont vos points forts ?',
    options: ['Service', 'Volée', 'Smash', 'Régularité'],
  },
  {
    text:    'Quels aspects souhaitez-vous améliorer ?',
    options: ['Puissance', 'Constance', 'Positionnement', 'Tactique'],
  },
  {
    text:    'Quand préférez-vous jouer ?',
    options: ["Le matin", "L'après-midi", 'Le soir', "N'importe quand"],
  },
  {
    text:    "Qu'est-ce qui vous a amené à rejoindre PadelConnect ?",
    options: ['Trouver des partenaires', 'Découvrir des clubs', 'Progresser', 'Recommandé par un ami'],
  },
];

// PIA's encouragement after each answer
const ENCOURAGEMENTS = [
  'Super, merci ! 🎾',
  'Parfait !',
  'Excellent ! 🙌',
  "C'est noté !",
  'Très bien !',
  'Noté ! 👍',
  'Merci ! Bienvenue sur PadelConnect 🎾',
];

// ── Sub-components ────────────────────────────────────────────────────────────
function StepIndicator({ current, total }) {
  return (
    <div className="flex items-center gap-2">
      {Array.from({ length: total }, (_, i) => {
        const n      = i + 1;
        const done   = n < current;
        const active = n === current;
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
              <div className={cn('h-px w-8 transition-colors', n < current ? 'bg-primary' : 'bg-border')} />
            )}
          </div>
        );
      })}
      <span className="ml-2 text-sm text-muted-foreground">{STEP_LABELS[current - 1]}</span>
    </div>
  );
}

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

/** Chat bubble used inside the PIA interview. */
function ChatBubble({ role, text }) {
  return (
    <div className={`flex ${role === 'user' ? 'justify-end' : 'justify-start'}`}>
      {role === 'model' && (
        <div className="w-6 h-6 rounded-full bg-gradient-to-br from-violet-600 to-primary flex items-center justify-center mr-2 mt-0.5 shrink-0">
          <Sparkles className="h-3 w-3 text-white" />
        </div>
      )}
      <div
        className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-wrap
          ${role === 'user'
            ? 'bg-primary text-white rounded-br-sm'
            : 'bg-muted text-foreground rounded-bl-sm'
          }`}
      >
        {text}
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function ProfileSetup() {
  const { user, setProfile } = useAuth();
  const navigate = useNavigate();

  const [error, setError] = useState(null);

  // ── Step 1: basic info ────────────────────────────────────────────────────
  const [firstName,   setFirstName]   = useState(user?.first_name ?? '');
  const [lastName,    setLastName]    = useState(user?.last_name  ?? '');
  const [birthDate,   setBirthDate]   = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');

  // ── Step 2: PIA interview (QCM) ───────────────────────────────────────────
  const [chatMsgs,    setChatMsgs]    = useState([]);
  const [chatBusy,    setChatBusy]    = useState(false);
  const [qIndex,      setQIndex]      = useState(0);
  const [qaAnswers,   setQaAnswers]   = useState([]);
  const [motivation,  setMotivation]  = useState('');
  const [generating,  setGenerating]  = useState(false);
  const [autreMode,   setAutreMode]   = useState(false); // "Autre" text input visible
  const [autreText,   setAutreText]   = useState('');

  // ── Step 3: profile review ────────────────────────────────────────────────
  const [generatedProfile, setGeneratedProfile] = useState(null);
  const [adjustedLevel,    setAdjustedLevel]    = useState(null);

  // ── Step 4: photo upload ──────────────────────────────────────────────────
  const [photo,        setPhoto]        = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [saving,       setSaving]       = useState(false);

  const [step, setStep] = useState(1);

  const chatBottomRef = useRef(null);
  const chatInputRef  = useRef(null);

  // Auto-scroll chat to bottom
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMsgs, chatBusy]);

  // Initialise PIA interview when entering step 2
  useEffect(() => {
    if (step === 2) {
      const greeting = firstName
        ? `Bonjour ${firstName} ! Je suis PIA. Répondez aux questions pour créer votre profil de joueur. 🎾\n\n${QUESTIONS_QCM[0].text}`
        : `Bonjour ! Je suis PIA. Répondez aux questions pour créer votre profil de joueur. 🎾\n\n${QUESTIONS_QCM[0].text}`;
      setChatMsgs([{ role: 'model', text: greeting }]);
      setQIndex(0);
      setQaAnswers([]);
      setAutreMode(false);
      setAutreText('');
    }
  }, [step]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Step 1 → 2 ────────────────────────────────────────────────────────────
  function handleStep1Next() {
    if (!firstName.trim() || !lastName.trim() || !birthDate) {
      setError('Veuillez renseigner votre prénom, nom et date de naissance.');
      return;
    }
    setError(null);
    setStep(2);
  }

  // ── Interview: QCM answer selection ──────────────────────────────────────
  function handlePickAnswer(answer) {
    if (chatBusy || generating) return;
    setAutreMode(false);
    setAutreText('');
    submitAnswer(answer);
  }

  function handleAutreSubmit() {
    const answer = autreText.trim();
    if (!answer || chatBusy || generating) return;
    setAutreMode(false);
    setAutreText('');
    submitAnswer(answer);
  }

  function submitAnswer(answer) {
    setChatBusy(true);
    const newAnswers = [...qaAnswers, { question: QUESTIONS_QCM[qIndex].text, answer }];
    setQaAnswers(newAnswers);
    setChatMsgs((prev) => [...prev, { role: 'user', text: answer }]);

    if (qIndex === 6) {
      setMotivation(answer);
      setTimeout(() => {
        setChatMsgs((prev) => [...prev, { role: 'model', text: ENCOURAGEMENTS[6] }]);
        setTimeout(() => {
          setChatMsgs((prev) => [...prev, { role: 'model', text: 'Je génère votre profil maintenant… ✨' }]);
          runGeneration(newAnswers, answer);
        }, 700);
      }, 600);
    } else {
      const nextIndex = qIndex + 1;
      setTimeout(() => {
        setChatMsgs((prev) => [
          ...prev,
          { role: 'model', text: `${ENCOURAGEMENTS[qIndex]}\n\n${QUESTIONS_QCM[nextIndex].text}` },
        ]);
        setQIndex(nextIndex);
        setChatBusy(false);
      }, 600);
    }
  }

  async function runGeneration(answers, motivationAnswer) {
    setGenerating(true);
    try {
      const { profile } = await generateProfileFromQA(answers, motivationAnswer);
      setGeneratedProfile(profile);
      setAdjustedLevel(profile.level);
      setStep(3);
    } catch (err) {
      setError(err.message || 'Erreur lors de la génération du profil.');
      setChatBusy(false);
    } finally {
      setGenerating(false);
    }
  }

  function handleChatKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleChatSubmit(); }
  }

  // ── Step 3 → 4 ────────────────────────────────────────────────────────────
  async function handleStep3Next() {
    // If the player adjusted the level, persist the change
    if (adjustedLevel && generatedProfile && adjustedLevel !== generatedProfile.level) {
      try {
        await updateProfile({ level: adjustedLevel });
      } catch { /* non-fatal */ }
    }
    setStep(4);
  }

  // ── Photo ──────────────────────────────────────────────────────────────────
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

  // ── Final save ─────────────────────────────────────────────────────────────
  async function handleComplete() {
    setSaving(true);
    setError(null);
    try {
      const saves = [];
      if (photo)              saves.push(uploadPhoto(photo));
      if (phoneNumber.trim()) saves.push(updateProfile({ phone_number: phoneNumber.trim() }));
      saves.push(updateMe({ first_name: firstName.trim() || null, last_name: lastName.trim() || null }));
      await Promise.all(saves);
      const { profile: saved } = await getProfile();
      setProfile(saved);
      navigate('/sessions', { replace: true });
    } catch (err) {
      setError(err.message || 'Erreur lors de la sauvegarde.');
    } finally {
      setSaving(false);
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────
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
          <StepIndicator current={step} total={4} />
        </div>
      </header>

      {/* Body */}
      <div className="flex-1 flex items-start justify-center px-4 py-10 sm:px-6">
        <div className="w-full max-w-lg space-y-8">

          {error && <ErrorBanner message={error} onClose={() => setError(null)} />}

          {/* ── STEP 1 — Basic info ───────────────────────────────────── */}
          {step === 1 && (
            <div className="space-y-8">
              <div>
                <h1 className="text-2xl font-semibold text-foreground tracking-tight">
                  Parlez-nous de vous
                </h1>
                <p className="mt-1 text-sm text-muted-foreground">
                  Notre IA va créer votre profil joueur étape par étape.
                </p>
              </div>

              <div className="space-y-5">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">Prénom <span className="text-red-500">*</span></Label>
                    <input
                      id="firstName"
                      type="text"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      placeholder="Kofi"
                      autoComplete="given-name"
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">Nom <span className="text-red-500">*</span></Label>
                    <input
                      id="lastName"
                      type="text"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      placeholder="Mensah"
                      autoComplete="family-name"
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Date de naissance <span className="text-red-500">*</span></Label>
                  <DateScrollPicker
                    value={birthDate}
                    onChange={setBirthDate}
                    minYear={1940}
                    maxYear={new Date().getFullYear() - 10}
                  />
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
                Continuer <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}

          {/* ── STEP 2 — PIA interview (QCM) ─────────────────────────── */}
          {step === 2 && (
            <div className="space-y-4">
              <div>
                <h1 className="text-2xl font-semibold text-foreground tracking-tight flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-primary" />
                  Entretien avec PIA
                </h1>
                <p className="mt-1 text-sm text-muted-foreground">
                  Choisissez une réponse — PIA génère votre profil à partir de vos réponses.
                </p>
              </div>

              {/* Chat transcript */}
              <div className="rounded-2xl border border-border bg-white shadow-sm overflow-hidden">
                <div className="h-56 overflow-y-auto p-4 space-y-3 no-scrollbar">
                  {chatMsgs.map((msg, i) => (
                    <ChatBubble key={i} role={msg.role} text={msg.text} />
                  ))}
                  {(chatBusy || generating) && (
                    <div className="flex justify-start items-center">
                      <div className="w-6 h-6 rounded-full bg-gradient-to-br from-violet-600 to-primary flex items-center justify-center mr-2 shrink-0">
                        <Sparkles className="h-3 w-3 text-white" />
                      </div>
                      <div className="bg-muted rounded-2xl rounded-bl-sm px-3.5 py-2.5 flex items-center gap-2">
                        <div className="flex gap-1">
                          {[0, 150, 300].map((d) => (
                            <span key={d} className="w-1.5 h-1.5 rounded-full bg-muted-foreground/60 animate-bounce" style={{ animationDelay: `${d}ms` }} />
                          ))}
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {generating ? 'Génération du profil…' : 'PIA réfléchit…'}
                        </span>
                      </div>
                    </div>
                  )}
                  <div ref={chatBottomRef} />
                </div>

                {/* QCM answer chips */}
                {!chatBusy && !generating && qIndex < QUESTIONS_QCM.length && (
                  <div className="border-t border-border px-4 py-4 bg-background/50 space-y-3">
                    {/* Progress */}
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-semibold text-muted-foreground">
                        Question {qIndex + 1} sur {QUESTIONS_QCM.length}
                      </p>
                      <div className="flex gap-1">
                        {QUESTIONS_QCM.map((_, i) => (
                          <div
                            key={i}
                            className={cn(
                              'h-1.5 rounded-full transition-all duration-300',
                              i < qIndex  ? 'w-4 bg-green-600'
                              : i === qIndex ? 'w-6 bg-green-700'
                              : 'w-4 bg-border'
                            )}
                          />
                        ))}
                      </div>
                    </div>

                    <div key={qIndex} className="flex flex-wrap gap-3 animate-fade-in-up">
                      {QUESTIONS_QCM[qIndex].options.map((opt) => (
                        <button
                          key={opt}
                          type="button"
                          onClick={() => handlePickAnswer(opt)}
                          className="px-4 py-3 rounded-full border border-green-600 bg-white text-sm font-medium text-green-700 hover:bg-green-700 hover:text-white hover:border-green-700 active:scale-95 transition-all"
                        >
                          {opt}
                        </button>
                      ))}
                      <button
                        type="button"
                        onClick={() => { setAutreMode(true); setAutreText(''); }}
                        className={cn(
                          'px-4 py-3 rounded-full border text-sm font-medium transition-all active:scale-95',
                          autreMode
                            ? 'border-green-700 bg-green-700 text-white'
                            : 'border-dashed border-gray-300 bg-gray-50 text-gray-500 hover:border-gray-400 hover:text-gray-700'
                        )}
                      >
                        Autre…
                      </button>
                    </div>

                    {/* "Autre" text input */}
                    {autreMode && (
                      <div className="flex gap-2 animate-fade-in-up">
                        <input
                          autoFocus
                          value={autreText}
                          onChange={(e) => setAutreText(e.target.value)}
                          onKeyDown={(e) => { if (e.key === 'Enter') handleAutreSubmit(); }}
                          placeholder="Précisez…"
                          className="flex-1 h-9 rounded-xl border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                        />
                        <button
                          onClick={handleAutreSubmit}
                          disabled={!autreText.trim()}
                          className="h-9 px-4 rounded-xl bg-primary text-white text-sm font-medium disabled:opacity-40 hover:bg-primary/90 transition-colors"
                        >
                          <Send className="h-4 w-4" />
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <Button variant="outline" onClick={() => { setStep(1); setError(null); }} className="gap-1">
                <ChevronLeft className="h-4 w-4" /> Retour
              </Button>
            </div>
          )}

          {/* ── STEP 3 — Profile review ───────────────────────────────── */}
          {step === 3 && (
            <div className="space-y-6">
              <div>
                <h1 className="text-2xl font-semibold text-foreground tracking-tight">
                  Votre profil ✨
                </h1>
                <p className="mt-1 text-sm text-muted-foreground">
                  Vérifiez votre profil généré. Vous pouvez ajuster votre niveau si besoin.
                </p>
              </div>

              {/* Generated profile card */}
              {generatedProfile && (
                <div className="rounded-xl border border-primary/20 bg-primary/5 p-5 space-y-4">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-primary" />
                    <p className="text-sm font-semibold text-primary">Profil généré par PIA</p>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="space-y-0.5">
                      <p className="text-xs text-muted-foreground uppercase tracking-wide">Niveau</p>
                      <p className="font-semibold text-foreground">
                        {adjustedLevel}/7 — {LEVEL_LABELS[adjustedLevel] ?? ''}
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

              {/* Level adjustment */}
              <div className="space-y-2">
                <Label>
                  Ajuster le niveau
                  {adjustedLevel && (
                    <span className="text-primary font-medium">
                      {' '}— {LEVEL_LABELS[adjustedLevel]}
                    </span>
                  )}
                </Label>
                <div className="flex gap-2 flex-wrap">
                  {[1, 2, 3, 4, 5, 6, 7].map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setAdjustedLevel(n)}
                      className={cn(
                        'w-10 h-10 rounded-lg text-sm font-semibold border transition-all',
                        adjustedLevel === n
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

              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setStep(2)} className="gap-1">
                  <ChevronLeft className="h-4 w-4" /> Retour
                </Button>
                <Button className="flex-1" size="lg" onClick={handleStep3Next}>
                  Continuer <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {/* ── STEP 4 — Photo upload ─────────────────────────────────── */}
          {step === 4 && (
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

                {/* Preview */}
                {photoPreview && (
                  <div className="flex justify-center">
                    <img
                      src={photoPreview}
                      alt="Aperçu"
                      className="w-24 h-24 rounded-full object-cover ring-4 ring-border"
                    />
                  </div>
                )}

                {/* Two-button chooser */}
                <div className="grid grid-cols-2 gap-3">
                  <label
                    htmlFor="photo-gallery"
                    className="flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border bg-muted/20 p-5 cursor-pointer transition-colors hover:border-primary/40 hover:bg-accent text-center"
                  >
                    <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                      <Upload className="w-4 h-4 text-muted-foreground" />
                    </div>
                    <p className="text-xs font-medium text-foreground/80 leading-tight">Choisir depuis la galerie</p>
                    <input
                      id="photo-gallery"
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handlePhotoChange}
                    />
                  </label>

                  <label
                    htmlFor="photo-camera"
                    className="flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border bg-muted/20 p-5 cursor-pointer transition-colors hover:border-primary/40 hover:bg-accent text-center"
                  >
                    <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                      <span className="text-base">📷</span>
                    </div>
                    <p className="text-xs font-medium text-foreground/80 leading-tight">Prendre une photo</p>
                    <input
                      id="photo-camera"
                      type="file"
                      accept="image/*"
                      capture="user"
                      className="hidden"
                      onChange={handlePhotoChange}
                    />
                  </label>
                </div>

                <p className="text-xs text-muted-foreground text-center">JPG, PNG ou WEBP — max 5 Mo</p>
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

              {/* Profile summary */}
              {generatedProfile && (
                <div className="rounded-xl border border-border bg-card p-4 shadow-sm space-y-3">
                  <p className="text-sm font-semibold text-foreground">Votre profil</p>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-muted-foreground">Niveau : </span>
                      <span className="font-medium">{adjustedLevel}/7</span>
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
                <Button variant="outline" onClick={() => setStep(3)} className="gap-1">
                  <ChevronLeft className="h-4 w-4" /> Retour
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
