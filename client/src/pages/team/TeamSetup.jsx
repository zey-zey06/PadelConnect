import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/App';
import { createTeam } from '@/api/teams';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertCircle, Camera, MapPin, Users } from 'lucide-react';

const STORAGE_KEY = 'team_setup_draft';

export default function TeamSetup() {
  const navigate = useNavigate();
  const { user, setUser } = useAuth();

  // Read prefilled data from sessionStorage (set during signup step 2)
  const draft = (() => {
    try { return JSON.parse(sessionStorage.getItem(STORAGE_KEY) || '{}'); } catch { return {}; }
  })();

  const [form, setForm] = useState({
    name:        draft.name        || '',
    description: draft.description || '',
    city:        draft.city        || 'Abidjan',
  });
  const [logo,    setLogo]    = useState(draft.logo || null); // base64 data-url
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState(null);
  const fileRef = useRef(null);

  function handleChange(e) {
    setForm((p) => ({ ...p, [e.target.name]: e.target.value }));
    if (error) setError(null);
  }

  function handleLogoChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setLogo(ev.target.result);
    reader.readAsDataURL(file);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.name.trim()) { setError('Le nom de la team est requis.'); return; }
    setLoading(true);
    setError(null);
    try {
      const { team } = await createTeam({ ...form, logo_url: logo });
      sessionStorage.removeItem(STORAGE_KEY);
      // Update auth context with new team_id
      setUser((u) => ({ ...u, team_id: team.id }));
      navigate('/team/dashboard', { replace: true });
    } catch (err) {
      setError(err.message || 'Erreur lors de la création de la team.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-sm space-y-8">

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

        <div className="space-y-1 text-center">
          <div className="flex justify-center mb-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Users className="h-5 w-5 text-primary" />
            </div>
          </div>
          <h1 className="text-2xl font-semibold text-foreground tracking-tight">Créez votre team</h1>
          <p className="text-sm text-muted-foreground">
            Configurez votre équipe pour commencer à organiser des tournois.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {error && (
            <div className="flex items-start gap-2.5 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <p>{error}</p>
            </div>
          )}

          {/* Logo upload */}
          <div className="flex flex-col items-center gap-3">
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="relative w-20 h-20 rounded-2xl border-2 border-dashed border-border bg-muted hover:border-primary/50 hover:bg-primary/5 transition-all overflow-hidden flex items-center justify-center"
            >
              {logo ? (
                <img src={logo} alt="logo" className="w-full h-full object-cover" />
              ) : (
                <Camera className="h-6 w-6 text-muted-foreground" />
              )}
            </button>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleLogoChange} />
            <p className="text-xs text-muted-foreground">Logo de la team (optionnel)</p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="name">Nom de la team *</Label>
            <Input
              id="name" name="name" type="text"
              placeholder="Ex: Ivory Coast Padel Tour"
              value={form.name} onChange={handleChange} required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="description">Description courte</Label>
            <textarea
              id="description" name="description"
              placeholder="Présentez votre équipe en quelques mots…"
              value={form.description} onChange={handleChange}
              rows={3}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-none"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="city">
              <span className="flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                Ville
              </span>
            </Label>
            <Input
              id="city" name="city" type="text"
              placeholder="Abidjan"
              value={form.city} onChange={handleChange}
            />
          </div>

          <Button type="submit" className="w-full mt-2" size="lg" disabled={loading || !form.name.trim()}>
            {loading ? (
              <>
                <span className="w-4 h-4 border-2 border-primary-foreground/50 border-t-transparent rounded-full animate-spin" />
                Création…
              </>
            ) : 'Créer la team'}
          </Button>
        </form>
      </div>
    </div>
  );
}
