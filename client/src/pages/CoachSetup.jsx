import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, Send, ChevronRight, ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { updateProfile } from '@/api/profile';
import { useAuth } from '@/App';
import { cn } from '@/lib/utils';

// ── PIA Interview questions for coaches ───────────────────────────────────────
const QUESTIONS = [
  'Quelle est votre spécialité en tant que coach ? (technique, physique, tactique, débutants…)',
  'Depuis combien d\'années coachez-vous le padel ?',
  'Comment décririez-vous votre style de coaching ? (exigeant, bienveillant, analytique, ludique…)',
  'Quels types de joueurs préférez-vous accompagner ? (débutants, intermédiaires, compétiteurs…)',
  'Quelles sont vos disponibilités générales ? (matin, soir, week-ends…)',
];

const ENCOURAGEMENTS = [
  'Super ! Votre spécialité est notée. 🎾',
  'Excellent ! Votre expérience est un vrai atout.',
  'Parfait ! Votre style de coaching est bien défini.',
  'Très bien ! On voit clairement votre cœur de cible.',
  'Génial ! On a tout ce qu\'il faut pour votre profil.',
];

function ChatBubble({ role, text }) {
  return (
    <div className={cn('flex items-start gap-2', role === 'user' ? 'flex-row-reverse' : 'flex-row')}>
      {role === 'model' && (
        <div className="w-6 h-6 rounded-full bg-gradient-to-br from-violet-600 to-primary flex items-center justify-center shrink-0 mt-0.5">
          <Sparkles className="h-3 w-3 text-white" />
        </div>
      )}
      <div
        className={cn(
          'max-w-[80%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-wrap',
          role === 'user'
            ? 'bg-primary text-primary-foreground rounded-tr-sm'
            : 'bg-muted text-foreground rounded-tl-sm',
        )}
      >
        {text}
      </div>
    </div>
  );
}

export default function CoachSetup() {
  const navigate = useNavigate();
  const { user, setUser } = useAuth();

  const [step, setStep]   = useState(1); // 1 = interview, 2 = review
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState(null);

  // Interview state
  const [qIndex,     setQIndex]    = useState(0);
  const [chatMsgs,   setChatMsgs]  = useState([{ role: 'model', text: `Bonjour ${user?.first_name ?? ''} ! Je suis PIA 🎾\n\nJe vais vous poser quelques questions pour créer votre profil coach.\n\n${QUESTIONS[0]}` }]);
  const [chatInput,  setChatInput] = useState('');
  const [chatBusy,   setChatBusy]  = useState(false);
  const [answers,    setAnswers]   = useState([]);
  const chatInputRef  = useRef(null);
  const chatBottomRef = useRef(null);

  // Generated coach profile
  const [coachProfile, setCoachProfile] = useState(null);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMsgs]);

  useEffect(() => {
    if (!chatBusy) chatInputRef.current?.focus();
  }, [chatBusy]);

  function handleChatKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleChatSubmit(); }
  }

  function handleChatSubmit() {
    const trimmed = chatInput.trim();
    if (!trimmed || chatBusy) return;

    setChatInput('');
    setChatBusy(true);

    const newAnswers = [...answers, trimmed];
    setAnswers(newAnswers);
    setChatMsgs((prev) => [...prev, { role: 'user', text: trimmed }]);

    if (qIndex === QUESTIONS.length - 1) {
      // All questions answered — build coach profile from answers
      setTimeout(() => {
        setChatMsgs((prev) => [
          ...prev,
          { role: 'model', text: `${ENCOURAGEMENTS[qIndex]}\n\nJe génère votre profil coach maintenant… ✨` },
        ]);
        buildCoachProfile(newAnswers);
      }, 600);
    } else {
      const nextIndex = qIndex + 1;
      setTimeout(() => {
        setChatMsgs((prev) => [
          ...prev,
          { role: 'model', text: `${ENCOURAGEMENTS[qIndex]}\n\n${QUESTIONS[nextIndex]}` },
        ]);
        setQIndex(nextIndex);
        setChatBusy(false);
      }, 600);
    }
  }

  function buildCoachProfile(ans) {
    // Build a structured profile from the 5 answers
    const [specialty, yearsRaw, style, targets, availability] = ans;
    const yearsMatch = yearsRaw.match(/\d+/);
    const years = yearsMatch ? parseInt(yearsMatch[0], 10) : null;

    const profile = {
      specialty: specialty.slice(0, 200),
      bio: `Coach depuis ${years ? `${years} an${years > 1 ? 's' : ''}` : 'plusieurs années'}, style ${style.toLowerCase()}. Travaille principalement avec ${targets.toLowerCase()}. Disponible : ${availability}.`,
      coaching_style: style.slice(0, 100),
      target_players: targets.slice(0, 100),
      availability: availability.slice(0, 200),
      years_experience: years,
    };

    setCoachProfile(profile);
    setTimeout(() => {
      setChatBusy(false);
      setStep(2);
    }, 800);
  }

  async function handleComplete() {
    setSaving(true);
    setError(null);
    try {
      await updateProfile({
        bio:       coachProfile.bio,
        specialty: coachProfile.specialty,
      });
      navigate('/coach/dashboard', { replace: true });
    } catch (err) {
      setError(err.message || 'Erreur lors de la sauvegarde du profil.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md space-y-6">

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

        {/* ── STEP 1: PIA Interview ──────────────────────────────────── */}
        {step === 1 && (
          <div className="space-y-4">
            <div>
              <h1 className="text-2xl font-semibold text-foreground tracking-tight flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                Configurer votre profil coach
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                PIA va créer votre profil à partir de vos réponses.
              </p>
            </div>

            <div className="rounded-2xl border border-border bg-white shadow-sm overflow-hidden">
              {/* Messages */}
              <div className="h-80 overflow-y-auto p-4 space-y-3 no-scrollbar">
                {chatMsgs.map((msg, i) => (
                  <ChatBubble key={i} role={msg.role} text={msg.text} />
                ))}
                {chatBusy && (
                  <div className="flex justify-start items-center">
                    <div className="w-6 h-6 rounded-full bg-gradient-to-br from-violet-600 to-primary flex items-center justify-center mr-2 shrink-0">
                      <Sparkles className="h-3 w-3 text-white" />
                    </div>
                    <div className="bg-muted rounded-2xl rounded-bl-sm px-3.5 py-2.5 flex items-center gap-1.5">
                      {[0, 150, 300].map((d) => (
                        <span
                          key={d}
                          className="w-1.5 h-1.5 rounded-full bg-muted-foreground/60 animate-bounce"
                          style={{ animationDelay: `${d}ms` }}
                        />
                      ))}
                    </div>
                  </div>
                )}
                <div ref={chatBottomRef} />
              </div>

              {/* Input */}
              <div className="border-t border-border px-3 py-3 bg-background/50">
                <div className="flex items-end gap-2">
                  <textarea
                    ref={chatInputRef}
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyDown={handleChatKeyDown}
                    placeholder="Votre réponse…"
                    rows={1}
                    disabled={chatBusy}
                    className="flex-1 resize-none rounded-xl border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-50 overflow-y-auto no-scrollbar"
                    style={{ minHeight: '38px', maxHeight: '80px' }}
                  />
                  <button
                    onClick={handleChatSubmit}
                    disabled={!chatInput.trim() || chatBusy}
                    className="shrink-0 w-9 h-9 rounded-xl bg-primary hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed text-white flex items-center justify-center transition-colors"
                    aria-label="Envoyer"
                  >
                    <Send className="h-4 w-4" />
                  </button>
                </div>
                <p className="text-[10px] text-muted-foreground text-center mt-1.5">
                  Question {Math.min(qIndex + 1, QUESTIONS.length)} / {QUESTIONS.length}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ── STEP 2: Review & Save ──────────────────────────────────── */}
        {step === 2 && coachProfile && (
          <div className="space-y-6">
            <div>
              <h1 className="text-2xl font-semibold text-foreground tracking-tight">
                Votre profil coach ✨
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Voici ce que PIA a préparé pour vous.
              </p>
            </div>

            <div className="rounded-xl border border-primary/20 bg-primary/5 p-5 space-y-4">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                <p className="text-sm font-semibold text-primary">Profil généré par PIA</p>
              </div>

              <div className="space-y-3 text-sm">
                <div className="space-y-0.5">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Spécialité</p>
                  <p className="font-medium text-foreground">{coachProfile.specialty}</p>
                </div>
                {coachProfile.years_experience !== null && (
                  <div className="space-y-0.5">
                    <p className="text-xs text-muted-foreground uppercase tracking-wide">Expérience</p>
                    <p className="font-medium text-foreground">
                      {coachProfile.years_experience} an{coachProfile.years_experience > 1 ? 's' : ''}
                    </p>
                  </div>
                )}
                <div className="space-y-0.5">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Style de coaching</p>
                  <p className="font-medium text-foreground">{coachProfile.coaching_style}</p>
                </div>
                <div className="space-y-0.5">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Joueurs cibles</p>
                  <p className="font-medium text-foreground">{coachProfile.target_players}</p>
                </div>
                <div className="space-y-0.5">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Disponibilités</p>
                  <p className="font-medium text-foreground">{coachProfile.availability}</p>
                </div>
                <div className="space-y-0.5">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Bio générée</p>
                  <p className="text-foreground/80 italic">"{coachProfile.bio}"</p>
                </div>
              </div>
            </div>

            {error && (
              <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                {error}
              </div>
            )}

            <div className="flex gap-3">
              <Button variant="outline" onClick={() => { setStep(1); setAnswers([]); setQIndex(0); setChatMsgs([{ role: 'model', text: `Bonjour ${user?.first_name ?? ''} ! Je suis PIA 🎾\n\nJe vais vous poser quelques questions pour créer votre profil coach.\n\n${QUESTIONS[0]}` }]); }} className="gap-1">
                <ChevronLeft className="h-4 w-4" /> Recommencer
              </Button>
              <Button className="flex-1" size="lg" onClick={handleComplete} disabled={saving}>
                {saving ? (
                  <>
                    <span className="w-4 h-4 border-2 border-primary-foreground/50 border-t-transparent rounded-full animate-spin mr-2" />
                    Sauvegarde…
                  </>
                ) : (
                  <>Accéder à mon espace <ChevronRight className="h-4 w-4" /></>
                )}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
