import { useState, useRef, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Sparkles, Upload, CheckCircle2, ChevronRight, ChevronLeft,
  AlertCircle, X, Phone, Camera, AtSign,
} from 'lucide-react';
import { useAuth } from '@/App';
import { updateProfile, uploadPhoto, getProfile } from '@/api/profile';
import { updateMe, checkUsername } from '@/api/auth';
import { Button }   from '@/components/ui/button';
import { Label }    from '@/components/ui/label';
import { cn }       from '@/lib/utils';
import DateScrollPicker from '@/components/DateScrollPicker';

// ── Constants ────────────────────────────────────────────────────────────────
const STEP_LABELS = ['Informations', 'Questions PIA', 'Photo & fin'];

const LEVEL_FROM_ANSWER = {
  'Débutant': 1, 'Débutant +': 2, 'Intermédiaire': 3,
  'Intermédiaire +': 4, 'Avancé': 6, 'Expert': 7,
};

const QUESTIONS_QCM = [
  {
    key:     'experience',
    text:    'Depuis combien de temps jouez-vous au padel ?',
    bubble:  'Dites-moi depuis quand vous pratiquez le padel.',
    options: ['Moins de 6 mois', '6 mois - 1 an', '1 - 3 ans', 'Plus de 3 ans'],
  },
  {
    key:     'level',
    text:    'Quel est votre niveau ?',
    bubble:  'Soyez honnête, c\'est pour mieux vous matcher !',
    options: ['Débutant', 'Débutant +', 'Intermédiaire', 'Intermédiaire +', 'Avancé', 'Expert'],
  },
  {
    key:     'style',
    text:    'Quel est votre style de jeu ?',
    bubble:  'Comment vous décririez-vous sur le court ?',
    options: ['Défensif', 'Attaquant', 'Polyvalent', 'Serveur-volleyeur'],
  },
  {
    key:        'strengths',
    text:       'Vos points forts ?',
    bubble:     'Sélectionnez jusqu\'à 3 points forts.',
    options:    ['Smash', 'Volée', 'Service', 'Régularité', 'Placement', 'Vitesse'],
    multiSelect: true,
    maxSelect:   3,
  },
  {
    key:        'weaknesses',
    text:       'Ce que vous voulez améliorer ?',
    bubble:     'Sélectionnez jusqu\'à 3 axes de progression.',
    options:    ['Défense', 'Revers', 'Constance', 'Vitesse', 'Mental', 'Smash'],
    multiSelect: true,
    maxSelect:   3,
  },
  {
    key:     'preferred_time',
    text:    'Quand préférez-vous jouer ?',
    bubble:  'Je noterai vos disponibilités préférées.',
    options: ['Matin', 'Après-midi', 'Soir', 'Week-end', 'Peu importe'],
  },
  {
    key:     'age_range',
    text:    'Votre tranche d\'âge ?',
    bubble:  'Pour trouver des partenaires de votre génération.',
    options: ['Moins de 18 ans', '18-25 ans', '26-35 ans', '36-45 ans', 'Plus de 45 ans'],
    noAutre: true,
  },
  {
    key:     'motivation',
    text:    'Vous cherchez quoi sur PadelConnect ?',
    bubble:  'Qu\'est-ce qui vous a amené ici ?',
    options: ['Trouver des partenaires', 'Progresser', 'Découvrir des clubs', "M'amuser", 'Compétition'],
  },
  {
    key:     'availability',
    text:    'Votre disponibilité habituelle ?',
    bubble:  'Dernière question, promis ! 🎾',
    options: ['En semaine', 'Week-end uniquement', 'Tous les jours', 'Occasionnel'],
  },
];

// ── Step 1 & 3 sub-components ─────────────────────────────────────────────────
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

// ── Main component ────────────────────────────────────────────────────────────
export default function ProfileSetup() {
  const { user, setProfile } = useAuth();
  const navigate = useNavigate();

  const [error, setError] = useState(null);

  // ── Step 1: basic info ────────────────────────────────────────────────────
  const [firstName,        setFirstName]        = useState(user?.first_name ?? '');
  const [lastName,         setLastName]         = useState(user?.last_name  ?? '');
  const [birthDate,        setBirthDate]        = useState('');
  const [phoneNumber,      setPhoneNumber]      = useState('');
  const [username,         setUsername]         = useState('');
  // null | 'checking' | 'available' | 'taken' | 'invalid'
  const [usernameStatus,   setUsernameStatus]   = useState(null);
  const usernameTimerRef = useRef(null);

  // ── Step 2: QCM state ─────────────────────────────────────────────────────
  const [qIndex,            setQIndex]            = useState(0);
  const [qaAnswers,         setQaAnswers]         = useState([]);
  const [selectedSingle,    setSelectedSingle]    = useState(null);
  const [multiSelectValues, setMultiSelectValues] = useState([]);
  const [autreMode,         setAutreMode]         = useState(false);
  const [autreText,         setAutreText]         = useState('');
  const [saving,            setSaving]            = useState(false);

  // ── Step 3: photo upload ──────────────────────────────────────────────────
  const [photo,          setPhoto]          = useState(null);
  const [photoPreview,   setPhotoPreview]   = useState(null);
  const [photoUploading, setPhotoUploading] = useState(false);
  const [photoUploaded,  setPhotoUploaded]  = useState(false);

  const [step, setStep] = useState(1);

  // Cleanup username debounce timer on unmount
  useEffect(() => () => { if (usernameTimerRef.current) clearTimeout(usernameTimerRef.current); }, []);

  // Reset selection when question changes
  useEffect(() => {
    setSelectedSingle(null);
    setMultiSelectValues([]);
    setAutreMode(false);
    setAutreText('');
  }, [qIndex]);

  // ── Username input handler (auto-format + debounced availability check) ──
  function handleUsernameChange(e) {
    const raw = e.target.value;
    // Auto-lowercase, replace spaces with _, strip invalid chars
    const clean = raw.toLowerCase().replace(/\s/g, '_').replace(/[^a-z0-9_]/g, '');
    setUsername(clean);

    if (usernameTimerRef.current) clearTimeout(usernameTimerRef.current);

    if (clean.length === 0) { setUsernameStatus(null); return; }
    if (clean.length < 3)   { setUsernameStatus('invalid'); return; }

    setUsernameStatus('checking');
    usernameTimerRef.current = setTimeout(async () => {
      try {
        const { available } = await checkUsername(clean);
        setUsernameStatus(available ? 'available' : 'taken');
      } catch {
        setUsernameStatus(null);
      }
    }, 500);
  }

  // ── Step 1 → 2 ────────────────────────────────────────────────────────────
  function handleStep1Next() {
    if (!firstName.trim() || !lastName.trim() || !birthDate) {
      setError('Veuillez renseigner votre prénom, nom et date de naissance.');
      return;
    }
    if (!username || username.length < 3) {
      setError('Veuillez choisir un nom d\'utilisateur (3 caractères minimum).');
      return;
    }
    if (usernameStatus === 'checking') {
      setError('Vérification du nom d\'utilisateur en cours, patientez un instant.');
      return;
    }
    if (usernameStatus === 'taken') {
      setError('Ce nom d\'utilisateur est déjà pris. Veuillez en choisir un autre.');
      return;
    }
    if (usernameStatus !== 'available') {
      setError('Veuillez attendre la vérification du nom d\'utilisateur.');
      return;
    }
    setError(null);
    setQIndex(0);
    setQaAnswers([]);
    setStep(2);
  }

  // ── QCM: pick an option ───────────────────────────────────────────────────
  function handlePickAnswer(opt) {
    if (saving) return;
    const q = QUESTIONS_QCM[qIndex];
    if (q.multiSelect) {
      setMultiSelectValues((prev) => {
        if (prev.includes(opt)) return prev.filter((v) => v !== opt);
        if (prev.length >= q.maxSelect) return prev;
        return [...prev, opt];
      });
      setAutreMode(false);
    } else {
      setSelectedSingle(opt);
      setAutreMode(false);
      setAutreText('');
    }
  }

  // ── QCM: "Suivant →" pressed ──────────────────────────────────────────────
  function handleNext() {
    if (saving) return;
    const q = QUESTIONS_QCM[qIndex];
    let answer;
    if (q.multiSelect) {
      if (autreMode && autreText.trim()) {
        // add the custom text to multiselect
        answer = [...multiSelectValues, autreText.trim()].slice(0, q.maxSelect);
      } else {
        answer = [...multiSelectValues];
      }
    } else {
      answer = autreMode ? autreText.trim() : selectedSingle;
    }
    if (!answer || (Array.isArray(answer) && answer.length === 0)) return;
    submitAnswer(answer);
  }

  // ── Core submit ───────────────────────────────────────────────────────────
  function submitAnswer(answer) {
    const newAnswers = [...qaAnswers, { question: QUESTIONS_QCM[qIndex].text, answer }];
    setQaAnswers(newAnswers);
    const isLast = qIndex === QUESTIONS_QCM.length - 1;
    if (isLast) {
      saveDirectProfile(newAnswers);
    } else {
      setQIndex(qIndex + 1);
    }
  }

  // ── Save profile directly ─────────────────────────────────────────────────
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
      await updateMe({
        first_name: firstName.trim() || null,
        last_name:  lastName.trim()  || null,
        username:   username.trim()  || null,
      });
      setStep(3);
    } catch (err) {
      setError(err.message || 'Erreur lors de la sauvegarde.');
    } finally {
      setSaving(false);
    }
  }

  // ── Photo ──────────────────────────────────────────────────────────────────
  async function handlePhotoChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { setError('La photo ne doit pas dépasser 5 Mo.'); return; }
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

  // ── Can advance? ───────────────────────────────────────────────────────────
  const q = QUESTIONS_QCM[qIndex];
  const canNext = q?.multiSelect
    ? multiSelectValues.length > 0 || (autreMode && autreText.trim().length > 0)
    : selectedSingle !== null || (autreMode && autreText.trim().length > 0);

  const progress = ((qIndex + 1) / QUESTIONS_QCM.length) * 100;

  // ── STEP 2 — full-screen premium QCM ──────────────────────────────────────
  if (step === 2) {
    return (
      <div
        className="fixed inset-0 flex flex-col overflow-hidden"
        style={{ background: 'linear-gradient(160deg, #0f2d1f 0%, #1a3d2b 100%)' }}
      >
        {/* Keyframe animations */}
        <style>{`
          @keyframes qFadeIn {
            from { opacity: 0; transform: translateY(24px); }
            to   { opacity: 1; transform: translateY(0); }
          }
          @keyframes btnSlideUp {
            from { opacity: 0; transform: translateY(16px); }
            to   { opacity: 1; transform: translateY(0); }
          }
          .q-enter { animation: qFadeIn 0.4s cubic-bezier(0.22,1,0.36,1) forwards; }
          .btn-enter { animation: btnSlideUp 0.3s cubic-bezier(0.22,1,0.36,1) forwards; }
        `}</style>

        {/* Progress bar */}
        <div className="relative h-[3px] w-full flex-shrink-0" style={{ background: 'rgba(255,255,255,0.12)' }}>
          <div
            className="absolute left-0 top-0 h-full transition-all duration-500 ease-out rounded-full"
            style={{ width: `${progress}%`, background: '#74C69D' }}
          />
        </div>

        {/* Back chevron */}
        <button
          type="button"
          onClick={() => { setStep(1); setError(null); }}
          className="absolute top-4 left-4 flex items-center gap-1.5 text-white/60 hover:text-white transition-colors text-sm z-10"
        >
          <ChevronLeft className="h-4 w-4" />
          Retour
        </button>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto overscroll-contain pb-36 pt-4">
          {saving ? (
            /* ── Saving spinner ─────────────────────────────────────── */
            <div className="flex flex-col items-center justify-center min-h-full gap-6 px-6">
              <div
                className="w-20 h-20 rounded-full flex items-center justify-center"
                style={{ background: 'rgba(116,198,157,0.15)', border: '2px solid rgba(116,198,157,0.3)' }}
              >
                <div className="w-10 h-10 rounded-xl bg-[#74C69D] flex items-center justify-center shadow-sm">
                  <span className="text-[#0f2d1f] font-black text-xl leading-none select-none">P</span>
                </div>
              </div>
              <div className="text-center space-y-2">
                <p className="text-white text-xl font-semibold">Création de votre profil…</p>
                <p style={{ color: '#74C69D' }} className="text-sm">PIA analyse vos réponses</p>
              </div>
              <div className="flex gap-2">
                {[0, 150, 300].map((d) => (
                  <div
                    key={d}
                    className="w-2.5 h-2.5 rounded-full animate-bounce"
                    style={{ background: '#74C69D', animationDelay: `${d}ms` }}
                  />
                ))}
              </div>
            </div>
          ) : (
            /* ── Question card ──────────────────────────────────────── */
            <div key={qIndex} className="q-enter px-5 pt-10 max-w-lg mx-auto w-full">

              {/* PIA avatar + subtitle */}
              <div className="flex flex-col items-center gap-3 mb-7">
                <div
                  className="w-14 h-14 rounded-full flex items-center justify-center shadow-lg"
                  style={{
                    background: 'rgba(116,198,157,0.18)',
                    border: '1.5px solid rgba(116,198,157,0.45)',
                    boxShadow: '0 0 24px rgba(116,198,157,0.15)',
                  }}
                >
                  <span className="text-base font-black text-[#74C69D] select-none leading-none">P</span>
                </div>
                <p className="text-xs font-semibold tracking-widest uppercase" style={{ color: '#74C69D', letterSpacing: '0.12em' }}>
                  Question {qIndex + 1} sur {QUESTIONS_QCM.length}
                </p>
              </div>

              {/* Question text */}
              <h1
                className="text-[1.6rem] font-bold text-white text-center leading-tight mb-6"
                style={{ fontFamily: "'Inter', system-ui, sans-serif", letterSpacing: '-0.01em' }}
              >
                {q.text}
              </h1>

              {/* PIA message bubble */}
              <div
                className="rounded-2xl px-4 py-3 mb-6 mx-auto max-w-xs text-center"
                style={{ background: 'rgba(255,255,255,0.93)', boxShadow: '0 2px 12px rgba(0,0,0,0.18)' }}
              >
                <p className="text-sm font-medium" style={{ color: '#1a3d2b' }}>
                  {q.bubble}
                </p>
              </div>

              {/* Options */}
              <div className="space-y-3">
                {q.options.map((opt) => {
                  const isSelected = q.multiSelect
                    ? multiSelectValues.includes(opt)
                    : selectedSingle === opt;
                  return (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => handlePickAnswer(opt)}
                      className="w-full text-left flex items-center justify-between rounded-xl transition-all duration-150 active:scale-[0.985] focus:outline-none"
                      style={{
                        background: isSelected ? 'rgba(255,255,255,0.98)' : 'rgba(255,255,255,0.88)',
                        padding: '16px 18px',
                        borderLeft: isSelected ? '4px solid #16a34a' : '4px solid transparent',
                        boxShadow: isSelected
                          ? '0 4px 16px rgba(22,163,74,0.18), 0 1px 4px rgba(0,0,0,0.08)'
                          : '0 1px 4px rgba(0,0,0,0.08)',
                      }}
                    >
                      <span
                        className="text-sm font-medium"
                        style={{ color: isSelected ? '#15803d' : '#1f2937' }}
                      >
                        {opt}
                      </span>
                      {isSelected && (
                        <CheckCircle2
                          className="h-5 w-5 shrink-0 ml-2"
                          style={{ color: '#16a34a' }}
                        />
                      )}
                    </button>
                  );
                })}

                {/* "Autre" option */}
                {!q.noAutre && (
                  <button
                    type="button"
                    onClick={() => {
                      if (q.multiSelect) {
                        setAutreMode((v) => !v);
                      } else {
                        setAutreMode(true);
                        setSelectedSingle(null);
                      }
                    }}
                    className="w-full text-left flex items-center justify-between rounded-xl transition-all duration-150 active:scale-[0.985] focus:outline-none"
                    style={{
                      background: autreMode ? 'rgba(255,255,255,0.95)' : 'rgba(255,255,255,0.18)',
                      padding: '14px 18px',
                      borderLeft: autreMode ? '4px solid #16a34a' : '4px solid transparent',
                      border: autreMode ? undefined : '1.5px dashed rgba(255,255,255,0.3)',
                      boxShadow: autreMode ? '0 2px 8px rgba(22,163,74,0.15)' : 'none',
                    }}
                  >
                    <span
                      className="text-sm font-medium"
                      style={{ color: autreMode ? '#15803d' : 'rgba(255,255,255,0.65)' }}
                    >
                      Autre…
                    </span>
                    {autreMode && <CheckCircle2 className="h-5 w-5 shrink-0 ml-2" style={{ color: '#16a34a' }} />}
                  </button>
                )}

                {/* "Autre" text input */}
                {autreMode && (
                  <input
                    autoFocus
                    value={autreText}
                    onChange={(e) => setAutreText(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter' && canNext) handleNext(); }}
                    placeholder="Précisez votre réponse…"
                    className="w-full rounded-xl text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2"
                    style={{
                      background: 'rgba(255,255,255,0.95)',
                      padding: '14px 18px',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                      focusRingColor: '#74C69D',
                    }}
                  />
                )}

                {/* Multi-select count */}
                {q.multiSelect && multiSelectValues.length > 0 && (
                  <p className="text-center text-sm font-medium pt-1" style={{ color: '#74C69D' }}>
                    {multiSelectValues.length}/{q.maxSelect} sélectionné(s)
                  </p>
                )}
              </div>

              {/* Error */}
              {error && (
                <div className="mt-4 rounded-xl p-3 text-sm flex items-center gap-2" style={{ background: 'rgba(239,68,68,0.15)', color: '#fca5a5' }}>
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  {error}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Fixed "Suivant →" button */}
        {canNext && !saving && (
          <div
            className="fixed bottom-0 left-0 right-0 px-5 pb-10 pt-6 btn-enter"
            style={{ background: 'linear-gradient(to top, #0f2d1f 55%, transparent)' }}
          >
            <button
              type="button"
              onClick={handleNext}
              className="w-full max-w-lg mx-auto flex items-center justify-center gap-2 rounded-2xl font-semibold text-base transition-all active:scale-[0.97] focus:outline-none"
              style={{
                display: 'flex',
                background: '#74C69D',
                color: '#0f2d1f',
                padding: '17px 24px',
                boxShadow: '0 4px 20px rgba(116,198,157,0.4)',
                fontWeight: 700,
                fontSize: '1rem',
              }}
            >
              {qIndex === QUESTIONS_QCM.length - 1 ? 'Terminer mon profil ✓' : 'Suivant →'}
            </button>
          </div>
        )}
      </div>
    );
  }

  // ── STEP 1 & 3 — standard layout ──────────────────────────────────────────
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

                {/* Username */}
                <div className="space-y-2">
                  <Label htmlFor="username">
                    Nom d'utilisateur <span className="text-red-500">*</span>
                  </Label>
                  <div className="relative">
                    <AtSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                    <input
                      id="username"
                      type="text"
                      value={username}
                      onChange={handleUsernameChange}
                      placeholder="kofi_padel"
                      maxLength={20}
                      autoComplete="username"
                      className="flex h-10 w-full rounded-md border border-input bg-background pl-9 pr-9 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    />
                    {usernameStatus && (
                      <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                        {usernameStatus === 'checking' && (
                          <span className="block w-4 h-4 border-2 border-primary/40 border-t-primary rounded-full animate-spin" />
                        )}
                        {usernameStatus === 'available' && (
                          <CheckCircle2 className="h-4 w-4 text-green-500" />
                        )}
                        {(usernameStatus === 'taken' || usernameStatus === 'invalid') && (
                          <X className="h-4 w-4 text-red-500" />
                        )}
                      </div>
                    )}
                  </div>
                  <p className={cn('text-xs', {
                    'text-green-600':          usernameStatus === 'available',
                    'text-red-500':            usernameStatus === 'taken' || usernameStatus === 'invalid',
                    'text-muted-foreground':   !usernameStatus || usernameStatus === 'checking',
                  })}>
                    {usernameStatus === 'available' && 'Disponible !'}
                    {usernameStatus === 'taken'     && 'Ce nom d\'utilisateur est déjà pris.'}
                    {usernameStatus === 'invalid'   && 'Minimum 3 caractères — lettres minuscules, chiffres et _.'}
                    {(!usernameStatus || usernameStatus === 'checking') && 'Lettres minuscules, chiffres et _ (3-20 caractères).'}
                  </p>
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
                  <input type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} />
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
