import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/App';
import { joinTeam } from '@/api/teams';
import { Button } from '@/components/ui/button';
import { CheckCircle2, AlertCircle, Loader2, Trophy } from 'lucide-react';

export default function JoinTeam() {
  const { token } = useParams();
  const navigate  = useNavigate();
  const { user }  = useAuth();

  const [status, setStatus] = useState('loading'); // loading | success | error
  const [team,   setTeam]   = useState(null);
  const [error,  setError]  = useState('');

  useEffect(() => {
    if (!user) {
      // Not logged in — redirect to login, return here after
      navigate(`/login?next=${encodeURIComponent(`/team/join/${token}`)}`, { replace: true });
      return;
    }
    joinTeam(token)
      .then((data) => { setTeam(data.team); setStatus('success'); })
      .catch((err) => { setError(err.message || 'Lien invalide ou expiré.'); setStatus('error'); });
  }, [token, user]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm text-center space-y-6">

        {/* Logo */}
        <div className="flex justify-center mb-6">
          <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
            <span className="text-white font-bold">P</span>
          </div>
        </div>

        {status === 'loading' && (
          <>
            <Loader2 className="h-10 w-10 text-primary animate-spin mx-auto" />
            <p className="text-sm text-muted-foreground">Traitement de l'invitation…</p>
          </>
        )}

        {status === 'success' && (
          <>
            <div className="flex justify-center">
              <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
                <CheckCircle2 className="h-8 w-8 text-green-600" />
              </div>
            </div>
            <div>
              <h1 className="text-2xl font-semibold text-foreground">Bienvenue dans l'équipe !</h1>
              {team?.name && (
                <p className="text-sm text-muted-foreground mt-1">
                  Vous avez rejoint <strong>{team.name}</strong>.
                </p>
              )}
            </div>
            <Button className="w-full" onClick={() => navigate('/sessions')}>
              Continuer
            </Button>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="flex justify-center">
              <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center">
                <AlertCircle className="h-8 w-8 text-red-600" />
              </div>
            </div>
            <div>
              <h1 className="text-2xl font-semibold text-foreground">Lien invalide</h1>
              <p className="text-sm text-muted-foreground mt-1">{error}</p>
            </div>
            <Link to="/">
              <Button variant="outline" className="w-full">Retour à l'accueil</Button>
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
