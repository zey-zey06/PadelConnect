import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, AlertCircle, ChevronLeft, ChevronRight, Clock, CheckCircle2 } from 'lucide-react';
import { useAuth } from '@/App';
import { createClub, addVenue } from '@/api/manager';
import { me } from '@/api/auth';
import { Button } from '@/components/ui/button';
import { Input }  from '@/components/ui/input';
import { Label }  from '@/components/ui/label';
import { cn }     from '@/lib/utils';

export const CLUB_AMENITIES = [
  { key: 'vestiaires',     label: 'Vestiaires'     },
  { key: 'douches',        label: 'Douches'        },
  { key: 'parking',        label: 'Parking'        },
  { key: 'pro_shop',       label: 'Pro shop'       },
  { key: 'restaurant',     label: 'Restaurant'     },
  { key: 'wifi',           label: 'Wifi'           },
  { key: 'boutique',       label: 'Boutique'       },
  { key: 'eclairage_nuit', label: 'Éclairage nuit' },
];

function toSlug(name) {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function AmenitiesToggle({ value = {}, onChange }) {
  function toggle(key) {
    onChange({ ...value, [key]: !value[key] });
  }
  return (
    <div className="flex flex-wrap gap-2">
      {CLUB_AMENITIES.map(({ key, label }) => (
        <button
          key={key}
          type="button"
          onClick={() => toggle(key)}
          className={cn(
            'px-3 py-1.5 rounded-lg border text-xs font-medium transition-all',
            value[key]
              ? 'bg-primary text-primary-foreground border-primary'
              : 'bg-card text-foreground/70 border-border hover:border-primary/40'
          )}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

// ── Court count picker ────────────────────────────────────────────────────────
function CourtCountPicker({ value, onChange }) {
  const PRICE_PER_COURT = 3000;
  const monthly = value * PRICE_PER_COURT;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-4 justify-center">
        <button
          type="button"
          onClick={() => onChange(Math.max(1, value - 1))}
          disabled={value <= 1}
          className="h-10 w-10 rounded-full border border-border text-foreground/70 hover:bg-accent hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed transition-all flex items-center justify-center"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>

        <div className="text-center min-w-[5rem]">
          <span className="text-4xl font-extrabold text-primary">{value}</span>
          <p className="text-xs text-muted-foreground mt-0.5">terrain{value > 1 ? 's' : ''}</p>
        </div>

        <button
          type="button"
          onClick={() => onChange(Math.min(20, value + 1))}
          disabled={value >= 20}
          className="h-10 w-10 rounded-full border border-border text-foreground/70 hover:bg-accent hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed transition-all flex items-center justify-center"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>

      {/* Pricing preview */}
      <div className="rounded-xl border border-primary/20 bg-primary/[0.03] px-4 py-3 text-center">
        <p className="text-xs text-muted-foreground">Abonnement mensuel estimé</p>
        <p className="text-lg font-bold text-primary mt-0.5">
          {value} × 3 000 FCFA = {monthly.toLocaleString('fr-FR')} FCFA/mois
        </p>
        <p className="text-[11px] text-muted-foreground mt-0.5">
          Essai gratuit 30 jours — pas de carte requise
        </p>
      </div>
    </div>
  );
}

export default function ClubSetup() {
  const { user, setUser } = useAuth();
  const navigate = useNavigate();

  const [form,        setForm]        = useState({ name: '', description: '', address: '', phone: '' });
  const [amenities,   setAmenities]   = useState({});
  const [courtsCount, setCourtsCount] = useState(2);
  const [loading,     setLoading]     = useState(false);
  const [error,       setError]       = useState(null);
  const [created,     setCreated]     = useState(null); // club object after creation

  useEffect(() => {
    if (user?.organization_id) navigate('/manager/dashboard', { replace: true });
  }, [user, navigate]);

  function set(field) {
    return (e) => setForm((f) => ({ ...f, [field]: e.target.value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.name.trim()) { setError('Le nom du club est obligatoire.'); return; }

    setLoading(true);
    setError(null);
    try {
      const hasAmenities = Object.values(amenities).some(Boolean);
      const { club } = await createClub({
        name:        form.name.trim(),
        slug:        toSlug(form.name.trim()),
        description: form.description.trim() || null,
        address:     form.address.trim()     || null,
        phone:       form.phone.trim()        || null,
        amenities:   hasAmenities ? amenities : null,
      });

      // Auto-create venues (Court 1, Court 2, …) in parallel
      if (club?.id && courtsCount > 0) {
        await Promise.allSettled(
          Array.from({ length: courtsCount }, (_, i) =>
            addVenue(club.id, { name: `Court ${i + 1}`, description: null })
          )
        );
      }

      const { user: fresh } = await me();
      setUser(fresh);
      setCreated(club);
    } catch (err) {
      setError(err.message || 'Erreur lors de la création.');
    } finally {
      setLoading(false);
    }
  }

  // ── Pending validation screen ──────────────────────────────────────────────
  if (created) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md text-center space-y-6">
          <div className="h-16 w-16 rounded-2xl bg-amber-100 flex items-center justify-center mx-auto">
            <Clock className="h-8 w-8 text-amber-600" />
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">
              En attente de validation
            </h1>
            <p className="text-sm text-muted-foreground">
              Votre club <strong>{created.name}</strong> a bien été créé et est en cours de validation par notre équipe.
            </p>
            <p className="text-sm text-muted-foreground">
              Vous recevrez un email dès qu'il sera activé, généralement sous 24h.
            </p>
          </div>
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-left space-y-2 text-sm text-amber-800">
            <p className="font-semibold flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-amber-600 shrink-0" /> Ce qui se passe ensuite
            </p>
            <ul className="space-y-1 text-amber-700 text-xs ml-6">
              <li>· Notre équipe examine votre demande</li>
              <li>· Vous recevez un email de confirmation</li>
              <li>· Votre club devient visible sur la plateforme</li>
            </ul>
          </div>
          <button
            type="button"
            onClick={() => navigate('/manager/dashboard', { replace: true })}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors underline"
          >
            Accéder au tableau de bord
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-lg space-y-8">

        <div className="text-center space-y-3">
          <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
            <Building2 className="h-7 w-7 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">Créez votre club</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Configurez votre espace gérant en quelques secondes.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="rounded-2xl border border-border bg-card shadow-sm p-8 space-y-5">
          {error && (
            <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              <AlertCircle className="h-4 w-4 shrink-0" />{error}
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="c-name">Nom du club</Label>
            <Input id="c-name" placeholder="ex: Padel Club Abidjan" value={form.name} onChange={set('name')} autoFocus />
            {form.name && (
              <p className="text-xs text-muted-foreground">
                Identifiant : <span className="font-mono text-foreground">{toSlug(form.name)}</span>
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="c-desc">Description <span className="font-normal text-muted-foreground">(optionnel)</span></Label>
            <Input id="c-desc" placeholder="ex: Club de padel premium au cœur d'Abidjan" value={form.description} onChange={set('description')} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="c-addr">Adresse <span className="font-normal text-muted-foreground">(optionnel)</span></Label>
            <Input id="c-addr" placeholder="ex: Cocody, Rue des Sports, Abidjan" value={form.address} onChange={set('address')} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="c-phone">Téléphone <span className="font-normal text-muted-foreground">(optionnel)</span></Label>
            <Input id="c-phone" type="tel" placeholder="ex: +225 07 00 00 00 00" value={form.phone} onChange={set('phone')} />
          </div>

          {/* ── Court count ─────────────────────────────────────────────── */}
          <div className="space-y-2">
            <Label>Combien de terrains avez-vous ?</Label>
            <CourtCountPicker value={courtsCount} onChange={setCourtsCount} />
            <p className="text-xs text-muted-foreground text-center">
              Les terrains seront créés automatiquement (Court 1, Court 2…)
            </p>
          </div>

          <div className="space-y-2">
            <Label>Équipements <span className="font-normal text-muted-foreground">(optionnel)</span></Label>
            <AmenitiesToggle value={amenities} onChange={setAmenities} />
          </div>

          <Button type="submit" disabled={loading} className="w-full mt-2" size="lg">
            {loading ? (
              <>
                <span className="h-4 w-4 border-2 border-primary-foreground/50 border-t-transparent rounded-full animate-spin" />
                Création…
              </>
            ) : `Créer mon club avec ${courtsCount} terrain${courtsCount > 1 ? 's' : ''}`}
          </Button>
        </form>
      </div>
    </div>
  );
}
