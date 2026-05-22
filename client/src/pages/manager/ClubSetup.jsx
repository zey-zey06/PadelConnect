import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, AlertCircle } from 'lucide-react';
import { useAuth } from '@/App';
import { createClub } from '@/api/manager';
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

export default function ClubSetup() {
  const { user, setUser } = useAuth();
  const navigate = useNavigate();

  const [form,      setForm]      = useState({ name: '', description: '', address: '', phone: '' });
  const [amenities, setAmenities] = useState({});
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState(null);

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
      await createClub({
        name:        form.name.trim(),
        slug:        toSlug(form.name.trim()),
        description: form.description.trim() || null,
        address:     form.address.trim()     || null,
        phone:       form.phone.trim()        || null,
        amenities:   hasAmenities ? amenities : null,
      });
      const { user: fresh } = await me();
      setUser(fresh);
      navigate('/manager/dashboard', { replace: true });
    } catch (err) {
      setError(err.message || 'Erreur lors de la création.');
    } finally {
      setLoading(false);
    }
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
            ) : 'Créer mon club'}
          </Button>
        </form>
      </div>
    </div>
  );
}
