import { useState, useEffect, useRef } from 'react';
import { User, Pencil, Check, X, Upload, Sparkles, AlertCircle, Phone } from 'lucide-react';
import { useAuth } from '@/App';
import { getProfile, updateProfile, uploadPhoto } from '@/api/profile';
import { updateMe } from '@/api/auth';
import { getMyBookings } from '@/api/bookings';
import { Button }   from '@/components/ui/button';
import { Input }    from '@/components/ui/input';
import { Label }    from '@/components/ui/label';
import { Badge }    from '@/components/ui/badge';
import { cn }       from '@/lib/utils';

// ── Constants ─────────────────────────────────────────────────────────────────
const LEVEL_LABELS = {
  1: 'Débutant', 2: 'Débutant +', 3: 'Intermédiaire',
  4: 'Intermédiaire +', 5: 'Confirmé', 6: 'Avancé', 7: 'Expert',
};

const LEVEL_COLORS = {
  1: 'from-slate-600  to-slate-800',
  2: 'from-stone-600  to-stone-800',
  3: 'from-emerald-700 to-emerald-900',
  4: 'from-teal-700   to-teal-900',
  5: 'from-green-700  to-green-900',
  6: 'from-[#1A3D2B]  to-[#0f2318]',
  7: 'from-[#1A3D2B]  to-black',
};

// ── Tag input — comma-separated list of string badges ─────────────────────────
function TagInput({ value = [], onChange, placeholder, colorClass }) {
  const [draft, setDraft] = useState('');

  function add() {
    const trimmed = draft.trim();
    if (!trimmed || value.includes(trimmed)) { setDraft(''); return; }
    onChange([...value, trimmed]);
    setDraft('');
  }

  function remove(tag) {
    onChange(value.filter((t) => t !== tag));
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1.5">
        {value.map((tag) => (
          <span
            key={tag}
            className={cn('inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium', colorClass)}
          >
            {tag}
            <button type="button" onClick={() => remove(tag)} className="opacity-60 hover:opacity-100 ml-0.5">
              <X className="h-2.5 w-2.5" />
            </button>
          </span>
        ))}
      </div>
      <div className="flex gap-2">
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); add(); } }}
          placeholder={placeholder}
          className="h-8 text-sm"
        />
        <Button type="button" size="sm" variant="outline" onClick={add} className="h-8 px-2.5">
          <X className="h-3 w-3 rotate-45" />
        </Button>
      </div>
    </div>
  );
}

// ── Football-style player card ────────────────────────────────────────────────
function FootballCard({ profile, name, onEditClick }) {
  const level      = profile?.level ?? null;
  const levelLabel = LEVEL_LABELS[level] ?? '—';
  const gradient   = LEVEL_COLORS[level] ?? LEVEL_COLORS[6];
  const strengths  = Array.isArray(profile?.strengths)  ? profile.strengths  : [];
  const weaknesses = Array.isArray(profile?.weaknesses) ? profile.weaknesses : [];

  return (
    <div className="w-full max-w-sm mx-auto select-none">
      {/* Card body */}
      <div className={cn(
        'relative rounded-2xl overflow-hidden shadow-2xl ring-1 ring-white/10',
        `bg-gradient-to-b ${gradient}`,
      )}>

        {/* Photo + overlay */}
        <div className="relative h-72 overflow-hidden">
          {profile?.photo_url ? (
            <img
              src={profile.photo_url}
              alt={name}
              className="absolute inset-0 h-full w-full object-cover object-top"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <User className="h-24 w-24 text-white/20" />
            </div>
          )}
          {/* Gradient overlay — fades to card bg color */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />

          {/* Level badge — top-left */}
          {level && (
            <div className="absolute top-4 left-4 flex flex-col items-center leading-none">
              <span className="text-5xl font-black text-white drop-shadow-lg">{level}</span>
              <span className="text-[10px] font-bold text-white/70 uppercase tracking-widest mt-0.5">
                {levelLabel}
              </span>
            </div>
          )}

          {/* Edit button — top-right */}
          <button
            onClick={onEditClick}
            className="absolute top-4 right-4 h-8 w-8 rounded-full bg-white/15 hover:bg-white/30 backdrop-blur-sm flex items-center justify-center transition-colors"
          >
            <Pencil className="h-3.5 w-3.5 text-white" />
          </button>

          {/* Name + style — bottom of photo */}
          <div className="absolute bottom-0 left-0 right-0 px-5 pb-5">
            <p className="text-2xl font-black text-white tracking-tight uppercase drop-shadow-md">
              {name}
            </p>
            {profile?.style && (
              <p className="text-sm text-white/70 font-medium mt-0.5">{profile.style}</p>
            )}
          </div>
        </div>

        {/* Details section */}
        <div className="px-5 py-4 space-y-3 bg-white/5 backdrop-blur-sm">
          {strengths.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-[10px] font-bold uppercase tracking-widest text-white/50">Points forts</p>
              <div className="flex flex-wrap gap-1.5">
                {strengths.map((s) => (
                  <span key={s} className="text-xs font-semibold px-2 py-0.5 rounded-full bg-green-500/20 text-green-300 border border-green-500/30">
                    {s}
                  </span>
                ))}
              </div>
            </div>
          )}
          {weaknesses.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-[10px] font-bold uppercase tracking-widest text-white/50">Points faibles</p>
              <div className="flex flex-wrap gap-1.5">
                {weaknesses.map((w) => (
                  <span key={w} className="text-xs font-semibold px-2 py-0.5 rounded-full bg-orange-500/20 text-orange-300 border border-orange-500/30">
                    {w}
                  </span>
                ))}
              </div>
            </div>
          )}
          {(!strengths.length && !weaknesses.length) && (
            <p className="text-sm text-white/40 text-center py-2">Profil non renseigné</p>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Stats bar ─────────────────────────────────────────────────────────────────
function StatsBar({ bookingsCount }) {
  return (
    <div className="w-full max-w-sm mx-auto mt-4">
      <div className="rounded-xl border border-border bg-card px-5 py-3 flex items-center justify-around">
        <div className="text-center">
          <p className="text-xl font-bold text-foreground">{bookingsCount ?? '—'}</p>
          <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wide mt-0.5">Parties</p>
        </div>
        <div className="w-px h-8 bg-border" />
        <div className="text-center">
          <p className="text-xl font-bold text-foreground">
            <Sparkles className="h-5 w-5 text-primary inline-block" />
          </p>
          <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wide mt-0.5">IA activée</p>
        </div>
      </div>
    </div>
  );
}

// ── Photo upload area ─────────────────────────────────────────────────────────
function PhotoUpload({ currentUrl, onUploaded }) {
  const inputRef = useRef(null);
  const [preview, setPreview] = useState(currentUrl ?? null);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState(null);

  async function handleChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPreview(URL.createObjectURL(file));
    setLoading(true);
    setError(null);
    try {
      const { profile } = await uploadPhoto(file);
      onUploaded(profile);
    } catch (err) {
      setError(err.message || 'Erreur lors de l\'upload.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium">Photo de profil</Label>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={loading}
        className="relative w-24 h-24 rounded-full overflow-hidden border-2 border-dashed border-border hover:border-primary/50 transition-colors group"
      >
        {preview ? (
          <img src={preview} alt="Photo" className="h-full w-full object-cover" />
        ) : (
          <div className="h-full w-full bg-muted flex items-center justify-center">
            <User className="h-8 w-8 text-muted-foreground" />
          </div>
        )}
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          {loading
            ? <div className="h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            : <Upload className="h-5 w-5 text-white" />
          }
        </div>
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleChange}
      />
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}

// ── Edit form ─────────────────────────────────────────────────────────────────
function EditForm({ profile, user, onSave, onCancel, onPhotoUploaded }) {
  const [form, setForm] = useState({
    first_name:   user?.first_name   ?? '',
    last_name:    user?.last_name    ?? '',
    style:        profile?.style        ?? '',
    strengths:    Array.isArray(profile?.strengths)  ? [...profile.strengths]  : [],
    weaknesses:   Array.isArray(profile?.weaknesses) ? [...profile.weaknesses] : [],
    phone_number: profile?.phone_number ?? '',
  });
  const [localProfile, setLocalProfile] = useState(profile);
  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const [{ profile: updated }, { user: updatedUser }] = await Promise.all([
        updateProfile({
          style:        form.style        || undefined,
          strengths:    form.strengths,
          weaknesses:   form.weaknesses,
          phone_number: form.phone_number || null,
        }),
        updateMe({
          first_name: form.first_name.trim() || null,
          last_name:  form.last_name.trim()  || null,
        }),
      ]);
      onSave(updated, updatedUser);
    } catch (err) {
      setError(err.message || 'Erreur lors de la sauvegarde.');
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5 rounded-2xl border border-border bg-card p-6 shadow-sm">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-foreground">Modifier le profil</h2>
        <button type="button" onClick={onCancel} className="text-muted-foreground hover:text-foreground">
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Nom */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="first_name" className="text-sm font-medium">Prénom</Label>
          <Input
            id="first_name"
            value={form.first_name}
            onChange={(e) => setForm((f) => ({ ...f, first_name: e.target.value }))}
            placeholder="Kofi"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="last_name" className="text-sm font-medium">Nom</Label>
          <Input
            id="last_name"
            value={form.last_name}
            onChange={(e) => setForm((f) => ({ ...f, last_name: e.target.value }))}
            placeholder="Mensah"
          />
        </div>
      </div>

      {/* Photo */}
      <PhotoUpload
        currentUrl={localProfile?.photo_url}
        onUploaded={(updated) => {
          setLocalProfile(updated);
          onPhotoUploaded?.(updated);
        }}
      />

      {/* Style de jeu */}
      <div className="space-y-1.5">
        <Label htmlFor="style" className="text-sm font-medium">Style de jeu</Label>
        <Input
          id="style"
          value={form.style}
          onChange={(e) => setForm((f) => ({ ...f, style: e.target.value }))}
          placeholder="ex : Attaquant, Défenseur, Polyvalent…"
        />
      </div>

      {/* Téléphone */}
      <div className="space-y-1.5">
        <Label htmlFor="phone" className="text-sm font-medium">
          Téléphone{' '}
          <span className="font-normal text-muted-foreground">(optionnel)</span>
        </Label>
        <div className="relative">
          <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            id="phone"
            type="tel"
            value={form.phone_number}
            onChange={(e) => setForm((f) => ({ ...f, phone_number: e.target.value }))}
            placeholder="+225 07 XX XX XX XX"
            className="pl-9"
          />
        </div>
      </div>

      {/* Points forts */}
      <div className="space-y-1.5">
        <Label className="text-sm font-medium">
          Points forts
          <span className="ml-1 text-xs font-normal text-muted-foreground">— Entrée pour ajouter</span>
        </Label>
        <TagInput
          value={form.strengths}
          onChange={(v) => setForm((f) => ({ ...f, strengths: v }))}
          placeholder="ex : Smash, Service, Revers…"
          colorClass="bg-green-50 text-green-700 border border-green-200"
        />
      </div>

      {/* Points faibles */}
      <div className="space-y-1.5">
        <Label className="text-sm font-medium">
          Points faibles
          <span className="ml-1 text-xs font-normal text-muted-foreground">— Entrée pour ajouter</span>
        </Label>
        <TagInput
          value={form.weaknesses}
          onChange={(v) => setForm((f) => ({ ...f, weaknesses: v }))}
          placeholder="ex : Endurance, Défense, Filet…"
          colorClass="bg-orange-50 text-orange-700 border border-orange-200"
        />
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      <div className="flex gap-3 pt-1">
        <Button type="submit" disabled={saving} className="flex-1">
          <Check className="h-4 w-4" />
          {saving ? 'Sauvegarde…' : 'Enregistrer'}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel}>
          Annuler
        </Button>
      </div>
    </form>
  );
}

// ── Profile page ──────────────────────────────────────────────────────────────
export default function Profile() {
  const { user, setUser, profile: ctxProfile, setProfile } = useAuth();

  const [profile,  setLocal]  = useState(ctxProfile ?? undefined);
  const [bookings, setBookings] = useState([]);
  const [loading,  setLoading] = useState(profile === undefined);
  const [error,    setError]   = useState(null);
  const [editing,  setEditing] = useState(false);

  const name =
    (user?.first_name && user?.last_name)
      ? `${user.first_name} ${user.last_name}`
      : user?.email?.split('@')[0] ?? 'Joueur';

  useEffect(() => {
    async function load() {
      try {
        const [{ profile: p }, { bookings: b }] = await Promise.all([
          getProfile(),
          getMyBookings().catch(() => ({ bookings: [] })),
        ]);
        setLocal(p ?? null);
        setBookings(b ?? []);
      } catch (err) {
        setError(err.message || 'Erreur de chargement.');
      } finally {
        setLoading(false);
      }
    }
    // Only fetch if we don't already have profile data from context
    if (profile === undefined) {
      load();
    } else {
      getMyBookings()
        .then(({ bookings: b }) => setBookings(b ?? []))
        .catch(() => {});
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function handleSave(updated, updatedUser) {
    setLocal(updated);
    setProfile(updated);
    if (updatedUser) setUser((prev) => ({ ...prev, ...updatedUser }));
    setEditing(false);
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-40 bg-muted animate-pulse rounded-lg" />
        <div className="w-full max-w-sm mx-auto h-96 bg-muted animate-pulse rounded-2xl" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
        <AlertCircle className="h-4 w-4 shrink-0" />
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Mon Profil</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {LEVEL_LABELS[profile?.level] ?? 'Profil non configuré'}
          </p>
        </div>
        {!editing && (
          <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
            <Pencil className="h-3.5 w-3.5" />
            Modifier
          </Button>
        )}
      </div>

      {/* Two-column layout on larger screens */}
      <div className={cn(
        'grid gap-6',
        editing ? 'lg:grid-cols-2' : 'grid-cols-1',
      )}>
        {/* Left: player card */}
        <div className="space-y-4">
          <FootballCard
            profile={profile}
            name={name}
            onEditClick={() => setEditing(true)}
          />
          <StatsBar bookingsCount={bookings.length} />
        </div>

        {/* Right: edit form (only when editing) */}
        {editing && (
          <div className="lg:pt-0">
            <EditForm
              profile={profile}
              user={user}
              onSave={handleSave}
              onCancel={() => setEditing(false)}
              onPhotoUploaded={(updated) => {
                setLocal(updated);
                setProfile(updated);
              }}
            />
          </div>
        )}
      </div>

      {/* Empty state prompt */}
      {!profile && !editing && (
        <div className="w-full max-w-sm mx-auto">
          <div className="rounded-xl border border-dashed border-primary/30 bg-primary/5 p-5 text-center space-y-3">
            <Sparkles className="h-6 w-6 text-primary mx-auto" />
            <p className="text-sm font-medium text-foreground">
              Votre profil joueur est vide
            </p>
            <p className="text-xs text-muted-foreground">
              Utilisez la génération IA dans la configuration pour créer votre profil automatiquement.
            </p>
            <Button size="sm" onClick={() => setEditing(true)}>
              Remplir manuellement
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
