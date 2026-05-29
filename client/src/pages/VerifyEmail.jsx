import { useState, useEffect, useRef } from 'react';
import { useSearchParams, useLocation, Link } from 'react-router-dom';
import { verifyEmail, verifyOtp, resendVerification } from '@/api/auth';
import { Button } from '@/components/ui/button';
import { CheckCircle2, AlertCircle, Mail, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

// ── Token verification state (legacy link fallback) ───────────────────────────
function VerifyingToken({ token }) {
  const [status, setStatus] = useState('loading');
  const [message, setMessage] = useState('');
  const [userEmail, setUserEmail] = useState('');

  useEffect(() => {
    verifyEmail(token)
      .then((data) => {
        setUserEmail(data.user?.email ?? '');
        setStatus('success');
      })
      .catch((err) => {
        setMessage(err.message || 'Lien invalide ou expiré.');
        setStatus('error');
      });
  }, [token]);

  if (status === 'loading') {
    return (
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="h-10 w-10 text-primary animate-spin" />
        <p className="text-sm text-muted-foreground">Vérification en cours…</p>
      </div>
    );
  }

  if (status === 'success') {
    return (
      <div className="space-y-6 text-center">
        <div className="flex justify-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
            <CheckCircle2 className="h-8 w-8 text-green-600" />
          </div>
        </div>
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Email vérifié !</h1>
          {userEmail && <p className="text-sm text-muted-foreground">{userEmail}</p>}
          <p className="text-sm text-muted-foreground mt-2">
            Votre compte est actif. Connectez-vous pour commencer.
          </p>
        </div>
        <Link to="/login">
          <Button size="lg" className="w-full">Se connecter</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 text-center">
      <div className="flex justify-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
          <AlertCircle className="h-8 w-8 text-red-600" />
        </div>
      </div>
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Lien invalide</h1>
        <p className="text-sm text-muted-foreground">{message}</p>
      </div>
      <div className="space-y-3">
        <Link to="/signup">
          <Button size="lg" className="w-full">Créer un nouveau compte</Button>
        </Link>
        <Link to="/login">
          <Button variant="outline" size="lg" className="w-full">Se connecter</Button>
        </Link>
      </div>
    </div>
  );
}

// ── OTP input — "check your email" state ─────────────────────────────────────
const COOLDOWN_SECONDS = 60;

function CheckEmail({ email }) {
  const [digits,       setDigits]       = useState(Array(6).fill(''));
  const [submitStatus, setSubmitStatus] = useState('idle'); // idle | loading | error
  const [errorMsg,     setErrorMsg]     = useState('');
  const [resendStatus, setResendStatus] = useState('idle'); // idle | loading | sent
  const [cooldown,     setCooldown]     = useState(0);
  const inputRefs   = useRef([]);
  const cooldownRef = useRef(null);

  // Focus first input on mount
  useEffect(() => { inputRefs.current[0]?.focus(); }, []);
  // Cleanup cooldown interval
  useEffect(() => () => clearInterval(cooldownRef.current), []);

  function startCooldown() {
    setCooldown(COOLDOWN_SECONDS);
    cooldownRef.current = setInterval(() => {
      setCooldown((s) => {
        if (s <= 1) { clearInterval(cooldownRef.current); return 0; }
        return s - 1;
      });
    }, 1000);
  }

  async function submitCode(codeStr) {
    if (submitStatus === 'loading') return;
    setSubmitStatus('loading');
    setErrorMsg('');
    try {
      await verifyOtp(email, codeStr);
      // JWT cookie set by backend — force full reload so auth context reinitialises
      window.location.replace('/sessions');
    } catch (err) {
      setErrorMsg(err.message || 'Code incorrect.');
      setSubmitStatus('error');
      if (err.message?.toLowerCase().includes('expiré')) {
        setDigits(Array(6).fill(''));
        setTimeout(() => inputRefs.current[0]?.focus(), 50);
      }
    }
  }

  function handleDigitInput(index, value) {
    const digit = value.replace(/\D/g, '').slice(-1);
    const next = [...digits];
    next[index] = digit;
    setDigits(next);
    if (submitStatus === 'error') { setSubmitStatus('idle'); setErrorMsg(''); }
    if (digit && index < 5) inputRefs.current[index + 1]?.focus();
    if (digit && next.every((d) => d !== '')) submitCode(next.join(''));
  }

  function handleKeyDown(index, e) {
    if (e.key === 'Backspace') {
      if (digits[index]) {
        const next = [...digits]; next[index] = ''; setDigits(next);
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
    inputRefs.current[Math.min(pasted.length, 5)]?.focus();
    if (pasted.length === 6) submitCode(pasted);
  }

  async function handleResend() {
    if (cooldown > 0 || resendStatus === 'loading' || !email) return;
    setResendStatus('loading');
    try {
      await resendVerification(email);
      setResendStatus('sent');
      setDigits(Array(6).fill(''));
      setErrorMsg('');
      setSubmitStatus('idle');
      startCooldown();
      setTimeout(() => {
        setResendStatus('idle');
        inputRefs.current[0]?.focus();
      }, 3000);
    } catch {
      setResendStatus('idle');
    }
  }

  const code = digits.join('');
  const isLoading = submitStatus === 'loading';

  return (
    <div className="space-y-6 text-center">

      {/* Icon */}
      <div className="flex justify-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
          <Mail className="h-8 w-8 text-primary" />
        </div>
      </div>

      {/* Heading */}
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Entrez le code
        </h1>
        {email ? (
          <p className="text-sm text-muted-foreground">
            Code envoyé à{' '}
            <span className="font-medium text-foreground">{email}</span>
          </p>
        ) : (
          <p className="text-sm text-muted-foreground">
            Un code à 6 chiffres a été envoyé à votre adresse email.
          </p>
        )}
        <p className="text-xs text-muted-foreground">Ce code expire dans 10 minutes.</p>
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

      {/* Error message */}
      {errorMsg && (
        <div className="flex items-center justify-center gap-2 text-sm text-red-600">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {errorMsg}
        </div>
      )}

      {/* Verify button */}
      <Button
        size="lg"
        className="w-full"
        onClick={() => submitCode(code)}
        disabled={code.length < 6 || isLoading}
      >
        {isLoading ? (
          <><Loader2 className="h-4 w-4 animate-spin" /> Vérification…</>
        ) : (
          'Vérifier'
        )}
      </Button>

      {/* Resend link */}
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
        <Button variant="ghost" size="sm" className="text-muted-foreground w-full">
          Retour à la connexion
        </Button>
      </Link>
    </div>
  );
}

// ── Page shell ────────────────────────────────────────────────────────────────
export default function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const location = useLocation();

  const token = searchParams.get('token');
  const email = location.state?.email ?? '';

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

        {token ? <VerifyingToken token={token} /> : <CheckEmail email={email} />}
      </div>
    </div>
  );
}
