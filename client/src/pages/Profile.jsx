import { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { User, Pencil, Check, X, Upload, Sparkles, AlertCircle, Phone, ShieldAlert, LogOut, Lock, Trash2, FileText, Wallet, AtSign, Image, Globe, Menu, MessageSquare, Users } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { setLanguage } from '@/i18n/i18n';
import { useAuth } from '@/App';
import { getProfile, updateProfile, uploadPhoto, uploadCoverPhoto, updateUsername } from '@/api/profile';
import { updateMe, logout, changePassword, deleteAccount } from '@/api/auth';
import { getMyBookings } from '@/api/bookings';
import { getMyPenalties, payPenalty } from '@/api/penalties';
import { getFriendRequests, acceptFriendRequest, refuseFriendRequest, getFriends } from '@/api/friends';
import { Button }       from '@/components/ui/button';
import { Input }        from '@/components/ui/input';
import { Label }        from '@/components/ui/label';
import { Badge }        from '@/components/ui/badge';
import { cn }           from '@/lib/utils';
import PageSkeleton     from '@/components/PageSkeleton';

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
function StatsBar({ bookingsCount, friendsCount }) {
  return (
    <div className="w-full max-w-sm mx-auto mt-4">
      <div className="rounded-xl border border-border bg-card px-5 py-3 flex items-center justify-around">
        <div className="text-center">
          <p className="text-xl font-bold text-foreground">{bookingsCount ?? '—'}</p>
          <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wide mt-0.5">Parties</p>
        </div>
        <div className="w-px h-8 bg-border" />
        <div className="text-center">
          <p className="text-xl font-bold text-foreground">{friendsCount ?? '—'}</p>
          <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wide mt-0.5">Amis</p>
        </div>
        <div className="w-px h-8 bg-border" />
        <div className="text-center">
          <p className="text-xl font-bold text-foreground">
            <Sparkles className="h-5 w-5 text-primary inline-block" />
          </p>
          <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wide mt-0.5">IA</p>
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
function CoverUpload({ currentUrl, onUploaded }) {
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
      const { profile } = await uploadCoverPhoto(file);
      onUploaded(profile);
    } catch (err) {
      setError(err.message || 'Erreur lors de l\'upload.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium">Photo de couverture</Label>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={loading}
        className="relative w-full h-24 rounded-xl overflow-hidden border-2 border-dashed border-border hover:border-primary/50 transition-colors group bg-muted"
      >
        {preview ? (
          <img src={preview} alt="Cover" className="h-full w-full object-cover" />
        ) : (
          <div className="h-full w-full flex flex-col items-center justify-center gap-1.5">
            <Image className="h-6 w-6 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">Ajouter une bannière</span>
          </div>
        )}
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          {loading
            ? <div className="h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            : <Upload className="h-5 w-5 text-white" />
          }
        </div>
      </button>
      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={handleChange} />
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}

function EditForm({ profile, user, onSave, onCancel, onPhotoUploaded }) {
  const [form, setForm] = useState({
    first_name:   user?.first_name   ?? '',
    last_name:    user?.last_name    ?? '',
    username:     user?.username     ?? '',
    bio:          profile?.bio       ?? '',
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
      const calls = [
        updateProfile({
          style:        form.style        || undefined,
          strengths:    form.strengths,
          weaknesses:   form.weaknesses,
          phone_number: form.phone_number || null,
          bio:          form.bio.trim()   || null,
        }),
        updateMe({
          first_name: form.first_name.trim() || null,
          last_name:  form.last_name.trim()  || null,
        }),
      ];
      // Only update username if it changed
      const trimmedUsername = form.username.trim().toLowerCase();
      if (trimmedUsername && trimmedUsername !== (user?.username ?? '')) {
        calls.push(updateUsername(trimmedUsername));
      }
      const [{ profile: updated }, { user: updatedUser }] = await Promise.all(calls);
      onSave(updated, { ...updatedUser, username: trimmedUsername || updatedUser.username });
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

      {/* Cover photo */}
      <CoverUpload
        currentUrl={localProfile?.cover_photo_url}
        onUploaded={(updated) => {
          setLocalProfile(updated);
          onPhotoUploaded?.(updated);
        }}
      />

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

      {/* Username */}
      <div className="space-y-1.5">
        <Label htmlFor="username" className="text-sm font-medium">
          Nom d'utilisateur
          <span className="ml-1 text-xs font-normal text-muted-foreground">(minuscules, chiffres, underscore)</span>
        </Label>
        <div className="relative">
          <AtSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            id="username"
            value={form.username}
            onChange={(e) => setForm((f) => ({ ...f, username: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '') }))}
            placeholder="kofi_mensah"
            className="pl-9"
            maxLength={30}
          />
        </div>
      </div>

      {/* Bio */}
      <div className="space-y-1.5">
        <Label htmlFor="bio" className="text-sm font-medium">
          Bio
          <span className="ml-1 text-xs font-normal text-muted-foreground">(max 150 caractères)</span>
        </Label>
        <textarea
          id="bio"
          value={form.bio}
          onChange={(e) => setForm((f) => ({ ...f, bio: e.target.value.slice(0, 150) }))}
          placeholder="Passionné de padel depuis 3 ans…"
          rows={2}
          maxLength={150}
          className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none"
        />
        <p className="text-xs text-muted-foreground text-right">{form.bio.length}/150</p>
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

// ── Friend requests section ───────────────────────────────────────────────────
function FriendRequestsSection({ requests, onAccept, onRefuse }) {
  if (!requests || requests.length === 0) return null;

  return (
    <div className="rounded-xl border border-primary/20 bg-primary/[0.03] p-4 space-y-3">
      <p className="text-sm font-semibold text-foreground">
        Demandes d&apos;amis ({requests.length})
      </p>
      <div className="space-y-2">
        {requests.map((r) => {
          const name =
            (r.first_name || r.last_name)
              ? `${r.first_name ?? ''} ${r.last_name ?? ''}`.trim()
              : r.username ?? 'Joueur';
          return (
            <div key={r.friendship_id} className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-full overflow-hidden bg-muted shrink-0 flex items-center justify-center ring-1 ring-border">
                {r.photo_url
                  ? <img src={r.photo_url} alt={name} className="h-full w-full object-cover" />
                  : <span className="text-xs font-bold text-muted-foreground">{name.slice(0, 2).toUpperCase()}</span>
                }
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{name}</p>
                {r.username && <p className="text-xs text-muted-foreground">@{r.username}</p>}
              </div>
              <div className="flex gap-1.5 shrink-0">
                <Button size="sm" className="h-7 text-xs px-3" onClick={() => onAccept(r.user_id)}>
                  Accepter
                </Button>
                <Button size="sm" variant="outline" className="h-7 text-xs px-3" onClick={() => onRefuse(r.user_id)}>
                  Refuser
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Penalties section ─────────────────────────────────────────────────────────
const PENALTY_LABELS = {
  no_show:    'No-show',
  late_cancel: 'Annulation tardive',
  club_ban:   'Ban club',
  app_ban:    'Ban application',
};

function PenaltiesSection({ penalties, onPaid }) {
  const unpaid = penalties.filter((p) => !p.paid);
  if (unpaid.length === 0) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
        <ShieldAlert className="h-4 w-4 text-red-600 shrink-0" />
        <p className="text-sm font-semibold text-red-700">
          {unpaid.length} pénalité{unpaid.length > 1 ? 's' : ''} en attente — réglez-les pour débloquer votre compte.
        </p>
      </div>

      {unpaid.map((p) => (
        <PenaltyRow key={p.id} penalty={p} onPaid={onPaid} />
      ))}
    </div>
  );
}

function PenaltyRow({ penalty, onPaid }) {
  const [paying,  setPaying]  = useState(false);
  const [payError, setPayError] = useState(null);
  const [paid,    setPaid]    = useState(false);

  async function handlePay() {
    setPaying(true);
    setPayError(null);
    try {
      await payPenalty(penalty.id);
      setPaid(true);
      onPaid?.();
    } catch (e) {
      setPayError(e.message || 'Erreur lors du paiement.');
    } finally {
      setPaying(false);
    }
  }

  if (paid) {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-green-200 bg-green-50 px-4 py-3">
        <Check className="h-4 w-4 text-green-600 shrink-0" />
        <p className="text-sm text-green-700 font-medium">Pénalité réglée — merci.</p>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-4 rounded-xl border border-red-200 bg-card px-4 py-3.5">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-foreground">
          {PENALTY_LABELS[penalty.type] ?? penalty.type}
        </p>
        <p className="text-xs text-muted-foreground mt-0.5">
          {penalty.amount > 0
            ? `${Number(penalty.amount).toLocaleString('fr-FR')} FCFA à régler`
            : 'Sans frais — action requise'}
          {penalty.created_at && ` · ${new Date(penalty.created_at).toLocaleDateString('fr-FR')}`}
        </p>
      </div>
      <div className="shrink-0 space-y-1">
        <Button
          size="sm"
          disabled={paying}
          onClick={handlePay}
          className="h-8 px-3 text-xs bg-red-600 hover:bg-red-700 text-white border-0"
        >
          {paying ? 'Paiement…' : penalty.amount > 0 ? `Payer — ${Number(penalty.amount).toLocaleString('fr-FR')} FCFA` : 'Confirmer'}
        </Button>
        {payError && <p className="text-[11px] text-red-600">{payError}</p>}
      </div>
    </div>
  );
}

// ── Recharge modal (mocked) ───────────────────────────────────────────────────
function RechargeModal({ onClose }) {
  const [selected, setSelected] = useState(null);
  const options = [
    { value: 'wave',         label: 'Wave',          emoji: '🌊', color: '#1DC8FF' },
    { value: 'orange_money', label: 'Orange Money',  emoji: '🟠', color: '#FF6600' },
    { value: 'card',         label: 'Carte bancaire', emoji: '💳', color: null },
    { value: 'agency',       label: 'En agence',      emoji: '🏢', color: null },
  ];
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-foreground/20 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full max-w-sm rounded-2xl border border-border bg-card shadow-xl p-6 space-y-5">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-foreground">Recharger mon solde</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground rounded-lg p-1 hover:bg-muted">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="grid grid-cols-2 gap-2.5">
          {options.map(({ value, label, emoji, color }) => {
            const active = selected === value;
            return (
              <button
                key={value}
                type="button"
                onClick={() => setSelected(value)}
                style={active && color ? { borderColor: color, backgroundColor: `${color}15` } : undefined}
                className={cn(
                  'flex flex-col items-center gap-1.5 rounded-xl border px-3 py-3 text-sm font-medium transition-all',
                  active && !color ? 'border-primary bg-primary/5 text-primary'
                    : !active ? 'border-border text-foreground/70 hover:border-primary/40'
                    : '',
                )}
              >
                <span className="text-2xl leading-none">{emoji}</span>
                <span style={active && color ? { color } : undefined}>{label}</span>
              </button>
            );
          })}
        </div>
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800 flex items-start gap-2">
          <span className="shrink-0">⚡</span>
          <span>La recharge de solde sera disponible très prochainement. Restez connecté !</span>
        </div>
        <Button variant="outline" onClick={onClose} className="w-full">Fermer</Button>
      </div>
    </div>
  );
}

// ── Change password modal ─────────────────────────────────────────────────────
function ChangePasswordModal({ onClose }) {
  const [form, setForm]   = useState({ current: '', next: '', confirm: '' });
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState(null);
  const [done,    setDone]    = useState(false);

  function handle(field) {
    return (e) => { setForm((f) => ({ ...f, [field]: e.target.value })); setError(null); };
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (form.next !== form.confirm) { setError('Les mots de passe ne correspondent pas.'); return; }
    if (form.next.length < 8)       { setError('Minimum 8 caractères.'); return; }
    setLoading(true); setError(null);
    try {
      await changePassword({ current_password: form.current, new_password: form.next });
      setDone(true);
    } catch (err) {
      setError(err.message || 'Erreur lors du changement de mot de passe.');
    } finally {
      setLoading(false);
    }
  }

  const inputClass = 'w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-foreground/20 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full max-w-sm rounded-2xl border border-border bg-card shadow-xl p-6 space-y-5">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-foreground">Changer le mot de passe</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground rounded-lg p-1 hover:bg-muted">
            <X className="h-4 w-4" />
          </button>
        </div>

        {done ? (
          <div className="text-center space-y-4 py-4">
            <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center mx-auto">
              <Check className="h-6 w-6 text-green-600" />
            </div>
            <p className="text-sm font-medium text-foreground">Mot de passe modifié !</p>
            <Button onClick={onClose} className="w-full">Fermer</Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                <AlertCircle className="h-4 w-4 shrink-0" />{error}
              </div>
            )}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Mot de passe actuel</label>
              <input type="password" value={form.current} onChange={handle('current')} required className={inputClass} placeholder="••••••••" />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Nouveau mot de passe</label>
              <input type="password" value={form.next} onChange={handle('next')} required className={inputClass} placeholder="8 caractères minimum" />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Confirmer le nouveau mot de passe</label>
              <input type="password" value={form.confirm} onChange={handle('confirm')} required className={inputClass} placeholder="••••••••" />
            </div>
            <div className="flex gap-3 pt-1">
              <Button type="submit" disabled={loading} className="flex-1">
                {loading ? 'Modification…' : 'Enregistrer'}
              </Button>
              <Button type="button" variant="outline" onClick={onClose}>Annuler</Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

// ── Delete account modal ──────────────────────────────────────────────────────
function DeleteAccountModal({ onClose, onDeleted }) {
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState(null);

  async function handleDelete() {
    setLoading(true); setError(null);
    try {
      await deleteAccount();
      onDeleted();
    } catch (err) {
      setError(err.message || 'Erreur lors de la suppression.');
      setLoading(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-foreground/20 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full max-w-sm rounded-2xl border border-red-200 bg-card shadow-xl p-6 space-y-5">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-red-100 flex items-center justify-center shrink-0">
            <Trash2 className="h-5 w-5 text-red-600" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-foreground">Supprimer mon compte</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Cette action est irréversible</p>
          </div>
        </div>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Votre compte, vos données et votre historique seront définitivement supprimés.
          Vos réservations en cours resteront visibles pour les clubs concernés.
        </p>
        {error && (
          <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            <AlertCircle className="h-4 w-4 shrink-0" />{error}
          </div>
        )}
        <div className="flex gap-3">
          <Button variant="outline" onClick={onClose} className="flex-1">Annuler</Button>
          <Button
            onClick={handleDelete}
            disabled={loading}
            className="flex-1 bg-red-600 hover:bg-red-700 text-white border-0"
          >
            {loading ? 'Suppression…' : 'Supprimer'}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ── Language selector ─────────────────────────────────────────────────────────
const LANGUAGES = [
  { code: 'fr', label: 'Français',  flag: '🇫🇷' },
  { code: 'en', label: 'English',   flag: '🇬🇧' },
  { code: 'ar', label: 'العربية',   flag: '🇸🇦' },
];

function LanguageSelector() {
  const { i18n } = useTranslation();
  const current = i18n.language?.slice(0, 2) || localStorage.getItem('padelconnect_lang') || 'fr';

  function handleSelect(code) {
    setLanguage(code);
  }

  return (
    <div className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl">
      <Globe className="h-4 w-4 text-muted-foreground shrink-0" />
      <span className="text-sm text-foreground flex-1">Langue</span>
      <div className="flex gap-1">
        {LANGUAGES.map(({ code, label, flag }) => (
          <button
            key={code}
            type="button"
            onClick={() => handleSelect(code)}
            title={label}
            className={cn(
              'h-8 w-8 rounded-lg text-base flex items-center justify-center transition-all',
              current === code
                ? 'bg-primary/10 ring-2 ring-primary/30 scale-110'
                : 'hover:bg-muted opacity-60 hover:opacity-100'
            )}
          >
            {flag}
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Hamburger slide-out menu ──────────────────────────────────────────────────
function HamburgerMenu({ open, onClose, onPassword, onDelete, onLogout }) {
  return (
    <>
      {/* Backdrop */}
      {open && (
        <div className="fixed inset-0 z-[70] bg-black/30 backdrop-blur-sm" onClick={onClose} />
      )}
      {/* Panel */}
      <div className={cn(
        'fixed top-0 right-0 z-[80] h-full w-72 bg-card border-l border-border shadow-2xl transition-transform duration-300 ease-out',
        open ? 'translate-x-0' : 'translate-x-full',
      )}>
        <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-border">
          <h2 className="text-base font-semibold text-foreground">Paramètres</h2>
          <button onClick={onClose} className="rounded-lg p-1.5 hover:bg-muted transition-colors">
            <X className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>
        <div className="px-3 py-2 space-y-0.5">
          <LanguageSelector />
          <button
            onClick={() => { onClose(); onPassword(); }}
            className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm text-foreground hover:bg-muted transition-colors text-left"
          >
            <Lock className="h-4 w-4 text-muted-foreground shrink-0" />
            Changer le mot de passe
          </button>
          <Link
            to="/privacy"
            onClick={onClose}
            className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm text-foreground hover:bg-muted transition-colors"
          >
            <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
            Politique de confidentialité
          </Link>
          <button
            onClick={() => { onClose(); onLogout(); }}
            className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors text-left"
          >
            <LogOut className="h-4 w-4 shrink-0" />
            Se déconnecter
          </button>
          <button
            onClick={() => { onClose(); onDelete(); }}
            className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm text-red-600 hover:bg-red-50 transition-colors text-left"
          >
            <Trash2 className="h-4 w-4 shrink-0" />
            Supprimer mon compte
          </button>
        </div>
      </div>
    </>
  );
}

// ── Friends row (horizontal avatar strip) ────────────────────────────────────
function FriendsRow({ friends, onViewAll }) {
  if (!friends.length) return null;
  return (
    <div className="w-full max-w-sm mx-auto">
      <div className="rounded-xl border border-border bg-card px-4 py-3">
        <button onClick={onViewAll} className="flex items-center gap-2 mb-2.5 group">
          <Users className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-semibold text-foreground">{friends.length} ami{friends.length > 1 ? 's' : ''}</span>
          <span className="text-xs text-primary group-hover:underline ml-auto">Voir tout</span>
        </button>
        <div className="flex gap-2.5 overflow-x-auto pb-1 scrollbar-hide">
          {friends.slice(0, 10).map((f) => (
            <Link key={f.id} to={`/player/${f.id}`} className="flex flex-col items-center shrink-0 w-14">
              <div className="h-12 w-12 rounded-full overflow-hidden border-2 border-primary/20 bg-muted">
                {f.photo_url ? (
                  <img src={f.photo_url} alt={f.name} className="h-full w-full object-cover" />
                ) : (
                  <div className="h-full w-full flex items-center justify-center">
                    <User className="h-5 w-5 text-muted-foreground" />
                  </div>
                )}
              </div>
              <span className="text-[10px] text-muted-foreground mt-1 truncate w-full text-center">
                {f.first_name || f.name?.split(' ')[0] || '?'}
              </span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Friends list modal ───────────────────────────────────────────────────────
function FriendsListModal({ friends, onClose }) {
  const navigate = useNavigate();
  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-foreground/20 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl border border-border bg-card shadow-xl max-h-[70dvh] flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
          <h2 className="text-base font-semibold text-foreground">Mes amis ({friends.length})</h2>
          <button onClick={onClose} className="rounded-lg p-1 hover:bg-muted"><X className="h-4 w-4" /></button>
        </div>
        <div className="overflow-y-auto flex-1 divide-y divide-border">
          {friends.map((f) => (
            <div key={f.id} className="flex items-center gap-3 px-5 py-3">
              <div className="h-10 w-10 rounded-full overflow-hidden bg-muted shrink-0 border border-border">
                {f.photo_url ? (
                  <img src={f.photo_url} alt={f.name} className="h-full w-full object-cover" />
                ) : (
                  <div className="h-full w-full flex items-center justify-center"><User className="h-5 w-5 text-muted-foreground" /></div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <Link to={`/player/${f.id}`} onClick={onClose} className="text-sm font-medium text-foreground hover:underline truncate block">
                  {f.name || `${f.first_name ?? ''} ${f.last_name ?? ''}`.trim() || 'Joueur'}
                </Link>
                {f.level && <p className="text-xs text-muted-foreground">{LEVEL_LABELS[f.level] ?? `Niveau ${f.level}`}</p>}
              </div>
              <button
                onClick={() => { onClose(); navigate(`/messages?to=${f.id}`); }}
                className="h-8 w-8 rounded-full bg-primary/10 hover:bg-primary/20 flex items-center justify-center transition-colors shrink-0"
              >
                <MessageSquare className="h-3.5 w-3.5 text-primary" />
              </button>
            </div>
          ))}
          {!friends.length && (
            <p className="text-sm text-muted-foreground text-center py-8">Aucun ami pour le moment</p>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Profile page ──────────────────────────────────────────────────────────────
export default function Profile() {
  const { user, setUser, profile: ctxProfile, setProfile } = useAuth();
  const navigate = useNavigate();

  const [profile,        setLocal]         = useState(ctxProfile ?? undefined);
  const [bookings,       setBookings]       = useState([]);
  const [penalties,      setPenalties]      = useState([]);
  const [friendRequests, setFriendRequests] = useState([]);
  const [friends,        setFriends]        = useState([]);
  const [loading,        setLoading]        = useState(profile === undefined);
  const [error,          setError]          = useState(null);
  const [editing,        setEditing]        = useState(false);

  const [showRechargeModal,  setShowRechargeModal]  = useState(false);
  const [showPasswordModal,  setShowPasswordModal]  = useState(false);
  const [showDeleteModal,    setShowDeleteModal]     = useState(false);
  const [menuOpen,           setMenuOpen]            = useState(false);
  const [showFriendsModal,   setShowFriendsModal]    = useState(false);

  async function handleLogout() {
    try { await logout(); } catch { /* non-fatal */ }
    setUser(null);
    navigate('/login', { replace: true });
  }

  const name =
    (user?.first_name || user?.last_name)
      ? `${user.first_name ?? ''} ${user.last_name ?? ''}`.trim()
      : user?.email?.split('@')[0] ?? 'Joueur';

  useEffect(() => {
    async function load() {
      try {
        const [{ profile: p }, { bookings: b }, penResult, reqResult, friendsResult] = await Promise.all([
          getProfile(),
          getMyBookings().catch(() => ({ bookings: [] })),
          getMyPenalties().catch(() => ({ penalties: [] })),
          getFriendRequests().catch(() => ({ requests: [] })),
          getFriends().catch(() => ({ friends: [] })),
        ]);
        setLocal(p ?? null);
        setBookings(b ?? []);
        setPenalties(penResult.penalties ?? []);
        setFriendRequests(reqResult.requests ?? []);
        setFriends(friendsResult.friends ?? []);
      } catch (err) {
        setError(err.message || 'Erreur de chargement.');
      } finally {
        setLoading(false);
      }
    }
    if (profile === undefined) {
      load();
    } else {
      Promise.allSettled([
        getMyBookings(),
        getMyPenalties(),
        getFriendRequests(),
        getFriends(),
      ]).then(([bkRes, penRes, reqRes, frRes]) => {
        if (bkRes.status  === 'fulfilled') setBookings(bkRes.value.bookings   ?? []);
        if (penRes.status === 'fulfilled') setPenalties(penRes.value.penalties ?? []);
        if (reqRes.status === 'fulfilled') setFriendRequests(reqRes.value.requests ?? []);
        if (frRes.status  === 'fulfilled') setFriends(frRes.value.friends     ?? []);
      });
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function handleSave(updated, updatedUser) {
    setLocal(updated);
    setProfile(updated);
    if (updatedUser) setUser((prev) => ({ ...prev, ...updatedUser }));
    setEditing(false);
  }

  if (loading) {
    return <PageSkeleton icon="👤" message="Préparation de votre carte joueur..." layout="profile" />;
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
        <div className="flex items-center gap-2">
          {!editing && (
            <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
              <Pencil className="h-3.5 w-3.5" />
              Modifier
            </Button>
          )}
          <button
            onClick={() => setMenuOpen(true)}
            className="h-9 w-9 rounded-xl border border-border bg-card hover:bg-muted flex items-center justify-center transition-colors"
          >
            <Menu className="h-4.5 w-4.5 text-foreground" />
          </button>
        </div>
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
          <StatsBar bookingsCount={bookings.length} friendsCount={friends.length} />

          {/* Friends row */}
          <FriendsRow friends={friends} onViewAll={() => setShowFriendsModal(true)} />

          {/* Balance card */}
          <div className="w-full max-w-sm mx-auto">
            <div className="rounded-xl border border-border bg-card px-5 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Wallet className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wide leading-none">Mon solde</p>
                  <p className="text-lg font-bold text-foreground leading-tight">
                    {Number(user?.balance ?? 0).toLocaleString('fr-FR')}
                    <span className="text-xs font-normal text-muted-foreground ml-1">FCFA</span>
                  </p>
                </div>
              </div>
              <Button size="sm" variant="outline" onClick={() => setShowRechargeModal(true)}>
                Recharger
              </Button>
            </div>
          </div>
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

      {/* Penalties */}
      <FriendRequestsSection
        requests={friendRequests}
        onAccept={async (userId) => {
          try {
            await acceptFriendRequest(userId);
            setFriendRequests((prev) => prev.filter((r) => r.user_id !== userId));
          } catch { /* silent */ }
        }}
        onRefuse={async (userId) => {
          try {
            await refuseFriendRequest(userId);
            setFriendRequests((prev) => prev.filter((r) => r.user_id !== userId));
          } catch { /* silent */ }
        }}
      />

      <PenaltiesSection
        penalties={penalties}
        onPaid={() => getMyPenalties().then((r) => setPenalties(r.penalties ?? [])).catch(() => {})}
      />

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

      {/* Hamburger menu */}
      <HamburgerMenu
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        onPassword={() => setShowPasswordModal(true)}
        onDelete={() => setShowDeleteModal(true)}
        onLogout={handleLogout}
      />

      {/* Modals */}
      {showFriendsModal && <FriendsListModal friends={friends} onClose={() => setShowFriendsModal(false)} />}
      {showRechargeModal && <RechargeModal onClose={() => setShowRechargeModal(false)} />}
      {showPasswordModal && <ChangePasswordModal onClose={() => setShowPasswordModal(false)} />}
      {showDeleteModal && (
        <DeleteAccountModal
          onClose={() => setShowDeleteModal(false)}
          onDeleted={() => {
            setUser(null);
            navigate('/login', { replace: true });
          }}
        />
      )}
    </div>
  );
}
