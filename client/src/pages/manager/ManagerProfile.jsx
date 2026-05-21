import { useState, useEffect, useRef } from 'react';
import {
  Building2, Pencil, Check, X, Upload, AlertCircle,
  MapPin, Phone, Plus, ImageIcon,
} from 'lucide-react';
import { useAuth }  from '@/App';
import { getMyClub, updateClub, uploadClubLogo, uploadClubPhoto, deleteClubPhoto } from '@/api/manager';
import { Button }   from '@/components/ui/button';
import { Input }    from '@/components/ui/input';
import { Label }    from '@/components/ui/label';
import { Badge }    from '@/components/ui/badge';
import { cn }       from '@/lib/utils';
import { AmenitiesToggle, CLUB_AMENITIES } from './ClubSetup';

// ── Logo upload ───────────────────────────────────────────────────────────────
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
      <Label className="text-sm font-medium">Logo du club</Label>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={loading}
        className="relative w-20 h-20 rounded-xl overflow-hidden border-2 border-dashed border-border hover:border-primary/50 transition-colors group"
      >
        {preview
          ? <img src={preview} alt="Logo" className="h-full w-full object-cover" />
          : <div className="h-full w-full bg-muted flex items-center justify-center"><Building2 className="h-7 w-7 text-muted-foreground" /></div>}
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          {loading ? <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Upload className="h-4 w-4 text-white" />}
        </div>
      </button>
      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={handleChange} />
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}

// ── Photo gallery (edit mode) ─────────────────────────────────────────────────
function PhotoGalleryEditor({ clubId, photos = [], onUpdate }) {
  const inputRef              = useRef(null);
  const [loading, setLoading] = useState(false);
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
    <div className="space-y-2">
      <Label className="text-sm font-medium">Photos du club</Label>
      <div className="grid grid-cols-3 gap-2">
        {photos.map((url) => (
          <div key={url} className="relative aspect-square rounded-lg overflow-hidden border border-border group">
            <img src={url} alt="" className="h-full w-full object-cover" />
            <button
              type="button"
              onClick={() => handleDelete(url)}
              disabled={deleting === url}
              className="absolute top-1 right-1 h-6 w-6 rounded-full bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
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
          className="aspect-square rounded-lg border-2 border-dashed border-border hover:border-primary/50 flex flex-col items-center justify-center gap-1 text-muted-foreground hover:text-primary transition-colors"
        >
          {loading
            ? <div className="h-5 w-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            : <><Plus className="h-5 w-5" /><span className="text-[10px] font-medium">Ajouter</span></>}
        </button>
      </div>
      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={handleAdd} />
    </div>
  );
}

// ── Club info card (read view) ────────────────────────────────────────────────
function ClubCard({ club, onEditClick }) {
  const amenityKeys = club.amenities
    ? Object.keys(club.amenities).filter((k) => club.amenities[k])
    : [];

  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-sm">
      <div className="h-24 bg-gradient-to-br from-primary/20 to-primary/5 relative">
        {club.logo_url && (
          <img src={club.logo_url} alt="" className="absolute inset-0 w-full h-full object-cover opacity-20" />
        )}
      </div>
      <div className="px-6 pb-6 -mt-8 space-y-4">
        <div className="flex items-end justify-between">
          <div className="h-16 w-16 rounded-2xl border-4 border-card overflow-hidden shadow-sm">
            {club.logo_url
              ? <img src={club.logo_url} alt="Logo" className="h-full w-full object-cover" />
              : <div className="h-full w-full flex items-center justify-center bg-primary/10"><Building2 className="h-7 w-7 text-primary" /></div>}
          </div>
          <button
            onClick={onEditClick}
            className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-primary transition-colors rounded-lg px-2 py-1.5 hover:bg-accent"
          >
            <Pencil className="h-3.5 w-3.5" />Modifier
          </button>
        </div>

        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-foreground">{club.name}</h2>
            <Badge variant={club.status === 'active' ? 'success' : 'secondary'}>
              {club.status === 'active' ? 'Actif' : 'Inactif'}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground font-mono">/{club.slug}</p>
        </div>

        {club.description && (
          <p className="text-sm text-muted-foreground leading-relaxed">{club.description}</p>
        )}

        <div className="space-y-1.5">
          {club.address && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <MapPin className="h-3.5 w-3.5 shrink-0" />{club.address}
            </div>
          )}
          {club.phone && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Phone className="h-3.5 w-3.5 shrink-0" />{club.phone}
            </div>
          )}
        </div>

        {amenityKeys.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {amenityKeys.map((k) => {
              const opt = CLUB_AMENITIES.find((a) => a.key === k);
              return (
                <span key={k} className="text-xs font-medium px-2.5 py-1 rounded-full bg-primary/10 text-primary">
                  {opt?.label ?? k}
                </span>
              );
            })}
          </div>
        )}

        {/* Photos */}
        {Array.isArray(club.photos_urls) && club.photos_urls.length > 0 && (
          <div className="grid grid-cols-3 gap-2">
            {club.photos_urls.map((url) => (
              <div key={url} className="aspect-square rounded-lg overflow-hidden border border-border">
                <img src={url} alt="" className="h-full w-full object-cover" />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Edit form ─────────────────────────────────────────────────────────────────
function EditForm({ club, onSave, onCancel }) {
  const [form, setForm] = useState({
    name:        club.name        ?? '',
    description: club.description ?? '',
    address:     club.address     ?? '',
    phone:       club.phone       ?? '',
  });
  const [amenities, setAmenities] = useState(club.amenities ?? {});
  const [localClub, setLocalClub] = useState(club);
  const [saving, setSaving]       = useState(false);
  const [error,  setError]        = useState(null);

  function set(field) { return (e) => setForm((f) => ({ ...f, [field]: e.target.value })); }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.name.trim()) { setError('Le nom est obligatoire.'); return; }
    setSaving(true); setError(null);
    try {
      const hasAmenities = Object.values(amenities).some(Boolean);
      const { club: updated } = await updateClub(club.id, {
        name:        form.name.trim(),
        description: form.description.trim() || null,
        address:     form.address.trim()     || null,
        phone:       form.phone.trim()        || null,
        amenities:   hasAmenities ? amenities : null,
      });
      onSave(updated);
    } catch (err) {
      setError(err.message || 'Erreur lors de la sauvegarde.');
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-foreground">Modifier le club</h2>
        <button type="button" onClick={onCancel} className="text-muted-foreground hover:text-foreground">
          <X className="h-4 w-4" />
        </button>
      </div>

      <LogoUpload
        clubId={club.id}
        currentUrl={localClub.logo_url}
        onUploaded={(updated) => { setLocalClub(updated); onSave(updated); }}
      />

      <PhotoGalleryEditor
        clubId={club.id}
        photos={Array.isArray(localClub.photos_urls) ? localClub.photos_urls : []}
        onUpdate={(updated) => setLocalClub(updated)}
      />

      <div className="space-y-1.5">
        <Label htmlFor="e-name">Nom du club</Label>
        <Input id="e-name" value={form.name} onChange={set('name')} autoFocus />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="e-desc">Description <span className="font-normal text-muted-foreground">(optionnel)</span></Label>
        <Input id="e-desc" placeholder="ex: Club de padel premium au cœur d'Abidjan" value={form.description} onChange={set('description')} />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="e-addr">Adresse <span className="font-normal text-muted-foreground">(optionnel)</span></Label>
        <Input id="e-addr" placeholder="ex: Cocody, Rue des Sports, Abidjan" value={form.address} onChange={set('address')} />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="e-phone">Téléphone <span className="font-normal text-muted-foreground">(optionnel)</span></Label>
        <Input id="e-phone" type="tel" placeholder="ex: +225 07 00 00 00 00" value={form.phone} onChange={set('phone')} />
      </div>

      <div className="space-y-2">
        <Label>Équipements <span className="font-normal text-muted-foreground">(optionnel)</span></Label>
        <AmenitiesToggle value={amenities} onChange={setAmenities} />
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          <AlertCircle className="h-4 w-4 shrink-0" />{error}
        </div>
      )}

      <div className="flex gap-3 pt-1">
        <Button type="submit" disabled={saving} className="flex-1">
          <Check className="h-4 w-4" />
          {saving ? 'Sauvegarde…' : 'Enregistrer'}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel}>Annuler</Button>
      </div>
    </form>
  );
}

// ── ManagerProfile page ───────────────────────────────────────────────────────
export default function ManagerProfile() {
  const { user } = useAuth();

  const [club,    setClub]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    if (!user?.organization_id) { setLoading(false); return; }
    getMyClub(user.organization_id)
      .then(({ club: c }) => setClub(c))
      .catch((err) => setError(err.message || 'Erreur de chargement.'))
      .finally(() => setLoading(false));
  }, [user?.organization_id]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-40 bg-muted animate-pulse rounded-lg" />
        <div className="h-72 bg-muted animate-pulse rounded-2xl" />
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-widest text-primary mb-1">Espace gérant</p>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Profil du club</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Informations visibles par les joueurs.</p>
        </div>
        {!editing && club && (
          <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
            <Pencil className="h-3.5 w-3.5" />Modifier
          </Button>
        )}
      </div>

      {!club ? (
        <div className="rounded-xl border border-dashed border-border bg-card p-16 text-center space-y-3">
          <Building2 className="h-10 w-10 text-muted-foreground mx-auto" />
          <p className="font-medium text-foreground">Aucun club associé</p>
        </div>
      ) : (
        <div className={cn('grid gap-6', editing ? 'lg:grid-cols-2' : 'grid-cols-1 max-w-xl')}>
          <ClubCard club={club} onEditClick={() => setEditing(true)} />
          {editing && (
            <EditForm
              club={club}
              onSave={(updated) => { setClub(updated); setEditing(false); }}
              onCancel={() => setEditing(false)}
            />
          )}
        </div>
      )}
    </div>
  );
}
