import { useState, useRef, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Sparkles, Upload, CheckCircle2, ChevronRight, ChevronLeft,
  AlertCircle, X, Phone, Camera,
} from 'lucide-react';
import { useAuth } from '@/App';
import { updateProfile, uploadPhoto, getProfile } from '@/api/profile';
import { updateMe } from '@/api/auth';
import { Button }   from '@/components/ui/button';
import { Label }    from '@/components/ui/label';
import { cn }       from '@/lib/utils';
import DateScrollPicker from '@/components/DateScrollPicker';

// ── Constants ────────────────────────────────────────────────────────────────
const STEP_LABELS = ['Informations', 'Questions PIA', 'Photo & fin'];

// Map Q2 level answer → DB integer
const LEVEL_FROM_ANSWER = {
  'Débutant': 1, 'Débutant +': 2, 'Intermédiaire': 3,
  'Intermédiaire +': 4, 'Avancé': 6, 'Expert': 7,
};

// PIA interview — 9 QCM questions
const QUESTIONS_QCM = [
  {
    key:     'experience',
    text:    'Depuis combien de temps jouez-vous au padel ?',
    options: ['Moins de 6 mois', '6 mois - 1 an', '1 - 3 ans', 'Plus de 3 ans'],
  },
  {
    key:     'level',
    text:    'Quel est votre niveau ?',
    options: ['Débutant', 'Débutant +', 'Intermédiaire', 'Intermédiaire +', 'Avancé', 'Expert'],
  },
  {
    key:     'style',
    text:    'Quel est votre style de jeu ?',
    options: ['Défensif', 'Attaquant', 'Polyvalent', 'Serveur-volleyeur'],
  },
  {
    key:        'strengths',
    text:       'Vos points forts ? (max 3)',
    options:    ['Smash', 'Volée', 'Service', 'Régularité', 'Placement', 'Vitesse'],
    multiSelect: true,
    maxSelect:   3,
  },
  {
    key:        'weaknesses',
    text:       'Ce que vous voulez améliorer ? (max 3)',
    options:    ['Défense', 'Revers', 'Constance', 'Vitesse', 'Mental', 'Smash'],
    multiSelect: true,
    maxSelect:   3,
  },
  {
    key:     'preferred_time',
    text:    'Quand préférez-vous jouer ?',
    options: ['Matin', 'Après-midi', 'Soir', 'Week-end', 'Peu importe'],
  },
  {
    key:     'age_range',
    text:    'Votre tranche d\'âge ?',
    options: ['Moins de 18 ans', '18-25 ans', '26-35 ans', '36-45 ans', 'Plus de 45 ans'],
    noAutre: true,
  },
  {
    key:     'motivation',
    text:    'Vous cherchez quoi sur PadelConnect ?',
    options: ['Trouver des partenaires', 'Progresser', 'Découvrir des clubs', "M'amuser", 'Compétition'],
  },
  {
    key:     'availability',
    text:    'Votre disponibilité habituelle ?',
    options: ['En semaine', 'Week-end uniquement', 'Tous les jours', 'Occasionnel'],
  },
];

const ENCOURAGEMENTS = [
  'Super, merci ! 🎾',
  'Parfait !',
  'Excellent ! 🙌',
  "C'est noté !",
  'Très bien !',
  'Noté ! 👍',
  'Super choix !',
  'Très bien !',
  'Parfait, merci ! Bienvenue sur PadelConnect 🎾',
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

function ChatBubble({ role, text }) {
  return (
    <div className={`flex ${role === 'user' ? 'justify-end' : 'justify-start'}`}>
      {role === 'model' && (
        <div className="w-6 h-6 rounded-full bg-gradient-to-br from-violet-600 to-primary flex items-center justify-center mr-2 mt-0.5 shrink-0">
          <Sparkles className="h-3 w-3 text-white" />
        </div>
      )}
      <div className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-wrap
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
  const [chatMsgs,         setChatMsgs]         = useState([]);
  const [chatBusy,         setChatBusy]         = useState(false);
  const [qIndex,           setQIndex]           = useState(0);
  const [qaAnswers,        setQaAnswers]        = useState([]);
  const [saving,           setSaving]           = useState(false);
  const [autreMode,        setAutreMode]        = useState(false);
  const [autreText,        setAutreText]        = useState('');
  const [multiSelectValues, setMultiSelectValues] = useState([]);

  // ── Step 3: photo upload ──────────────────────────────────────────────────
  const [photo,          setPhoto]          = useState(null);
  const [photoPreview,   setPhotoPreview]   = useState(null);
  const [photoUploading, setPhotoUploading] = useState(false);
  const [photoUploaded,  setPhotoUploaded]  = useState(false);

  const [step, setStep] = useState(1);

  const chatBottomRef = useRef(null);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMsgs, chatBusy]);

  // Initialise PIA when entering step 2
  useEffect(() => {
    if (step === 2) {
      const greeting = firstName
        ? `Bonjour ${firstName} ! Je suis PIA. Répondez aux questions pour créer votre profil. 🎾\n\n${QUESTIONS_QCM[0].text}`
        : `Bonjour ! Je suis PIA. Répondez aux questions pour créer votre profil. 🎾\n\n${QUESTIONS_QCM[0].text}`;
      setChatMsgs([{ role: 'model', text: greeting }]);
      setQIndex(0);
      setQaAnswers([]);
      setMultiSelectValues([]);
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

  // ── QCM: pick an answer (single-select) ──────────────────────────────────
  function handlePickAnswer(answer) {
    if (chatBusy || saving) return;
    const q = QUESTIONS_QCM[qIndex];
    if (q.multiSelect) {
      setMultiSelectValues((prev) => {
        if (prev.includes(answer)) return prev.filter((v) => v !== answer);
        if (prev.length >= q.maxSelect) return prev;
        return [...prev, answer];
      });
      return;
    }
    setAutreMode(false);
    setAutreText('');
    submitAnswer(answer);
  }

  // ── QCM: confirm multi-select selection ───────────────────────────────────
  function handleMultiSelectConfirm() {
    if (multiSelectValues.length === 0 || chatBusy || saving) return;
    const values = [...multiSelectValues];
    setMultiSelectValues([]);
    setAutreMode(false);
    setAutreText('');
    submitAnswer(values);
  }

  // ── QCM: submit "Autre" custom text ──────────────────────────────────────
  function handleAutreSubmit() {
    const answer = autreText.trim();
    if (!answer || chatBusy || saving) return;
    const q = QUESTIONS_QCM[qIndex];
    if (q.multiSelect) {
      setMultiSelectValues((prev) => {
        if (prev.includes(answer)) return prev;
        if (prev.length >= q.maxSelect) return prev;
        return [...prev, answer];
      });
      setAutreMode(false);
      setAutreText('');
      return;
    }
    setAutreMode(false);
    setAutreText('');
    submitAnswer(answer);
  }

  // ── Core submit ───────────────────────────────────────────────────────────
  function submitAnswer(answer) {
    const displayText = Array.isArray(answer) ? answer.join(', ') : answer;
    setChatBusy(true);
    const newAnswers = [...qaAnswers, { question: QUESTIONS_QCM[qIndex].text, answer }];
    setQaAnswers(newAnswers);
    setChatMsgs((prev) => [...prev, { role: 'user', text: displayText }]);

    const isLast = qIndex === QUESTIONS_QCM.length - 1;
    if (isLast) {
      setTimeout(() => {
        setChatMsgs((prev) => [...prev, { role: 'model', text: ENCOURAGEMENTS[ENCOURAGEMENTS.length - 1] }]);
        setTimeout(() => {
          setChatMsgs((prev) => [...prev, { role: 'model', text: 'Enregistrement de votre profil… ✨' }]);
          saveDirectProfile(newAnswers);
        }, 700);
      }, 600);
    } else {
      const nextIndex = qIndex + 1;
      setTimeout(() => {
        setChatMsgs((prev) => [
          ...prev,
          { role: 'model', text: `${ENCOURAGEMENTS[qIndex % ENCOURAGEMENTS.length]}\n\n${QUESTIONS_QCM[nextIndex].text}` },
        ]);
        setQIndex(nextIndex);
        setMultiSelectValues([]);
        setChatBusy(false);
      }, 600);
    }
  }

  // ── Save profile directly (no AI) ─────────────────────────────────────────
  async function saveDirectProfile(answers) {
    setSaving(true);
    try {
      const getAnswer = (idx) => answers[idx]?.answer;

      const levelStr = getAnswer(1);
      const level    = LEVEL_FROM_ANSWER[levelStr] ?? null;

      const rawStrengths  = getAnswer(3);
      const rawWeaknesses = getAnswer(4);

      const profileData = {
        strengths:  Array.isArray(rawStrengths)  ? rawStrengths  : (rawStrengths  ? [rawStrengths]  : []),
        weaknesses: Array.isArray(rawWeaknesses) ? rawWeaknesses : (rawWeaknesses ? [rawWeaknesses] : []),
      };
      if (level !== null)      profileData.level             = level;
      const style = getAnswer(2);
      if (style)               profileData.style             = style;
      const pref = getAnswer(5);
      if (pref)                profileData.preferred_time    = pref;
      const age = getAnswer(6);
      if (age)                 profileData.age_range         = age;
      const motivation = getAnswer(7);
      if (motivation)          profileData.motivation_answer = motivation;
      const avail = getAnswer(8);
      if (avail)               profileData.availability      = avail;

      await updateProfile(profileData);
      await updateMe({ first_name: firstName.trim() || null, last_name: lastName.trim() || null });

      setStep(3);
    } catch (err) {
      setError(err.message || 'Erreur lors de la sauvegarde.');
      setChatBusy(false);
    } finally {
      setSaving(false);
    }
  }

  // ── Photo ──────────────────────────────────────────────────────────────────
  async function handlePhotoChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setError('La photo ne doit pas dépasser 5 Mo.');
      return;
    }
    setError(null);
    setPhoto(file);
    setPhotoPreview(URL.createObjectURL(file));
    setPhotoUploaded(false);
    setPhotoUploading(true);
    try {
      await uploadPhoto(file);
      setPhotoUploaded(true);
    } catch (err) {
      setError(err.message || 'Erreur lors du téléversement.');
      setPhoto(null);
      setPhotoPreview(null);
    } finally {
      setPhotoUploading(false);
    }
  }

  // ── Final complete ─────────────────────────────────────────────────────────
  async function handleComplete() {
    setSaving(true);
    setError(null);
    try {
      if (photo && !photoUploaded) await uploadPhoto(photo);
      if (phoneNumber.trim()) await updateProfile({ phone_number: phoneNumber.trim() });
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
          <StepIndicator current={step} total={3} />
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
                  PIA va créer votre profil joueur en quelques questions.
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
                  {QUESTIONS_QCM.length} questions — PIA crée votre profil instantanément.
                </p>
              </div>

              {/* Chat transcript */}
              <div className="rounded-2xl border border-border bg-white shadow-sm overflow-hidden">
                <div className="h-56 overflow-y-auto p-4 space-y-3 no-scrollbar">
                  {chatMsgs.map((msg, i) => (
                    <ChatBubble key={i} role={msg.role} text={msg.text} />
                  ))}
                  {(chatBusy || saving) && (
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
                          {saving ? 'Enregistrement…' : 'PIA réfléchit…'}
                        </span>
                      </div>
                    </div>
                  )}
                  <div ref={chatBottomRef} />
                </div>

                {/* QCM answer chips */}
                {!chatBusy && !saving && qIndex < QUESTIONS_QCM.length && (
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

                    {/* Option chips */}
                    <div key={qIndex} className="flex flex-wrap gap-2 animate-fade-in-up">
                      {QUESTIONS_QCM[qIndex].options.map((opt) => {
                        const isMulti    = !!QUESTIONS_QCM[qIndex].multiSelect;
                        const isSelected = isMulti && multiSelectValues.includes(opt);
                        return (
                          <button
                            key={opt}
                            type="button"
                            onClick={() => handlePickAnswer(opt)}
                            className={cn(
                              'px-4 py-2.5 rounded-full border text-sm font-medium transition-all active:scale-95',
                              isSelected
                                ? 'border-green-700 bg-green-700 text-white'
                                : 'border-green-600 bg-white text-green-700 hover:bg-green-700 hover:text-white hover:border-green-700',
                            )}
                          >
                            {isSelected && '✓ '}{opt}
                          </button>
                        );
                      })}
                      {/* "Autre" button — hidden for questions with noAutre flag */}
                      {!QUESTIONS_QCM[qIndex].noAutre && (
                        <button
                          type="button"
                          onClick={() => { setAutreMode(true); setAutreText(''); }}
                          className={cn(
                            'px-4 py-2.5 rounded-full border text-sm font-medium transition-all active:scale-95',
                            autreMode
                              ? 'border-green-700 bg-green-700 text-white'
                              : 'border-dashed border-gray-300 bg-gray-50 text-gray-500 hover:border-gray-400 hover:text-gray-700'
                          )}
                        >
                          Autre…
                        </button>
                      )}
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
                          OK
                        </button>
                      </div>
                    )}

                    {/* Multi-select confirm bar */}
                    {QUESTIONS_QCM[qIndex].multiSelect && (
                      <div className="flex items-center justify-between pt-1">
                        <p className="text-xs text-muted-foreground">
                          {multiSelectValues.length > 0
                            ? `${multiSelectValues.length}/${QUESTIONS_QCM[qIndex].maxSelect} sélectionné(s)`
                            : `Sélectionnez jusqu'à ${QUESTIONS_QCM[qIndex].maxSelect}`}
                        </p>
                        {multiSelectValues.length > 0 && (
                          <button
                            type="button"
                            onClick={handleMultiSelectConfirm}
                            className="px-5 py-2 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary/90 transition-colors"
                          >
                            Confirmer →
                          </button>
                        )}
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

          {/* ── STEP 3 — Photo upload ─────────────────────────────────── */}
          {step === 3 && (
            <div className="space-y-6">
              <div>
                <h1 className="text-2xl font-semibold text-foreground tracking-tight">
                  Dernière étape 🎉
                </h1>
                <p className="mt-1 text-sm text-muted-foreground">
                  Votre profil est créé ! Ajoutez une photo (optionnel).
                </p>
              </div>

              {/* Photo upload */}
              <div className="flex flex-col items-center gap-4">
                {photoPreview ? (
                  <img src={photoPreview} className="w-24 h-24 rounded-full object-cover border-4 border-green-200" alt="Aperçu" />
                ) : (
                  <div className="w-24 h-24 rounded-full bg-gray-100 flex items-center justify-center">
                    <Camera className="w-8 h-8 text-gray-400" />
                  </div>
                )}

                <label className="cursor-pointer bg-green-700 text-white px-6 py-3 rounded-full font-medium">
                  {photoUploading ? 'Envoi...' : 'Ajouter une photo'}
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handlePhotoChange}
                  />
                </label>

                {photoUploaded && (
                  <p className="text-sm text-green-600 flex items-center gap-1">
                    <CheckCircle2 className="h-4 w-4" /> Photo ajoutée !
                  </p>
                )}
              </div>

              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setStep(2)} className="gap-1" disabled={saving}>
                  <ChevronLeft className="h-4 w-4" /> Retour
                </Button>
                <Button
                  className="flex-1"
                  size="lg"
                  onClick={handleComplete}
                  disabled={saving || photoUploading}
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
