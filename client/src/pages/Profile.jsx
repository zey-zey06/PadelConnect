import { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { User, Pencil, Check, X, Upload, Sparkles, AlertCircle, Phone, ShieldAlert, LogOut, Lock, Trash2, FileText, Wallet, AtSign, Image, Globe, Menu, MessageSquare, Users, Camera, Search, BarChart2, TrendingUp, Calendar, Moon, Sun } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { setLanguage } from '@/i18n/i18n';
import { useAuth, usePlayerPanel, useDark } from '@/App';
import { getProfile, updateProfile, uploadPhoto, uploadCoverPhoto, updateUsername, getUserSessions } from '@/api/profile';
import { requestJoin } from '@/api/sessions';
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

const COVER_GRADIENT = { background: 'linear-gradient(135deg, #0f6e56, #1d9e75, #5dcaa5)' };

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

// ── ProfileCard — unified card matching the design system ─────────────────────
function ProfileCard({ profile, user, name, onEditClick, onPhotoUploaded }) {
  const coverInputRef  = useRef(null);
  const photoInputRef  = useRef(null);
  const [coverUploading, setCoverUploading] = useState(false);
  const [photoUploading, setPhotoUploading] = useState(false);

  const level      = profile?.level ?? null;
  const levelLabel = LEVEL_LABELS[level] ?? null;
  const photoUrl   = profile?.photo_url ?? null;
  const coverUrl   = profile?.cover_photo_url ?? null;
  const style      = profile?.style ?? null;
  const username   = user?.username ?? null;
  const strengths  = Array.isArray(profile?.strengths)  ? profile.strengths  : [];
  const weaknesses = Array.isArray(profile?.weaknesses) ? profile.weaknesses : [];
  const initials   = name.slice(0, 2).toUpperCase();

  async function handleCoverChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setCoverUploading(true);
    try {
      const { profile: updated } = await uploadCoverPhoto(file);
      onPhotoUploaded?.(updated);
    } catch { /* silent */ }
    finally { setCoverUploading(false); e.target.value = ''; }
  }

  async function handlePhotoChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoUploading(true);
    try {
      const { profile: updated } = await uploadPhoto(file);
      onPhotoUploaded?.(updated);
    } catch { /* silent */ }
    finally { setPhotoUploading(false); e.target.value = ''; }
  }

  return (
    // overflow-visible so the absolute avatar that hangs below the cover is not clipped
    <div className="w-full max-w-sm mx-auto rounded-xl border border-border bg-card shadow-sm select-none">

      {/* Cover — z-[1] creates a stacking context so the avatar renders above the body below */}
      <div className="h-[130px] w-full relative z-[1]">

        {/* Image / gradient — clipped to top rounded corners of the card */}
        <div
          className="absolute inset-0 overflow-hidden rounded-t-xl"
          style={coverUrl ? undefined : COVER_GRADIENT}
        >
          {coverUrl && (
            <img src={coverUrl} alt="Cover" className="h-full w-full object-cover" />
          )}
        </div>

        {/* Edit pencil — top-left */}
        <button
          onClick={onEditClick}
          className="absolute top-3 left-3 z-10 h-7 w-7 rounded-full bg-black/25 hover:bg-black/40 backdrop-blur-sm flex items-center justify-center transition-colors"
        >
          <Pencil className="h-3.5 w-3.5 text-white" />
        </button>

        {/* Camera button for cover photo — top-right */}
        <button
          onClick={() => coverInputRef.current?.click()}
          disabled={coverUploading}
          className="absolute top-3 right-3 z-10 h-7 w-7 rounded-full bg-black/25 hover:bg-black/40 backdrop-blur-sm flex items-center justify-center transition-colors disabled:opacity-60"
          aria-label="Changer la photo de couverture"
        >
          {coverUploading
            ? <div className="h-3.5 w-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            : <Camera className="h-3.5 w-3.5 text-white" />
          }
        </button>

        {/* Level badge — shifted left to clear the camera button */}
        {level && (
          <div className="absolute top-3 right-12 z-10 flex flex-col items-center bg-black/30 backdrop-blur-sm rounded-xl px-2.5 py-1.5 min-w-[44px]">
            <span className="text-xl font-black text-white leading-none">{level}</span>
            {levelLabel && (
              <span className="text-[8px] font-semibold text-white/80 uppercase tracking-wide mt-0.5 whitespace-nowrap">
                {levelLabel}
              </span>
            )}
          </div>
        )}

        {/* Avatar — absolute at bottom of cover, hanging 42px below */}
        <div className="absolute bottom-[-42px] left-4 z-10">
          {/* Relative wrapper so the camera icon can be positioned bottom-right of the circle */}
          <div className="relative h-[84px] w-[84px]">
            {/* Circle — overflow-hidden clips the avatar image */}
            <div className="h-full w-full rounded-full border-[3px] border-white bg-muted overflow-hidden flex items-center justify-center shadow-md">
              {photoUrl ? (
                <img src={photoUrl} alt={name} className="h-full w-full object-cover object-top" />
              ) : (
                <span className="text-xl font-black text-muted-foreground">{initials}</span>
              )}
            </div>
            {/* Camera button — bottom-right of avatar */}
            <button
              onClick={() => photoInputRef.current?.click()}
              disabled={photoUploading}
              className="absolute bottom-0.5 right-0.5 h-[22px] w-[22px] rounded-full bg-white border border-border shadow flex items-center justify-center hover:bg-muted transition-colors disabled:opacity-60 z-10"
              aria-label="Changer la photo de profil"
            >
              {photoUploading
                ? <div className="h-3 w-3 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                : <Camera className="h-3 w-3 text-foreground" />
              }
            </button>
          </div>
        </div>
      </div>

      {/* Body — pt-[50px] ensures content clears the overhanging avatar (42px hang + 8px gap) */}
      <div className="px-4 pb-4 pt-[50px]">

        {/* Name · username · style pill */}
        <div className="space-y-0.5 mb-3">
          {username && <p className="text-xs text-muted-foreground">@{username}</p>}
          <h2 className="text-base font-bold text-foreground">{name}</h2>
          {style && (
            <span className="inline-block text-xs font-medium px-2.5 py-0.5 rounded-full bg-[#e6f1fb] text-[#1a6fa8]">
              {style}
            </span>
          )}
        </div>

        {/* Strengths & Weaknesses */}
        {(strengths.length > 0 || weaknesses.length > 0) ? (
          <div className="space-y-3">
            {strengths.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Points forts</p>
                <div className="flex flex-wrap gap-1.5">
                  {strengths.map((s) => (
                    <span key={s} className="text-xs font-semibold px-2 py-0.5 rounded-full bg-[#e1f5ee] text-[#085041] border border-[#5dcaa5]">
                      {s}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {weaknesses.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Points faibles</p>
                <div className="flex flex-wrap gap-1.5">
                  {weaknesses.map((w) => (
                    <span key={w} className="text-xs font-semibold px-2 py-0.5 rounded-full bg-[#faeeda] text-[#633806] border border-[#ef9f27]">
                      {w}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-2">Profil non renseigné</p>
        )}
      </div>

      {/* Hidden file inputs — separate inputs for cover and profile photo */}
      <input
        ref={coverInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleCoverChange}
      />
      <input
        ref={photoInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handlePhotoChange}
      />
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
  const { t } = useTranslation();
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
        <h2 className="text-base font-semibold text-foreground">{t('profile.edit')}</h2>
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

// ── Player stats ─────────────────────────────────────────────────────────────
const LEVEL_LABELS_STATS = {
  1: 'Débutant', 2: 'Débutant +', 3: 'Intermédiaire',
  4: 'Intermédiaire +', 5: 'Confirmé', 6: 'Avancé', 7: 'Expert',
};

function PlayerStats({ bookings, level }) {
  const total     = bookings.length;
  const completed = bookings.filter((b) => b.status === 'confirmed' || b.status === 'completed').length;
  const rate      = total > 0 ? Math.round((completed / total) * 100) : 0;
  const progress  = level ? Math.round((level / 7) * 100) : 0;

  return (
    <div className="w-full max-w-sm mx-auto rounded-xl border border-border bg-card px-4 py-4 space-y-3">
      <div className="flex items-center gap-1.5">
        <BarChart2 className="h-4 w-4 text-muted-foreground" />
        <h3 className="text-sm font-semibold text-foreground">Statistiques</h3>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-lg border border-border bg-muted/20 px-3 py-2.5 text-center">
          <p className="text-xl font-bold text-foreground">{total}</p>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wide mt-0.5">Réservations</p>
        </div>
        <div className="rounded-lg border border-border bg-muted/20 px-3 py-2.5 text-center">
          <p className="text-xl font-bold text-foreground">{rate}%</p>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wide mt-0.5">Confirmées</p>
        </div>
      </div>
      {level && (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <TrendingUp className="h-3.5 w-3.5 text-primary" />
              <span className="text-xs font-semibold text-foreground">
                {LEVEL_LABELS_STATS[level] ?? `Niveau ${level}`}
              </span>
            </div>
            <span className="text-xs text-muted-foreground">Niv. {level}/7</span>
          </div>
          <div className="h-2 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
          {level < 7 && (
            <p className="text-[10px] text-muted-foreground">
              Prochain niveau : {LEVEL_LABELS_STATS[level + 1]}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// ── Availability toggle ────────────────────────────────────────────────────────
function AvailabilityToggle({ value, onChange }) {
  const [optimistic, setOptimistic] = useState(value);

  function handleToggle() {
    const next = !optimistic;
    setOptimistic(next);
    onChange(next);
  }

  return (
    <button
      type="button"
      onClick={handleToggle}
      className={cn(
        'w-full mt-3 flex items-center gap-3 rounded-xl border px-4 py-3 transition-all text-left',
        optimistic
          ? 'border-green-200 bg-green-50 hover:bg-green-100'
          : 'border-border bg-card hover:bg-muted/50',
      )}
    >
      {/* Dot indicator */}
      <span className={cn(
        'w-3 h-3 rounded-full shrink-0 transition-colors',
        optimistic ? 'bg-green-500 shadow-[0_0_6px_rgba(34,197,94,0.6)]' : 'bg-muted-foreground/30',
      )} />
      <div className="flex-1 min-w-0">
        <p className={cn('text-sm font-semibold leading-tight', optimistic ? 'text-green-800' : 'text-foreground')}>
          {optimistic ? 'Disponible pour jouer' : 'Indisponible pour jouer'}
        </p>
        <p className="text-xs text-muted-foreground mt-0.5">
          {optimistic ? 'Les autres joueurs peuvent vous inviter' : 'Tapez pour indiquer votre disponibilité'}
        </p>
      </div>
      {/* Toggle pill */}
      <div className={cn(
        'w-11 h-6 rounded-full relative shrink-0 transition-colors',
        optimistic ? 'bg-green-500' : 'bg-muted-foreground/30',
      )}>
        <span className={cn(
          'absolute top-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-all',
          optimistic ? 'left-[calc(100%-1.375rem)]' : 'left-0.5',
        )} />
      </div>
    </button>
  );
}

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
  const { t, i18n } = useTranslation();
  const current = i18n.language?.slice(0, 2) || localStorage.getItem('padelconnect_lang') || 'fr';

  function handleSelect(code) {
    setLanguage(code);
  }

  return (
    <div className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl">
      <Globe className="h-4 w-4 text-muted-foreground shrink-0" />
      <span className="text-sm text-foreground flex-1">{t('profile.language')}</span>
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
  const { t }         = useTranslation();
  const { dark, toggle: toggleDark } = useDark();

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
          <h2 className="text-base font-semibold text-foreground">{t('profile.settings')}</h2>
          <button onClick={onClose} className="rounded-lg p-1.5 hover:bg-muted transition-colors">
            <X className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>
        <div className="px-3 py-2 space-y-0.5">
          {/* Dark mode toggle */}
          <button
            onClick={toggleDark}
            className="flex items-center justify-between w-full px-3 py-2.5 rounded-xl text-sm text-foreground hover:bg-muted transition-colors"
          >
            <span className="flex items-center gap-3">
              {dark
                ? <Sun className="h-4 w-4 text-amber-400 shrink-0" />
                : <Moon className="h-4 w-4 text-muted-foreground shrink-0" />}
              {dark ? 'Mode clair' : 'Mode sombre'}
            </span>
            <span className={cn(
              'relative inline-flex h-5 w-9 shrink-0 rounded-full transition-colors duration-200',
              dark ? 'bg-primary' : 'bg-muted',
            )}>
              <span className={cn(
                'inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform duration-200 mt-0.5',
                dark ? 'translate-x-4.5' : 'translate-x-0.5',
              )} />
            </span>
          </button>

          <LanguageSelector />
          <button
            onClick={() => { onClose(); onPassword(); }}
            className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm text-foreground hover:bg-muted transition-colors text-left"
          >
            <Lock className="h-4 w-4 text-muted-foreground shrink-0" />
            {t('profile.password')}
          </button>
          <Link
            to="/privacy"
            onClick={onClose}
            className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm text-foreground hover:bg-muted transition-colors"
          >
            <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
            {t('profile.privacy')}
          </Link>
          <Link
            to="/terms"
            onClick={onClose}
            className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm text-foreground hover:bg-muted transition-colors"
          >
            <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
            Conditions d'utilisation
          </Link>
          <button
            onClick={() => { onClose(); onLogout(); }}
            className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors text-left"
          >
            <LogOut className="h-4 w-4 shrink-0" />
            {t('profile.logout')}
          </button>
          <button
            onClick={() => { onClose(); onDelete(); }}
            className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm text-red-600 hover:bg-red-50 transition-colors text-left"
          >
            <Trash2 className="h-4 w-4 shrink-0" />
            {t('profile.delete')}
          </button>
        </div>
      </div>
    </>
  );
}

// ── Friends slide panel (right-side, like PlayerProfilePanel) ────────────────
function FriendsSlidePanel({ friends, onClose }) {
  const { openPlayerPanel } = usePlayerPanel();
  const navigate            = useNavigate();
  const [visible, setVisible] = useState(false);
  const [search,  setSearch]  = useState('');

  // Animate in
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 15);
    return () => clearTimeout(t);
  }, []);

  function handleClose() {
    setVisible(false);
    setTimeout(onClose, 280);
  }

  function handleFriendClick(friendId) {
    openPlayerPanel(friendId);
    handleClose();
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return friends;
    return friends.filter((f) => {
      const name = [f.first_name, f.last_name].filter(Boolean).join(' ').toLowerCase();
      return name.includes(q) || (f.username ?? '').toLowerCase().includes(q);
    });
  }, [friends, search]);

  return (
    <>
      {/* Backdrop */}
      <div
        className={cn(
          'fixed inset-0 z-40 bg-foreground/20 backdrop-blur-sm transition-opacity duration-300',
          visible ? 'opacity-100' : 'opacity-0 pointer-events-none',
        )}
        onClick={handleClose}
      />

      {/* Slide panel */}
      <div
        className={cn(
          'fixed top-0 right-0 bottom-0 z-50 w-full max-w-sm bg-background shadow-2xl',
          'flex flex-col transform transition-transform duration-300 ease-in-out',
          visible ? 'translate-x-0' : 'translate-x-full',
        )}
      >
        {/* Header */}
        <div className="shrink-0 flex items-center justify-between px-5 py-4 border-b border-border">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-base font-semibold text-foreground">
              Mes amis ({friends.length})
            </h2>
          </div>
          <button
            onClick={handleClose}
            className="h-8 w-8 rounded-full hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Fermer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Search bar */}
        <div className="shrink-0 px-4 py-3 border-b border-border">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher un ami…"
              className="w-full rounded-lg border border-input bg-muted/30 pl-9 pr-8 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:bg-background transition-colors"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                aria-label="Effacer"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-3 text-center px-6 py-12">
              <Users className="h-10 w-10 text-muted-foreground/30" />
              <p className="text-sm font-medium text-foreground">
                {search ? 'Aucun ami trouvé' : 'Aucun ami pour le moment'}
              </p>
              {search && (
                <button onClick={() => setSearch('')} className="text-xs text-primary hover:underline">
                  Effacer la recherche
                </button>
              )}
            </div>
          ) : (
            <div className="divide-y divide-border">
              {filtered.map((f) => {
                const name     = [f.first_name, f.last_name].filter(Boolean).join(' ') || f.name || f.username || 'Joueur';
                const initials = name.slice(0, 2).toUpperCase();
                const level    = f.level ?? null;

                return (
                  <div key={f.id} className="flex items-center gap-3 px-4 py-3 hover:bg-muted/30 transition-colors">
                    {/* Avatar */}
                    <button
                      onClick={() => handleFriendClick(f.id)}
                      className="shrink-0 h-11 w-11 rounded-full overflow-hidden border border-border bg-muted flex items-center justify-center"
                      aria-label={`Voir le profil de ${name}`}
                    >
                      {f.photo_url ? (
                        <img src={f.photo_url} alt={name} className="h-full w-full object-cover" />
                      ) : (
                        <span className="text-xs font-bold text-muted-foreground">{initials}</span>
                      )}
                    </button>

                    {/* Name + meta */}
                    <button
                      onClick={() => handleFriendClick(f.id)}
                      className="flex-1 min-w-0 text-left"
                    >
                      <p className="text-sm font-medium text-foreground truncate">{name}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {f.username ? `@${f.username}` : ''}
                        {f.username && level ? ' · ' : ''}
                        {level ? (LEVEL_LABELS[level] ?? `Niveau ${level}`) : ''}
                      </p>
                    </button>

                    {/* Message */}
                    <button
                      onClick={() => { handleClose(); navigate(`/messages?to=${f.id}`); }}
                      className="shrink-0 h-8 w-8 rounded-full bg-primary/10 hover:bg-primary/20 flex items-center justify-center transition-colors"
                      aria-label={`Envoyer un message à ${name}`}
                    >
                      <MessageSquare className="h-3.5 w-3.5 text-primary" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

// ── Own upcoming sessions section ────────────────────────────────────────────
function MyUpcomingSessionCard({ session }) {
  const prefs    = session.preferences ?? {};
  const levelMin = prefs.level_min ?? null;
  const filled   = session.current_players ?? 0;
  const total    = session.max_players ?? 4;
  const spots    = total - filled;
  const d        = new Date((session.date ?? '').toString().slice(0, 10) + 'T00:00:00');
  const dateStr  = d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });

  return (
    <div className="rounded-xl border border-border bg-card px-4 py-3.5 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-semibold text-foreground capitalize truncate">{dateStr}</p>
        {session.time && (
          <span className="shrink-0 text-xs text-muted-foreground">
            {session.time.slice(0, 5).replace(':', 'h')}
          </span>
        )}
      </div>
      <div className="flex items-center gap-1.5 flex-wrap">
        {levelMin && (
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
            Nv.{levelMin}+
          </span>
        )}
        <span className={cn(
          'text-[10px] font-semibold px-2 py-0.5 rounded-full border flex items-center gap-0.5',
          spots > 0 ? 'bg-green-50 text-green-700 border-green-200' : 'bg-muted text-muted-foreground border-border',
        )}>
          <Users className="inline h-2.5 w-2.5 mr-0.5" />
          {filled}/{total} · {spots > 0 ? `${spots} place${spots > 1 ? 's' : ''}` : 'Complet'}
        </span>
      </div>
    </div>
  );
}

function MySessionsSection({ sessions, navigate }) {
  if (!sessions.length && false) return null; // always render (shows empty state + history link)
  return (
    <div className="w-full max-w-sm mx-auto space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold text-foreground">Mes sessions à venir</h3>
        </div>
        <button
          onClick={() => navigate('/history/sessions')}
          className="text-xs text-primary hover:underline font-medium"
        >
          Voir l'historique →
        </button>
      </div>

      {sessions.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card py-6 text-center space-y-1">
          <Calendar className="h-7 w-7 text-muted-foreground mx-auto" />
          <p className="text-sm text-muted-foreground">Aucune session ouverte.</p>
          <button
            onClick={() => navigate('/sessions?create=1')}
            className="text-xs text-primary hover:underline font-medium mt-1"
          >
            Créer une session
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {sessions.map((s) => <MyUpcomingSessionCard key={s.id} session={s} />)}
        </div>
      )}
    </div>
  );
}

// ── Profile page ──────────────────────────────────────────────────────────────
export default function Profile() {
  const { user, setUser, profile: ctxProfile, setProfile } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [profile,        setLocal]         = useState(ctxProfile ?? undefined);
  const [bookings,       setBookings]       = useState([]);
  const [penalties,      setPenalties]      = useState([]);
  const [friendRequests, setFriendRequests] = useState([]);
  const [friends,        setFriends]        = useState([]);
  const [mySessions,     setMySessions]     = useState([]);
  const [loading,        setLoading]        = useState(profile === undefined);
  const [error,          setError]          = useState(null);
  const [editing,        setEditing]        = useState(false);

  const [showRechargeModal,  setShowRechargeModal]  = useState(false);
  const [showPasswordModal,  setShowPasswordModal]  = useState(false);
  const [showDeleteModal,    setShowDeleteModal]     = useState(false);
  const [menuOpen,           setMenuOpen]            = useState(false);
  const [showFriendsPanel,   setShowFriendsPanel]   = useState(false);

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
        const [{ profile: p }, { bookings: b }, penResult, reqResult, friendsResult, sessResult] = await Promise.all([
          getProfile(),
          getMyBookings().catch(() => ({ bookings: [] })),
          getMyPenalties().catch(() => ({ penalties: [] })),
          getFriendRequests().catch(() => ({ requests: [] })),
          getFriends().catch(() => ({ friends: [] })),
          user?.id ? getUserSessions(user.id).catch(() => ({ sessions: [] })) : Promise.resolve({ sessions: [] }),
        ]);
        setLocal(p ?? null);
        setBookings(b ?? []);
        setPenalties(penResult.penalties ?? []);
        setFriendRequests(reqResult.requests ?? []);
        setFriends(friendsResult.friends ?? []);
        setMySessions(sessResult.sessions ?? []);
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
    <div className="space-y-6 pb-24">
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
          <ProfileCard
            profile={profile}
            user={user}
            name={name}
            onEditClick={() => setEditing(true)}
            onPhotoUploaded={(updated) => { setLocal(updated); setProfile(updated); }}
          />

          {/* Balance card + stats */}
          <div className="w-full max-w-sm mx-auto">
            <div className="rounded-xl border border-border bg-card px-5 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Wallet className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wide leading-none">{t('profile.balance')}</p>
                  <p className="text-lg font-bold text-foreground leading-tight">
                    {Number(user?.balance ?? 0).toLocaleString('fr-FR')}
                    <span className="text-xs font-normal text-muted-foreground ml-1">FCFA</span>
                  </p>
                </div>
              </div>
              <Button size="sm" variant="outline" onClick={() => setShowRechargeModal(true)}>
                {t('profile.recharge')}
              </Button>
            </div>

            {/* Stats */}
            {(bookings.length > 0 || profile?.level) && (
              <PlayerStats bookings={bookings} level={profile?.level ?? null} />
            )}

            {/* Availability toggle */}
            {user?.role === 'player' && (
              <AvailabilityToggle
                value={profile?.is_available ?? false}
                onChange={async (val) => {
                  try {
                    const { profile: updated } = await updateProfile({ is_available: val });
                    setLocal(updated);
                    setProfile(updated);
                  } catch { /* non-fatal */ }
                }}
              />
            )}

            {/* Stats row — Sessions + Amis */}
            <div className="grid grid-cols-2 gap-3 mt-3">
              <div className="bg-white rounded-xl p-4 text-center border border-border hover:bg-muted/30 transition-colors">
                <Link to="/history/bookings" className="block">
                  <span className="text-2xl font-bold text-foreground">{bookings.length}</span>
                  <p className="text-xs text-muted-foreground mt-0.5">Réservations</p>
                </Link>
              </div>
              <div
                className="bg-white rounded-xl p-4 text-center border border-border cursor-pointer hover:bg-muted/30 transition-colors"
                onClick={() => setShowFriendsPanel(true)}
              >
                <span className="text-2xl font-bold text-foreground">{friends.length}</span>
                <p className="text-xs text-muted-foreground mt-0.5">{t('profile.friends')}</p>
              </div>
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

      {/* Upcoming sessions */}
      {user?.role === 'player' && (
        <MySessionsSection sessions={mySessions} navigate={navigate} />
      )}

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

      {/* Friends slide panel */}
      {showFriendsPanel && (
        <FriendsSlidePanel friends={friends} onClose={() => setShowFriendsPanel(false)} />
      )}
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
