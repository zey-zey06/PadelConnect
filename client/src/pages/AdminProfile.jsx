import { useState } from 'react';
import { ShieldCheck, Mail, Lock, Eye, EyeOff, CheckCircle2, AlertCircle } from 'lucide-react';
import { useAuth } from '@/App';
import { changePassword } from '@/api/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function AdminProfile() {
  const { user } = useAuth();

  const [form, setForm] = useState({
    current_password: '',
    new_password:     '',
    confirm_password: '',
  });
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew,     setShowNew]     = useState(false);
  const [saving,      setSaving]      = useState(false);
  const [success,     setSuccess]     = useState(false);
  const [error,       setError]       = useState(null);

  function handleChange(e) {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
    setError(null);
    setSuccess(false);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (form.new_password !== form.confirm_password) {
      setError('Les nouveaux mots de passe ne correspondent pas.');
      return;
    }
    if (form.new_password.length < 8) {
      setError('Le nouveau mot de passe doit faire au moins 8 caractères.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await changePassword({
        current_password: form.current_password,
        new_password:     form.new_password,
      });
      setSuccess(true);
      setForm({ current_password: '', new_password: '', confirm_password: '' });
    } catch (err) {
      setError(err.message || 'Erreur lors du changement de mot de passe.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-8 max-w-lg">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
          <ShieldCheck className="h-5 w-5 text-amber-600" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-slate-800 tracking-tight">Paramètres du compte</h1>
          <p className="text-xs text-slate-400 mt-0.5">Super administrateur</p>
        </div>
      </div>

      {/* Email (read-only) */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-3 shadow-sm">
        <div className="flex items-center gap-2">
          <Mail className="h-4 w-4 text-slate-400" />
          <h2 className="text-sm font-semibold text-slate-700">Adresse email</h2>
        </div>
        <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-600 select-all">
          {user?.email ?? '—'}
        </div>
        <p className="text-xs text-slate-400">L'email ne peut pas être modifié.</p>
      </div>

      {/* Change password */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-4 shadow-sm">
        <div className="flex items-center gap-2">
          <Lock className="h-4 w-4 text-slate-400" />
          <h2 className="text-sm font-semibold text-slate-700">Changer le mot de passe</h2>
        </div>

        {success && (
          <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-sm text-emerald-700">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            Mot de passe mis à jour avec succès.
          </div>
        )}
        {error && (
          <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Current password */}
          <div className="space-y-1.5">
            <Label htmlFor="current_password" className="text-sm font-medium text-slate-700">
              Mot de passe actuel
            </Label>
            <div className="relative">
              <Input
                id="current_password"
                name="current_password"
                type={showCurrent ? 'text' : 'password'}
                value={form.current_password}
                onChange={handleChange}
                placeholder="••••••••"
                autoComplete="current-password"
                required
              />
              <button
                type="button"
                onClick={() => setShowCurrent((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                {showCurrent ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {/* New password */}
          <div className="space-y-1.5">
            <Label htmlFor="new_password" className="text-sm font-medium text-slate-700">
              Nouveau mot de passe
            </Label>
            <div className="relative">
              <Input
                id="new_password"
                name="new_password"
                type={showNew ? 'text' : 'password'}
                value={form.new_password}
                onChange={handleChange}
                placeholder="8 caractères minimum"
                autoComplete="new-password"
                required
                minLength={8}
              />
              <button
                type="button"
                onClick={() => setShowNew((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {/* Confirm password */}
          <div className="space-y-1.5">
            <Label htmlFor="confirm_password" className="text-sm font-medium text-slate-700">
              Confirmer le nouveau mot de passe
            </Label>
            <Input
              id="confirm_password"
              name="confirm_password"
              type="password"
              value={form.confirm_password}
              onChange={handleChange}
              placeholder="••••••••"
              autoComplete="new-password"
              required
            />
          </div>

          <Button
            type="submit"
            disabled={saving || !form.current_password || !form.new_password || !form.confirm_password}
            className="w-full bg-amber-500 hover:bg-amber-600 text-white"
          >
            {saving ? (
              <>
                <span className="w-4 h-4 border-2 border-white/50 border-t-transparent rounded-full animate-spin mr-2" />
                Enregistrement…
              </>
            ) : (
              'Changer le mot de passe'
            )}
          </Button>
        </form>
      </div>
    </div>
  );
}
