import { useState, useEffect, useRef } from 'react';
import {
  Building2, Pencil, Check, X, Upload, AlertCircle,
  MapPin, Phone, Mail, Camera, Star, CalendarDays,
  LayoutGrid, CalendarCheck, Plus, ImageIcon,
} from 'lucide-react';
import { useAuth } from '@/App';
import {
  getMyClub, getManagerDashboard,
  updateClub, uploadClubLogo, uploadClubCover, uploadClubPhoto, deleteClubPhoto,
} from '@/api/manager';
import { Button }   from '@/components/ui/button';
import { Input }    from '@/components/ui/input';
import { Label }    from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge }    from '@/components/ui/badge';
import { cn }       from '@/lib/utils';
import { AmenitiesToggle, CLUB_AMENITIES } from './ClubSetup';

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmtMemberSince(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
}

// ── LogoUpload ────────────────────────────────────────────────────────────────
function LogoUpload({ clubId, currentUrl, onUploaded }) {
  const inputRef              = useRef(null);
  const [preview, setPreview] = useState(currentUrl ?? null);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState(null);

  async function handleChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPreview(URL.createObjectURL(file));
    setLoading(true); setError(null);
    try { const { club } = await uploadClubLogo(clubId, file); onUploaded(club); }
    catch (err) { setError(err.message || 'Erreur upload.'); }
    finally { setLoading(false); }
  }

  return (
    <div className="space-y-2">
      <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        Logo du club
      </Label>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={loading}
        className="relative h-24 w-24 rounded-2xl overflow-hidden border-2 border-dashed border-border hover:border-primary/50 transition-colors group"
      >
        {preview
          ? <img src={preview} alt="Logo" className="h-full w-full object-cover" />
          : <div className="h-full w-full bg-muted flex flex-col items-center justify-center gap-1.5">
              <Building2 className="h-7 w-7 text-muted-foreground/60" />
              <span className="text-[10px] text-muted-foreground">Logo</span>
            </div>
        }
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-2xl">
          {loading
            ? <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            : <Upload className="h-4 w-4 text-white" />}
        </div>
      </button>
      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={handleChange} />
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}

// ── CoverUpload ───────────────────────────────────────────────────────────────
function CoverUpload({ clubId, currentUrl, onUploaded }) {
  const inputRef              = useRef(null);
  const [preview, setPreview] = useState(currentUrl ?? null);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState(null);

  async function handleChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPreview(URL.createObjectURL(file));
    setLoading(true); setError(null);
    try { const { club } = await uploadClubCover(clubId, file); onUploaded(club); }
    catch (err) { setError(err.message || 'Erreur upload.'); }
    finally { setLoading(false); }
  }

  return (
    <div className="space-y-2 flex-1">
      <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        Photo de couverture
      </Label>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={loading}
        className="relative w-full h-24 rounded-2xl overflow-hidden border-2 border-dashed border-border hover:border-primary/50 transition-colors group"
      >
        {preview
          ? <img src={preview} alt="Couverture" className="h-full w-full object-cover" />
          : <div className="h-full w-full bg-muted flex flex-col items-center justify-center gap-1.5">
              <Camera className="h-7 w-7 text-muted-foreground/60" />
              <span className="text-[10px] text-muted-foreground">Photo bannière</span>
            </div>
        }
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          {loading
            ? <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            : <Upload className="h-4 w-4 text-white" />}
        </div>
      </button>
      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={handleChange} />
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}

// ── PhotoGalleryEditor ────────────────────────────────────────────────────────
function PhotoGalleryEditor({ clubId, photos = [], onUpdate }) {
  const inputRef                = useRef(null);
  const [loading,  setLoading]  = useState(false);
  const [deleting, setDeleting] = useState(null);

  async function handleAdd(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setLoading(true);
    try { const { club } = await uploadClubPhoto(clubId, file); onUpdate(club); }
    catch { /* non-fatal */ }
    finally { setLoading(false); e.target.value = ''; }
  }

  async function handleDelete(url) {
    setDeleting(url);
    try { const { club } = await deleteClubPhoto(clubId, url); onUpdate(club); }
    catch { /* non-fatal */ }
    finally { setDeleting(null); }
  }

  return (
    <div className="space-y-3">
      <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        Galerie photos
      </Label>
      <div className="grid grid-cols-3 gap-2">
        {photos.map((url) => (
          <div key={url} className="relative aspect-video rounded-xl overflow-hidden border border-border group">
            <img src={url} alt="" className="h-full w-full object-cover" />
            <button
              type="button"
              onClick={() => handleDelete(url)}
              disabled={deleting === url}
              className="absolute top-1.5 right-1.5 h-6 w-6 rounded-full bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
            >
              {deleting === url
                ? <div className="h-3 w-3 border border-white border-t-transparent rounded-full animate-spin" />
                : <X className="h-3 w-3" />}
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={loading}
          className="aspect-video rounded-xl border-2 border-dashed border-border hover:border-primary/50 flex flex-col items-center justify-center gap-1 text-muted-foreground hover:text-primary transition-colors"
        >
          {loading
            ? <div className="h-5 w-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            : <><Plus className="h-4 w-4" /><span className="text-[10px] font-medium">Ajouter</span></>}
        </button>
      </div>
      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={handleAdd} />
    </div>
  );
}

// ── HeroSection (read-only) ───────────────────────────────────────────────────
function HeroSection({ club, onEditClick }) {
  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-card">
      {/* Cover banner */}
      <div className="relative h-52 overflow-hidden">
        {club.cover_url
          ? <img src={club.cover_url} alt="" className="absolute inset-0 w-full h-full object-cover" />
          : (
            <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-secondary/10 to-accent">
              <div className="absolute inset-0 opacity-[0.06] flex items-center justify-center">
                <Building2 className="h-40 w-40 text-primary" />
              </div>
            </div>
          )
        }
        {/* Bottom gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/10 to-transparent" />
      </div>

      {/* Logo + identity */}
      <div className="px-6 pb-6">
        <div className="flex items-end justify-between -mt-10 mb-4">
          {/* Logo */}
          <div className="h-20 w-20 rounded-2xl border-4 border-card overflow-hidden shadow-card-md bg-card flex-shrink-0">
            {club.logo_url
              ? <img src={club.logo_url} alt="Logo" className="h-full w-full object-cover" />
              : <div className="h-full w-full flex items-center justify-center bg-primary/10">
                  <Building2 className="h-8 w-8 text-primary" />
                </div>
            }
          </div>

          <button
            onClick={onEditClick}
            className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-primary transition-colors rounded-lg px-3 py-1.5 hover:bg-accent border border-transparent hover:border-border"
          >
            <Pencil className="h-3.5 w-3.5" />Modifier
          </button>
        </div>

        <div className="space-y-0.5">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-xl font-bold text-foreground">{club.name}</h2>
            <Badge variant={club.status === 'active' ? 'success' : 'secondary'} className="text-[10px]">
              {club.status === 'active' ? 'Actif' : 'Inactif'}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground font-mono">/{club.slug}</p>
        </div>
      </div>
    </div>
  );
}

// ── StatsRow ──────────────────────────────────────────────────────────────────
function StatsRow({ club, stats }) {
  const items = [
    { label: 'Terrains actifs',   value: stats?.total_venues   ?? '—', icon: LayoutGrid  },
    { label: 'Total réservations', value: stats?.bookings_total ?? '—', icon: CalendarCheck },
    { label: 'Note moyenne',      value: '4.8',                        icon: Star,         mocked: true },
    { label: 'Membre depuis',     value: fmtMemberSince(club?.created_at), icon: CalendarDays },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {items.map(({ label, value, icon: Icon, mocked }) => (
        <div key={label} className="rounded-xl border border-border bg-card p-4 space-y-2.5">
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground leading-none">
              {label}
            </p>
            <div className="h-6 w-6 rounded-lg bg-muted flex items-center justify-center">
              <Icon className="h-3 w-3 text-muted-foreground" />
            </div>
          </div>
          <p className="text-xl font-bold text-foreground leading-none">{value}</p>
          {mocked && (
            <p className="text-[9px] text-muted-foreground/50 uppercase tracking-wider">Bientôt réel</p>
          )}
        </div>
      ))}
    </div>
  );
}

// ── ContactRow ────────────────────────────────────────────────────────────────
function ContactRow({ icon: Icon, children }) {
  return (
    <div className="flex items-center gap-3 text-sm text-muted-foreground">
      <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
        <Icon className="h-3.5 w-3.5" />
      </div>
      <span>{children}</span>
    </div>
  );
}

// ── ReadView (all info sections) ──────────────────────────────────────────────
function ReadView({ club }) {
  const amenityKeys = club.amenities
    ? Object.entries(club.amenities).filter(([, v]) => v).map(([k]) => k)
    : [];
  const photos = Array.isArray(club.photos_urls) ? club.photos_urls : [];
  const hasContact = club.address || club.phone || club.email;

  return (
    <div className="space-y-4">
      {/* About + contact */}
      <div className="rounded-2xl border border-border bg-card p-6 space-y-5">
        <h3 className="text-sm font-semibold text-foreground">À propos</h3>

        {club.description
          ? <p className="text-sm text-muted-foreground leading-relaxed">{club.description}</p>
          : <p className="text-sm text-muted-foreground/40 italic">Aucune description renseignée.</p>
        }

        {hasContact && (
          <div className="space-y-2.5 pt-1">
            {club.address && <ContactRow icon={MapPin}>{club.address}</ContactRow>}
            {club.phone   && <ContactRow icon={Phone}>{club.phone}</ContactRow>}
            {club.email   && <ContactRow icon={Mail}>{club.email}</ContactRow>}
          </div>
        )}
      </div>

      {/* Amenities */}
      {amenityKeys.length > 0 && (
        <div className="rounded-2xl border border-border bg-card p-6 space-y-4">
          <h3 className="text-sm font-semibold text-foreground">Équipements</h3>
          <div className="flex flex-wrap gap-2">
            {amenityKeys.map((k) => {
              const opt = CLUB_AMENITIES.find((a) => a.key === k);
              return (
                <span
                  key={k}
                  className="text-xs font-medium px-3 py-1.5 rounded-full bg-primary/10 text-primary border border-primary/15"
                >
                  {opt?.label ?? k}
                </span>
              );
            })}
          </div>
        </div>
      )}

      {/* Gallery */}
      {photos.length > 0 && (
        <div className="rounded-2xl border border-border bg-card p-6 space-y-4">
          <h3 className="text-sm font-semibold text-foreground">Galerie photos</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {photos.map((url) => (
              <div key={url} className="aspect-video rounded-xl overflow-hidden border border-border">
                <img src={url} alt="" className="h-full w-full object-cover" />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty state when nothing filled */}
      {!club.description && !hasContact && amenityKeys.length === 0 && photos.length === 0 && (
        <div className="rounded-2xl border border-dashed border-border bg-card/50 p-10 flex flex-col items-center gap-3 text-center">
          <ImageIcon className="h-8 w-8 text-muted-foreground/40" />
          <div>
            <p className="text-sm font-medium text-foreground">Profil incomplet</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Ajoutez une description, vos coordonnées et des photos pour attirer les joueurs.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

// ── EditForm ──────────────────────────────────────────────────────────────────
function EditForm({ club, onSave, onCancel }) {
  const [form, setForm] = useState({
    name:        club.name        ?? '',
    description: club.description ?? '',
    address:     club.address     ?? '',
    phone:       club.phone       ?? '',
    email:       club.email       ?? '',
  });
  const [amenities, setAmenities] = useState(club.amenities ?? {});
  const [localClub, setLocalClub] = useState(club);
  const [saving,    setSaving]    = useState(false);
  const [error,     setError]     = useState(null);

  function set(field) { return (e) => setForm((f) => ({ ...f, [field]: e.target.value })); }

  function patchLocal(updated) {
    setLocalClub(updated);
    onSave(updated);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.name.trim()) { setError('Le nom du club est obligatoire.'); return; }
    setSaving(true); setError(null);
    try {
      const hasAmenities = Object.values(amenities).some(Boolean);
      const { club: updated } = await updateClub(club.id, {
        name:        form.name.trim(),
        description: form.description.trim() || null,
        address:     form.address.trim()     || null,
        phone:       form.phone.trim()       || null,
        email:       form.email.trim()       || null,
        amenities:   hasAmenities ? amenities : null,
      });
      onSave(updated);
    } catch (err) {
      setError(err.message || 'Erreur lors de la sauvegarde.');
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-2xl border border-border bg-card overflow-hidden shadow-card">
      {/* Header */}
      <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-border">
        <div>
          <h2 className="text-sm font-semibold text-foreground">Modifier le profil</h2>
          <p className="text-xs text-muted-foreground mt-0.5">Visible par tous les joueurs de la plateforme.</p>
        </div>
        <button type="button" onClick={onCancel}
          className="h-8 w-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="divide-y divide-border">

        {/* ── Section: Médias ───────────────────────────────────────── */}
        <div className="px-6 py-6 space-y-5">
          <p className="text-[10px] font-bold uppercase tracking-widest text-primary/70">Médias</p>

          {/* Logo + Cover side by side */}
          <div className="flex gap-4 items-start">
            <LogoUpload
              clubId={club.id}
              currentUrl={localClub.logo_url}
              onUploaded={patchLocal}
            />
            <CoverUpload
              clubId={club.id}
              currentUrl={localClub.cover_url}
              onUploaded={patchLocal}
            />
          </div>

          <PhotoGalleryEditor
            clubId={club.id}
            photos={Array.isArray(localClub.photos_urls) ? localClub.photos_urls : []}
            onUpdate={patchLocal}
          />
        </div>

        {/* ── Section: Identité ────────────────────────────────────── */}
        <div className="px-6 py-6 space-y-4">
          <p className="text-[10px] font-bold uppercase tracking-widest text-primary/70">Identité</p>

          <div className="space-y-1.5">
            <Label htmlFor="e-name">Nom du club <span className="text-red-500">*</span></Label>
            <Input id="e-name" value={form.name} onChange={set('name')} autoFocus placeholder="Ex : Elite Padel Club" />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="e-desc">
              Slogan / Description
              <span className="font-normal text-muted-foreground ml-1">(optionnel)</span>
            </Label>
            <Textarea
              id="e-desc"
              placeholder="Ex : Le club de padel premium au cœur d'Abidjan, pour tous les niveaux."
              value={form.description}
              onChange={set('description')}
              className="min-h-[80px] resize-none"
            />
          </div>
        </div>

        {/* ── Section: Contact ─────────────────────────────────────── */}
        <div className="px-6 py-6 space-y-4">
          <p className="text-[10px] font-bold uppercase tracking-widest text-primary/70">Contact</p>

          <div className="space-y-1.5">
            <Label htmlFor="e-addr">
              Adresse <span className="font-normal text-muted-foreground">(optionnel)</span>
            </Label>
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
              <Input
                id="e-addr"
                placeholder="Ex : Cocody, Rue des Sports, Abidjan"
                value={form.address}
                onChange={set('address')}
                className="pl-9"
              />
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="e-phone">
                Téléphone <span className="font-normal text-muted-foreground">(optionnel)</span>
              </Label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                <Input
                  id="e-phone"
                  type="tel"
                  placeholder="+225 07 00 00 00 00"
                  value={form.phone}
                  onChange={set('phone')}
                  className="pl-9"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="e-email">
                Email du club <span className="font-normal text-muted-foreground">(optionnel)</span>
              </Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                <Input
                  id="e-email"
                  type="email"
                  placeholder="contact@monclub.ci"
                  value={form.email}
                  onChange={set('email')}
                  className="pl-9"
                />
              </div>
            </div>
          </div>
        </div>

        {/* ── Section: Équipements ─────────────────────────────────── */}
        <div className="px-6 py-6 space-y-4">
          <p className="text-[10px] font-bold uppercase tracking-widest text-primary/70">Équipements</p>
          <AmenitiesToggle value={amenities} onChange={setAmenities} />
        </div>
      </div>

      {/* Footer */}
      <div className={cn(
        'px-6 py-4 border-t border-border bg-muted/30 flex items-center gap-3',
        error ? 'flex-col items-stretch' : '',
      )}>
        {error && (
          <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            <AlertCircle className="h-4 w-4 shrink-0" />{error}
          </div>
        )}
        <div className={cn('flex gap-3', error ? '' : 'ml-auto')}>
          <Button type="button" variant="outline" onClick={onCancel} disabled={saving}>
            Annuler
          </Button>
          <Button type="submit" disabled={saving}>
            <Check className="h-3.5 w-3.5" />
            {saving ? 'Sauvegarde…' : 'Enregistrer'}
          </Button>
        </div>
      </div>
    </form>
  );
}

// ── ManagerProfile page ───────────────────────────────────────────────────────
export default function ManagerProfile() {
  const { user } = useAuth();

  const [club,    setClub]    = useState(null);
  const [stats,   setStats]   = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    if (!user?.organization_id) { setLoading(false); return; }
    Promise.all([
      getMyClub(user.organization_id),
      getManagerDashboard(),
    ])
      .then(([{ club: c }, { stats: s }]) => { setClub(c); setStats(s); })
      .catch((err) => setError(err.message || 'Erreur de chargement.'))
      .finally(() => setLoading(false));
  }, [user?.organization_id]);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 bg-muted animate-pulse rounded-lg" />
        <div className="h-52 bg-muted animate-pulse rounded-2xl" />
        <div className="grid grid-cols-4 gap-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-20 bg-muted animate-pulse rounded-xl" />
          ))}
        </div>
        <div className="h-40 bg-muted animate-pulse rounded-2xl" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
        <AlertCircle className="h-4 w-4 shrink-0" />{error}
      </div>
    );
  }

  if (!club) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-card p-16 text-center space-y-3">
        <Building2 className="h-10 w-10 text-muted-foreground mx-auto" />
        <p className="font-medium text-foreground">Aucun club associé</p>
        <p className="text-sm text-muted-foreground">Créez votre club depuis la page de configuration.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">

      {/* Page header */}
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-widest text-primary mb-1">Espace gérant</p>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Profil du club</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Informations visibles par tous les joueurs de la plateforme.
          </p>
        </div>
        {!editing && (
          <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
            <Pencil className="h-3.5 w-3.5" />Modifier
          </Button>
        )}
      </div>

      {/* Hero card */}
      <HeroSection club={club} onEditClick={() => setEditing(true)} />

      {/* Stats */}
      <StatsRow club={club} stats={stats} />

      {/* Content: read or edit */}
      {editing
        ? <EditForm
            club={club}
            onSave={(updated) => { setClub(updated); setEditing(false); }}
            onCancel={() => setEditing(false)}
          />
        : <ReadView club={club} />
      }
    </div>
  );
}
