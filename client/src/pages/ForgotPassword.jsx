import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { forgotPassword, resetPassword } from '@/api/auth';
import { Button }   from '@/components/ui/button';
import { Input }    from '@/components/ui/input';
import { Label }    from '@/components/ui/label';
import { AlertCircle, CheckCircle2, Mail, Eye, EyeOff, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

const OTP_TTL_SECONDS  = 600; // 10 minutes
const COOLDOWN_SECONDS = 60;

// ── Step 1: email input ───────────────────────────────────────────────────────
function EmailStep({ onSent }) {
  const [email,   setEmail]   = useState('');
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await forgotPassword(email.trim().toLowerCase());
      onSent(email.trim().toLowerCase());
    } catch (err) {
      setError(err.message || 'Une erreur est survenue. Réessayez.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
          <Mail className="h-8 w-8 text-primary" />
        </div>
      </div>

      <div className="space-y-1 text-center">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Mot de passe oublié ?
        </h1>
        <p className="text-sm text-muted-foreground">
          Entrez votre email, nous vous enverrons un code de réinitialisation.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="flex items-start gap-2.5 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <p>{error}</p>
          </div>
        )}

        <div className="space-y-1.5">
          <Label htmlFor="email">Adresse email</Label>
          <Input
            id="email"
            type="email"
            placeholder="vous@exemple.com"
            autoComplete="email"
            value={email}
            onChange={(e) => { setEmail(e.target.value); setError(''); }}
            required
          />
        </div>

        <Button type="submit" className="w-full" size="lg" disabled={loading || !email}>
          {loading ? (
            <><Loader2 className="h-4 w-4 animate-spin" /> Envoi…</>
          ) : (
            'Envoyer le code'
          )}
        </Button>
      </form>

      <Link to="/login">
        <Button variant="ghost" size="sm" className="w-full text-muted-foreground">
          Retour à la connexion
        </Button>
      </Link>
    </div>
  );
}

// ── Step 2: OTP + new password ────────────────────────────────────────────────
function ResetStep({ email }) {
  const navigate = useNavigate();

  const [digits,       setDigits]       = useState(Array(6).fill(''));
  const [newPassword,  setNewPassword]  = useState('');
  const [showPwd,      setShowPwd]      = useState(false);
  const [otpDone,      setOtpDone]      = useState(false);
  const [submitStatus, setSubmitStatus] = useState('idle');
  const [errorMsg,     setErrorMsg]     = useState('');
  const [resendStatus, setResendStatus] = useState('idle');
  const [cooldown,     setCooldown]     = useState(0);
  const [otpCountdown, setOtpCountdown] = useState(OTP_TTL_SECONDS);

  const inputRefs   = useRef([]);
  const cooldownRef = useRef(null);
  const otpTimerRef = useRef(null);

  useEffect(() => { inputRefs.current[0]?.focus(); }, []);
  useEffect(() => () => { clearInterval(cooldownRef.current); clearInterval(otpTimerRef.current); }, []);

  useEffect(() => {
    otpTimerRef.current = setInterval(() => {
      setOtpCountdown((s) => {
        if (s <= 1) { clearInterval(otpTimerRef.current); return 0; }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(otpTimerRef.current);
  }, []);

  function startCooldown() {
    setCooldown(COOLDOWN_SECONDS);
    cooldownRef.current = setInterval(() => {
      setCooldown((s) => {
        if (s <= 1) { clearInterval(cooldownRef.current); return 0; }
        return s - 1;
      });
    }, 1000);
  }

  function handleDigitInput(index, value) {
    const digit = value.replace(/\D/g, '').slice(-1);
    const next  = [...digits];
    next[index] = digit;
    setDigits(next);
    setErrorMsg('');
    setSubmitStatus('idle');
    if (digit && index < 5) inputRefs.current[index + 1]?.focus();
    if (digit && next.every((d) => d !== '')) setOtpDone(true);
    else setOtpDone(false);
  }

  function handleKeyDown(index, e) {
    if (e.key === 'Backspace') {
      if (digits[index]) {
        const next = [...digits]; next[index] = ''; setDigits(next); setOtpDone(false);
      } else if (index > 0) {
        inputRefs.current[index - 1]?.focus();
      }
      return;
    }
    if (e.key === 'ArrowLeft'  && index > 0) inputRefs.current[index - 1]?.focus();
    if (e.key === 'ArrowRight' && index < 5) inputRefs.current[index + 1]?.focus();
  }

  function handlePaste(e) {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!pasted) return;
    const next = Array(6).fill('');
    pasted.split('').forEach((d, i) => { next[i] = d; });
    setDigits(next);
    setErrorMsg('');
    setSubmitStatus('idle');
    inputRefs.current[Math.min(pasted.length - 1, 5)]?.focus();
    if (pasted.length === 6) setOtpDone(true);
  }

  async function handleReset(e) {
    e.preventDefault();
    if (submitStatus === 'loading') return;
    setSubmitStatus('loading');
    setErrorMsg('');
    try {
      await resetPassword(email, digits.join(''), newPassword);
      navigate('/login', { state: { resetSuccess: true } });
    } catch (err) {
      setErrorMsg(err.message || 'Code incorrect ou expiré.');
      setSubmitStatus('error');
    }
  }

  async function handleResend() {
    if (cooldown > 0 || resendStatus === 'loading') return;
    setResendStatus('loading');
    try {
      await forgotPassword(email);
      setResendStatus('sent');
      setDigits(Array(6).fill(''));
      setOtpDone(false);
      setErrorMsg('');
      setSubmitStatus('idle');
      startCooldown();
      clearInterval(otpTimerRef.current);
      setOtpCountdown(OTP_TTL_SECONDS);
      otpTimerRef.current = setInterval(() => {
        setOtpCountdown((s) => {
          if (s <= 1) { clearInterval(otpTimerRef.current); return 0; }
          return s - 1;
        });
      }, 1000);
      setTimeout(() => { setResendStatus('idle'); inputRefs.current[0]?.focus(); }, 3000);
    } catch {
      setResendStatus('idle');
    }
  }

  const code      = digits.join('');
  const isLoading = submitStatus === 'loading';
  const canSubmit = otpDone && newPassword.length >= 8 && !isLoading;

  return (
    <div className="space-y-6 text-center">
      <div className="flex justify-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
          <Mail className="h-8 w-8 text-primary" />
        </div>
      </div>

      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Entrez le code
        </h1>
        <p className="text-sm text-muted-foreground">
          Code envoyé à <span className="font-medium text-foreground">{email}</span>
        </p>
        {otpCountdown > 0 ? (
          <p className={cn('text-xs', otpCountdown < 60 ? 'text-red-500 font-medium' : 'text-muted-foreground')}>
            Ce code expire dans{' '}
            {otpCountdown >= 60
              ? `${Math.floor(otpCountdown / 60)} min ${otpCountdown % 60}s`
              : `${otpCountdown}s`}
          </p>
        ) : (
          <p className="text-xs text-red-500 font-medium">Code expiré — demandez un nouveau code</p>
        )}
      </div>

      {/* 6-digit OTP boxes */}
      <div className="flex justify-center gap-2" onPaste={handlePaste}>
        {digits.map((d, i) => (
          <input
            key={i}
            ref={(el) => { inputRefs.current[i] = el; }}
            type="text"
            inputMode="numeric"
            maxLength={1}
            value={d}
            onChange={(e) => handleDigitInput(i, e.target.value)}
            onKeyDown={(e) => handleKeyDown(i, e)}
            onFocus={(e) => e.target.select()}
            disabled={isLoading}
            className={cn(
              'w-11 h-14 text-center text-xl font-bold rounded-xl border-2 bg-card transition-all focus:outline-none select-none',
              submitStatus === 'error'
                ? 'border-red-400 bg-red-50/50 text-red-700'
                : d
                ? 'border-primary text-foreground'
                : 'border-border text-foreground focus:border-primary',
              isLoading && 'opacity-50 cursor-not-allowed',
            )}
          />
        ))}
      </div>

      {/* New password — shown once OTP is filled */}
      {otpDone && (
        <form onSubmit={handleReset} className="space-y-4 text-left">
          <div className="space-y-1.5">
            <Label htmlFor="newPassword">Nouveau mot de passe</Label>
            <div className="relative">
              <Input
                id="newPassword"
                type={showPwd ? 'text' : 'password'}
                placeholder="••••••••"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                minLength={8}
                className="pr-10"
                autoFocus
              />
              <button
                type="button"
                tabIndex={-1}
                onClick={() => setShowPwd((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {newPassword.length > 0 && newPassword.length < 8 && (
              <p className="text-xs text-red-500">Au moins 8 caractères requis.</p>
            )}
          </div>

          {errorMsg && (
            <div className="flex items-center gap-2 text-sm text-red-600">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {errorMsg}
            </div>
          )}

          <Button type="submit" className="w-full" size="lg" disabled={!canSubmit}>
            {isLoading ? (
              <><Loader2 className="h-4 w-4 animate-spin" /> Réinitialisation…</>
            ) : (
              'Réinitialiser'
            )}
          </Button>
        </form>
      )}

      {errorMsg && !otpDone && (
        <div className="flex items-center justify-center gap-2 text-sm text-red-600">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {errorMsg}
        </div>
      )}

      {/* Resend */}
      <button
        type="button"
        onClick={handleResend}
        disabled={cooldown > 0 || resendStatus === 'loading'}
        className="text-sm text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50 disabled:cursor-default"
      >
        {resendStatus === 'sent' ? (
          <span className="flex items-center justify-center gap-1.5 text-green-600 font-medium">
            <CheckCircle2 className="h-4 w-4" /> Code renvoyé !
          </span>
        ) : cooldown > 0 ? (
          `Renvoyer dans ${cooldown}s`
        ) : resendStatus === 'loading' ? (
          'Envoi…'
        ) : (
          'Renvoyer le code'
        )}
      </button>

      <Link to="/login">
        <Button variant="ghost" size="sm" className="w-full text-muted-foreground">
          Retour à la connexion
        </Button>
      </Link>
    </div>
  );
}

// ── Page shell ────────────────────────────────────────────────────────────────
export default function ForgotPassword() {
  const [step,  setStep]  = useState('email');
  const [email, setEmail] = useState('');

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex justify-center mb-10">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <span className="text-white font-bold text-sm">P</span>
            </div>
            <span className="text-xl font-bold text-foreground tracking-tight">
              Padel<span className="text-primary">Connect</span>
            </span>
          </Link>
        </div>

        {step === 'email' ? (
          <EmailStep onSent={(e) => { setEmail(e); setStep('reset'); }} />
        ) : (
          <ResetStep email={email} />
        )}
      </div>
    </div>
  );
}
