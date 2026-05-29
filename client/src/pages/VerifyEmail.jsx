import { useState, useEffect, useRef } from 'react';
import { useSearchParams, useLocation, Link } from 'react-router-dom';
import { verifyEmail, resendVerification } from '@/api/auth';
import { Button } from '@/components/ui/button';
import { CheckCircle2, AlertCircle, Mail, Loader2 } from 'lucide-react';

// ── Token verification state ──────────────────────────────────────────────────
function VerifyingToken({ token }) {
  const [status, setStatus] = useState('loading'); // loading | success | error
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
          {userEmail && (
            <p className="text-sm text-muted-foreground">{userEmail}</p>
          )}
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

const COOLDOWN_SECONDS = 60;

// ── "Check your email" waiting state ─────────────────────────────────────────
function CheckEmail({ email }) {
  const [resendStatus, setResendStatus] = useState('idle'); // idle | loading | sent | error
  const [cooldown,     setCooldown]     = useState(0);
  const intervalRef = useRef(null);

  function startCooldown() {
    setCooldown(COOLDOWN_SECONDS);
    intervalRef.current = setInterval(() => {
      setCooldown((s) => {
        if (s <= 1) { clearInterval(intervalRef.current); return 0; }
        return s - 1;
      });
    }, 1000);
  }

  useEffect(() => () => clearInterval(intervalRef.current), []);

  async function handleResend() {
    if (!email || resendStatus === 'loading' || cooldown > 0) return;
    setResendStatus('loading');
    try {
      await resendVerification(email);
      setResendStatus('sent');
      startCooldown();
      setTimeout(() => setResendStatus('idle'), 3000);
    } catch {
      setResendStatus('error');
      setTimeout(() => setResendStatus('idle'), 3000);
    }
  }

  const btnDisabled = resendStatus === 'loading' || cooldown > 0;
  const btnLabel =
    resendStatus === 'loading' ? 'Envoi…' :
    resendStatus === 'sent'    ? 'Email renvoyé ✓' :
    cooldown > 0               ? `Renvoyer dans ${cooldown}s` :
    'Renvoyer l\'email';

  return (
    <div className="space-y-6 text-center">
      <div className="flex justify-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
          <Mail className="h-8 w-8 text-primary" />
        </div>
      </div>
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Vérifiez votre email
        </h1>
        {email ? (
          <p className="text-sm text-muted-foreground">
            Un lien de confirmation a été envoyé à{' '}
            <span className="font-medium text-foreground">{email}</span>.
          </p>
        ) : (
          <p className="text-sm text-muted-foreground">
            Un lien de confirmation a été envoyé à votre adresse email.
          </p>
        )}
        <p className="text-sm text-muted-foreground">
          Cliquez sur le lien pour activer votre compte. Le lien expire dans 24 heures.
        </p>
      </div>

      <div className="rounded-xl border border-border bg-card p-4 text-left space-y-2">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          Vous ne trouvez pas l'email ?
        </p>
        <ul className="text-sm text-muted-foreground space-y-1">
          <li>· Vérifiez votre dossier spam ou courrier indésirable.</li>
          <li>· Attendez quelques minutes — l'envoi peut prendre du temps.</li>
        </ul>
      </div>

      {/* Resend button — only shown when email is known */}
      {email && (
        <Button
          variant="outline"
          className="w-full"
          onClick={handleResend}
          disabled={btnDisabled}
        >
          {resendStatus === 'loading' && (
            <Loader2 className="h-4 w-4 animate-spin" />
          )}
          {resendStatus === 'sent' && (
            <CheckCircle2 className="h-4 w-4 text-green-600" />
          )}
          <span className={resendStatus === 'sent' ? 'text-green-600' : ''}>{btnLabel}</span>
        </Button>
      )}

      <Link to="/login">
        <Button variant="outline" className="w-full">Retour à la connexion</Button>
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
