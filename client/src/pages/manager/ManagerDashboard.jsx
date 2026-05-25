import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Building2, MapPin, CalendarDays, TrendingUp, CalendarCheck,
  ChevronRight, AlertCircle, Plus, X, Users, UserCheck,
  ShowerHead, ParkingSquare, Wifi, Utensils, ShoppingBag, Lightbulb, Shirt,
  Trash2, CreditCard,
} from 'lucide-react';
import { useAuth } from '@/App';
import {
  getManagerDashboard, getMyClub, getMyVenues, addVenue, getVenueSlots,
  addCoachToClub, removeCoachFromClub, addBallPickerToClub, removeBallPickerFromClub,
} from '@/api/manager';
import { getClubCoaches, getClubBallPickers } from '@/api/clubs';
import { getMySubscription, getSubscriptionHistory, paySubscription } from '@/api/subscriptions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import PageSkeleton from '@/components/PageSkeleton';
import { Badge } from '@/components/ui/badge';

// ── Amenity display map ───────────────────────────────────────────────────────
const AMENITY_MAP = {
  vestiaires:     { label: 'Vestiaires',  Icon: Shirt         },
  douches:        { label: 'Douches',     Icon: ShowerHead    },
  parking:        { label: 'Parking',     Icon: ParkingSquare },
  wifi:           { label: 'Wi-Fi',       Icon: Wifi          },
  restaurant:     { label: 'Restaurant',  Icon: Utensils      },
  pro_shop:       { label: 'Pro shop',    Icon: ShoppingBag   },
  boutique:       { label: 'Boutique',    Icon: ShoppingBag   },
  eclairage_nuit: { label: 'Éclairage',   Icon: Lightbulb     },
};

// ── Stat card ─────────────────────────────────────────────────────────────────
function StatCard({ label, value, note, icon: Icon, accent }) {
  return (
    <div className={`rounded-xl border bg-card p-5 space-y-3 ${accent ? 'border-primary/20 bg-primary/[0.02]' : 'border-border'}`}>
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
        <div className={`h-8 w-8 rounded-lg flex items-center justify-center ${accent ? 'bg-primary/10' : 'bg-muted'}`}>
          <Icon className={`h-4 w-4 ${accent ? 'text-primary' : 'text-muted-foreground'}`} />
        </div>
      </div>
      <p className="text-2xl font-bold text-foreground">{value ?? '—'}</p>
      {note && <p className="text-xs text-muted-foreground">{note}</p>}
    </div>
  );
}

// ── Add venue modal ───────────────────────────────────────────────────────────
function AddVenueModal({ clubId, onClose, onCreated }) {
  const [form,    setForm]    = useState({ name: '', description: '' });
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.name.trim()) { setError('Le nom est obligatoire.'); return; }
    setLoading(true);
    setError(null);
    try {
      const { venue } = await addVenue(clubId, {
        name:        form.name.trim(),
        description: form.description.trim() || null,
      });
      onCreated(venue);
    } catch (err) {
      setError(err.message || 'Erreur lors de la création.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-foreground/20 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full max-w-md rounded-2xl border border-border bg-card shadow-xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="text-lg font-semibold text-foreground">Ajouter un terrain</h2>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground transition-colors rounded-lg p-1 hover:bg-muted"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {error && (
            <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              <AlertCircle className="h-4 w-4 shrink-0" />{error}
            </div>
          )}
          <div className="space-y-1.5">
            <Label htmlFor="v-name">Nom du terrain</Label>
            <Input
              id="v-name" autoFocus placeholder="ex: Court 1" value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="v-desc">
              Description{' '}
              <span className="font-normal text-muted-foreground">(optionnel)</span>
            </Label>
            <Input
              id="v-desc" placeholder="ex: Terrain en gazon synthétique, couvert" value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            />
          </div>
          <div className="flex gap-3 pt-1">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">Annuler</Button>
            <Button type="submit" disabled={loading} className="flex-1">
              {loading ? 'Création…' : 'Créer le terrain'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Venue card ────────────────────────────────────────────────────────────────
function VenueCard({ venue }) {
  const [weekSlots, setWeekSlots] = useState(null);

  useEffect(() => {
    getVenueSlots(venue.id)
      .then(({ slots: s }) => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const weekEnd = new Date(today);
        weekEnd.setDate(today.getDate() + 7);
        const todayStr   = today.toISOString().slice(0, 10);
        const weekEndStr = weekEnd.toISOString().slice(0, 10);
        setWeekSlots((s ?? []).filter((sl) => {
          const d = String(sl.date).slice(0, 10);
          return d >= todayStr && d < weekEndStr;
        }));
      })
      .catch(() => setWeekSlots([]));
  }, [venue.id]);

  const booked    = weekSlots?.filter((s) => s.status === 'booked').length    ?? null;
  const available = weekSlots?.filter((s) => s.status === 'available').length ?? null;

  const amenities = Object.entries(AMENITY_MAP).filter(
    ([key]) => venue.amenities?.[key] === true
  );

  return (
    <div className="rounded-xl border border-border bg-card flex flex-col overflow-hidden hover:border-primary/25 hover:shadow-md transition-all duration-200">
      <div className="h-1 w-full bg-primary/60" />

      <div className="px-5 pt-5 pb-4 flex items-start gap-3">
        <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
          <MapPin className="h-5 w-5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-foreground leading-snug">{venue.name}</p>
          <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed line-clamp-2">
            {venue.description || 'Aucune description'}
          </p>
        </div>
      </div>

      <div className="mx-5 mb-4 rounded-lg bg-muted/40 border border-border/60 px-4 py-2.5 flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <CalendarDays className="h-3.5 w-3.5 shrink-0" />
          {weekSlots === null ? (
            <span className="w-24 h-3 rounded bg-muted animate-pulse inline-block" />
          ) : (
            <span>
              <span className="font-semibold text-foreground">{weekSlots.length}</span>
              {' '}créneau{weekSlots.length !== 1 ? 'x' : ''} cette semaine
            </span>
          )}
        </div>
        {booked !== null && booked > 0 && (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-blue-50 text-blue-700 border border-blue-200">
            {booked} réservé{booked > 1 ? 's' : ''}
          </span>
        )}
        {available !== null && available > 0 && (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-green-50 text-green-700 border border-green-200">
            {available} disponible{available > 1 ? 's' : ''}
          </span>
        )}
      </div>

      {amenities.length > 0 && (
        <div className="px-5 pb-4 flex flex-wrap gap-1.5">
          {amenities.map(([key, { label, Icon }]) => (
            <span
              key={key}
              className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium text-muted-foreground bg-muted/60 border border-border/50"
            >
              <Icon className="h-3 w-3 shrink-0" />{label}
            </span>
          ))}
        </div>
      )}

      <div className="flex-1" />

      <div className="px-5 pb-5 pt-1">
        <Link to={`/manager/venues/${venue.id}/slots`} className="block">
          <Button size="sm" className="w-full gap-2">
            <CalendarDays className="h-3.5 w-3.5" />
            Gérer les créneaux
            <ChevronRight className="h-3.5 w-3.5 ml-auto" />
          </Button>
        </Link>
      </div>
    </div>
  );
}

// ── Skeleton card ─────────────────────────────────────────────────────────────
function VenueCardSkeleton() {
  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="h-1 w-full bg-muted" />
      <div className="p-5 space-y-3">
        <div className="flex items-start gap-3">
          <div className="h-10 w-10 rounded-lg bg-muted animate-pulse shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="h-4 w-32 rounded bg-muted animate-pulse" />
            <div className="h-3 w-48 rounded bg-muted animate-pulse" />
          </div>
        </div>
        <div className="h-10 rounded-lg bg-muted animate-pulse" />
        <div className="h-8 rounded-lg bg-muted animate-pulse" />
      </div>
    </div>
  );
}

// ── Add coach modal (by email) ────────────────────────────────────────────────
function AddCoachModal({ clubId, onClose, onAdded }) {
  const [email,   setEmail]   = useState('');
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!email.trim()) { setError('L\'email est obligatoire.'); return; }
    setLoading(true);
    setError(null);
    try {
      const { coach } = await addCoachToClub(clubId, email.trim().toLowerCase());
      onAdded(coach);
    } catch (err) {
      setError(err.message || 'Erreur lors de l\'ajout.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-foreground/20 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full max-w-md rounded-2xl border border-border bg-card shadow-xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Ajouter un coach</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Le compte coach doit déjà exister.</p>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground rounded-lg p-1 hover:bg-muted">
            <X className="h-5 w-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              <AlertCircle className="h-4 w-4 shrink-0" />{error}
            </div>
          )}
          <div className="space-y-1.5">
            <Label htmlFor="coach-email">Email du coach</Label>
            <Input
              id="coach-email"
              type="email"
              autoFocus
              placeholder="coach@example.com"
              value={email}
              onChange={(e) => { setEmail(e.target.value); setError(null); }}
            />
            <p className="text-[11px] text-muted-foreground">
              L'utilisateur doit avoir le rôle "coach" sur PadelConnect.
            </p>
          </div>
          <div className="flex gap-3 pt-1">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">Annuler</Button>
            <Button type="submit" disabled={loading} className="flex-1">
              {loading ? 'Ajout…' : 'Ajouter le coach'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Add ball picker modal ─────────────────────────────────────────────────────
function AddBallPickerModal({ clubId, onClose, onAdded }) {
  const [form,    setForm]    = useState({ first_name: '', last_name: '', phone: '' });
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState(null);

  function set(field, val) {
    setForm((f) => ({ ...f, [field]: val }));
    setError(null);
  }

  function formatPhone(v) {
    const digits = v.replace(/\D/g, '').slice(0, 10);
    const groups = [];
    for (let i = 0; i < digits.length; i += 2) groups.push(digits.slice(i, i + 2));
    return groups.join(' ');
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.first_name.trim()) { setError('Le prénom est obligatoire.'); return; }
    setLoading(true);
    setError(null);
    try {
      const { ballPicker } = await addBallPickerToClub(clubId, {
        first_name: form.first_name.trim(),
        last_name:  form.last_name.trim() || null,
        phone:      form.phone.replace(/\s/g, '') || null,
      });
      onAdded(ballPicker);
    } catch (err) {
      setError(err.message || 'Erreur lors de l\'ajout.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-foreground/20 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full max-w-md rounded-2xl border border-border bg-card shadow-xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="text-lg font-semibold text-foreground">Ajouter un ramasseur</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground rounded-lg p-1 hover:bg-muted">
            <X className="h-5 w-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              <AlertCircle className="h-4 w-4 shrink-0" />{error}
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="bp-first">Prénom</Label>
              <Input
                id="bp-first"
                autoFocus
                placeholder="Kofi"
                value={form.first_name}
                onChange={(e) => set('first_name', e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="bp-last">Nom <span className="font-normal text-muted-foreground">(optionnel)</span></Label>
              <Input
                id="bp-last"
                placeholder="Mensah"
                value={form.last_name}
                onChange={(e) => set('last_name', e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="bp-phone">Téléphone <span className="font-normal text-muted-foreground">(optionnel)</span></Label>
            <div className="flex items-center gap-2">
              <span className="text-sm font-mono text-muted-foreground shrink-0 select-none">🇨🇮 +225</span>
              <Input
                id="bp-phone"
                placeholder="07 12 34 56 78"
                value={form.phone}
                onChange={(e) => set('phone', formatPhone(e.target.value))}
                inputMode="numeric"
                maxLength={14}
                className="font-mono tracking-wider"
              />
            </div>
          </div>
          <div className="flex gap-3 pt-1">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">Annuler</Button>
            <Button type="submit" disabled={loading} className="flex-1">
              {loading ? 'Ajout…' : 'Ajouter le ramasseur'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Staff member row ──────────────────────────────────────────────────────────
function StaffRow({ member, onRemove, removing }) {
  const name = [member.user_first_name, member.user_last_name].filter(Boolean).join(' ')
    || member.user_email?.split('@')[0]
    || '—';
  const initials = name.slice(0, 2).toUpperCase();

  return (
    <div className="flex items-center gap-3 py-2.5 px-1">
      <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
        {member.user_photo_url ? (
          <img src={member.user_photo_url} alt={name} className="h-full w-full rounded-full object-cover" />
        ) : (
          <span className="text-xs font-bold text-primary select-none">{initials}</span>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-foreground truncate">{name}</p>
        {member.user_phone ? (
          <p className="text-xs text-muted-foreground truncate">+225 {member.user_phone}</p>
        ) : member.specialty ? (
          <p className="text-xs text-muted-foreground truncate">{member.specialty}</p>
        ) : null}
      </div>
      <button
        type="button"
        disabled={removing}
        onClick={onRemove}
        className="h-8 w-8 flex items-center justify-center rounded-lg text-muted-foreground hover:text-red-600 hover:bg-red-50 transition-colors disabled:opacity-40"
        title="Retirer"
      >
        {removing ? (
          <span className="w-3.5 h-3.5 border border-current/40 border-t-transparent rounded-full animate-spin" />
        ) : (
          <Trash2 className="h-3.5 w-3.5" />
        )}
      </button>
    </div>
  );
}

// ── Subscription card ─────────────────────────────────────────────────────────
function SubscriptionCard({ subscription, history, onPay }) {
  const { status, days_remaining, venue_count, amount_due, period_end } = subscription;
  const isSuspended = status === 'suspended';
  const isUrgent    = !isSuspended && days_remaining <= 7;
  const statusMap   = {
    trial:     { label: 'Essai gratuit', cls: 'bg-amber-50 text-amber-800 border-amber-200'   },
    active:    { label: 'Actif',         cls: 'bg-green-50 text-green-800 border-green-200'   },
    suspended: { label: 'Suspendu',      cls: 'bg-red-50   text-red-800   border-red-200'     },
  };
  const cfg = statusMap[status] ?? statusMap.suspended;

  return (
    <div className={`rounded-xl border overflow-hidden ${isSuspended ? 'border-red-200 bg-red-50/20' : 'border-border bg-card'}`}>
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-border/60">
        <div className="flex items-center gap-2">
          <CreditCard className="h-4 w-4 text-primary" />
          <p className="text-sm font-semibold text-foreground">Abonnement</p>
        </div>
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${cfg.cls}`}>
          {cfg.label}
        </span>
      </div>

      <div className="p-5 space-y-4">
        {/* Stats */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-muted-foreground mb-1">Jours restants</p>
            <p className={`text-2xl font-bold ${isUrgent || isSuspended ? 'text-red-600' : 'text-foreground'}`}>
              {isSuspended ? '—' : days_remaining}
            </p>
            {period_end && !isSuspended && (
              <p className="text-xs text-muted-foreground">
                jusqu'au {new Date(period_end).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}
              </p>
            )}
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1">Montant mensuel</p>
            <p className="text-2xl font-bold text-foreground">
              {(amount_due ?? 0).toLocaleString('fr-FR')} FCFA
            </p>
            <p className="text-xs text-muted-foreground">
              {Math.max(venue_count, 1)} terrain{venue_count !== 1 ? 's' : ''} × 3 000 FCFA
            </p>
          </div>
        </div>

        {/* CTA */}
        <Button
          size="sm"
          onClick={onPay}
          variant={!isSuspended && !isUrgent ? 'outline' : 'default'}
          style={isSuspended ? { backgroundColor: '#dc2626', borderColor: '#dc2626' } : undefined}
          className="w-full"
        >
          <CreditCard className="h-4 w-4" />
          {isSuspended ? "Réactiver l'abonnement" : "Renouveler l'abonnement"}
        </Button>

        {/* Payment history */}
        {history.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
              Historique des paiements
            </p>
            <div className="divide-y divide-border/50">
              {history.slice(0, 3).map((h) => (
                <div key={h.id} className="flex items-center justify-between py-1.5 text-xs">
                  <span className="text-muted-foreground">
                    {new Date(h.paid_at || h.created_at).toLocaleDateString('fr-FR', {
                      day: '2-digit', month: 'short', year: 'numeric',
                    })}
                  </span>
                  <span className="font-medium text-foreground">
                    {Number(h.amount).toLocaleString('fr-FR')} FCFA
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Subscription payment modal ─────────────────────────────────────────────────
function SubscriptionPaymentModal({ sub, onClose, onPaid }) {
  const [method,  setMethod]  = useState('wave');
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await paySubscription(method);
      onPaid();
    } catch (err) {
      setError(err.message || 'Erreur lors du paiement.');
    } finally {
      setLoading(false);
    }
  }

  const amount = sub?.amount_due ?? 0;
  const vCount = Math.max(sub?.venue_count ?? 1, 1);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-foreground/20 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full max-w-md rounded-2xl border border-border bg-card shadow-xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Renouveler l'abonnement</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              {vCount} terrain{vCount !== 1 ? 's' : ''} × 3 000 FCFA = {amount.toLocaleString('fr-FR')} FCFA / mois
            </p>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground rounded-lg p-1 hover:bg-muted">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              <AlertCircle className="h-4 w-4 shrink-0" />{error}
            </div>
          )}

          <div className="space-y-1.5">
            <Label>Mode de paiement</Label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { value: 'wave',         label: 'Wave'          },
                { value: 'orange_money', label: 'Orange Money'  },
                { value: 'card',         label: 'Carte bancaire'},
                { value: 'agency',       label: 'Agence'        },
              ].map(({ value, label }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setMethod(value)}
                  className={`rounded-xl border px-3 py-2.5 text-sm font-medium transition-all ${
                    method === value
                      ? 'border-primary bg-primary/5 text-primary'
                      : 'border-border text-foreground/70 hover:border-primary/40'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-xl bg-muted/40 border border-border px-4 py-3 text-sm text-foreground">
            Total à payer :{' '}
            <span className="font-bold">{amount.toLocaleString('fr-FR')} FCFA</span>
          </div>

          <div className="flex gap-3 pt-1">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">
              Annuler
            </Button>
            <Button type="submit" disabled={loading} className="flex-1">
              {loading ? 'Paiement…' : 'Confirmer le paiement'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── ManagerDashboard page ─────────────────────────────────────────────────────
export default function ManagerDashboard() {
  const { user } = useAuth();

  const [stats,        setStats]        = useState(null);
  const [club,         setClub]         = useState(null);
  const [venues,       setVenues]       = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState(null);
  const [showModal,    setShowModal]    = useState(false);

  // Staff state
  const [coaches,          setCoaches]          = useState([]);
  const [ballPickers,      setBallPickers]       = useState([]);
  const [loadingStaff,     setLoadingStaff]     = useState(false);
  const [showAddCoach,     setShowAddCoach]     = useState(false);
  const [showAddBallPicker,setShowAddBallPicker]= useState(false);
  const [removingId,       setRemovingId]       = useState(null); // userId being removed

  // Subscription state
  const [subscription,  setSubscription]  = useState(null);
  const [subHistory,    setSubHistory]    = useState([]);
  const [showPayModal,  setShowPayModal]  = useState(false);

  const loadStaff = useCallback(async (clubId) => {
    if (!clubId) return;
    setLoadingStaff(true);
    try {
      const [{ coaches: c }, { ballPickers: b }] = await Promise.all([
        getClubCoaches(clubId),
        getClubBallPickers(clubId),
      ]);
      setCoaches(c ?? []);
      setBallPickers(b ?? []);
    } catch {
      // non-fatal
    } finally {
      setLoadingStaff(false);
    }
  }, []);

  useEffect(() => {
    if (!user?.organization_id) { setLoading(false); return; }

    async function load() {
      try {
        const [{ stats: s }, { club: c }, { venues: v }, subResult, histResult] = await Promise.all([
          getManagerDashboard(),
          getMyClub(user.organization_id),
          getMyVenues(user.organization_id),
          getMySubscription().catch(() => null),
          getSubscriptionHistory().catch(() => null),
        ]);
        setStats(s);
        setClub(c);
        setVenues(v ?? []);
        if (subResult)  setSubscription(subResult.subscription ?? null);
        if (histResult) setSubHistory(histResult.history ?? []);
        await loadStaff(user.organization_id);
      } catch (err) {
        setError(err.message || 'Erreur de chargement.');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [user?.organization_id, loadStaff]);

  async function handleRemoveCoach(userId) {
    setRemovingId(userId);
    try {
      await removeCoachFromClub(user.organization_id, userId);
      setCoaches((prev) => prev.filter((c) => c.user_id !== userId));
    } catch {
      // ignore — keep the list as is
    } finally {
      setRemovingId(null);
    }
  }

  async function handleRemoveBallPicker(userId) {
    setRemovingId(userId);
    try {
      await removeBallPickerFromClub(user.organization_id, userId);
      setBallPickers((prev) => prev.filter((b) => b.user_id !== userId));
    } catch {
      // ignore
    } finally {
      setRemovingId(null);
    }
  }

  return (
    <div className="space-y-8">

      {/* ── Header ─────────────────────────────────────────────────── */}
      <div>
        <p className="text-xs font-medium uppercase tracking-widest text-primary mb-1">Espace gérant</p>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          {club ? club.name : 'Tableau de bord'}
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Bienvenue, {user?.email?.split('@')[0]}
        </p>
      </div>

      {loading ? (
        <PageSkeleton icon="📊" message="Chargement de votre espace..." layout="dashboard" />
      ) : error ? (
        <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <AlertCircle className="h-4 w-4 shrink-0" />{error}
        </div>
      ) : !user?.organization_id ? (
        <div className="rounded-xl border border-dashed border-border bg-card p-16 text-center space-y-4">
          <Building2 className="h-10 w-10 text-muted-foreground mx-auto" />
          <div>
            <p className="font-medium text-foreground">Aucun club associé</p>
            <p className="text-sm text-muted-foreground max-w-xs mx-auto mt-1">
              Créez votre club pour commencer à gérer vos terrains.
            </p>
          </div>
          <Link to="/manager/setup">
            <Button><Plus className="h-4 w-4" />Créer votre club</Button>
          </Link>
        </div>
      ) : (
        <>
          {/* ── Stats ──────────────────────────────────────────────── */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <StatCard
              label="Terrains"
              value={stats?.total_venues ?? venues.length}
              note={`terrain${(stats?.total_venues ?? venues.length) !== 1 ? 's' : ''} enregistré${(stats?.total_venues ?? venues.length) !== 1 ? 's' : ''}`}
              icon={MapPin}
            />
            <StatCard
              label="Réservés aujourd'hui"
              value={stats?.bookings_today ?? 0}
              note={stats?.bookings_today === 0 ? 'aucune réservation' : 'créneaux réservés'}
              icon={CalendarDays}
              accent
            />
            <StatCard
              label="Réservés cette semaine"
              value={stats?.bookings_week ?? 0}
              note={stats?.bookings_week === 0 ? 'aucune réservation' : 'sur les 7 prochains jours'}
              icon={CalendarCheck}
            />
            <StatCard
              label="Revenus aujourd'hui"
              value={`${(stats?.revenue_today ?? 0).toLocaleString('fr-FR')} FCFA`}
              note="créneaux réservés ce jour"
              icon={TrendingUp}
            />
          </div>

          {/* ── Club info card ──────────────────────────────────────── */}
          {club && (
            <div className="flex items-center gap-3 rounded-xl border border-border bg-card px-5 py-3">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <Building2 className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-foreground">{club.name}</p>
                <p className="text-xs text-muted-foreground">/{club.slug}</p>
              </div>
              <Badge variant={club.status === 'active' ? 'success' : 'secondary'}>
                {club.status === 'active' ? 'Actif' : 'Inactif'}
              </Badge>
            </div>
          )}

          {/* ── Abonnement ──────────────────────────────────────────── */}
          {subscription && (
            <SubscriptionCard
              subscription={subscription}
              history={subHistory}
              onPay={() => setShowPayModal(true)}
            />
          )}

          {/* ── Venues section ──────────────────────────────────────── */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-semibold text-foreground">Mes terrains</h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {venues.length} terrain{venues.length !== 1 ? 's' : ''} enregistré{venues.length !== 1 ? 's' : ''}
                </p>
              </div>
              <Button size="sm" onClick={() => setShowModal(true)}>
                <Plus className="h-4 w-4" />
                Ajouter un terrain
              </Button>
            </div>

            {venues.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border bg-card p-12 text-center space-y-3">
                <MapPin className="h-8 w-8 text-muted-foreground mx-auto" />
                <p className="text-sm text-muted-foreground">
                  Aucun terrain. Ajoutez votre premier court pour commencer.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {venues.map((v) => <VenueCard key={v.id} venue={v} />)}
              </div>
            )}
          </div>

          {/* ── Mon équipe ──────────────────────────────────────────── */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-semibold text-foreground">Mon équipe</h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {coaches.length + ballPickers.length} membre{coaches.length + ballPickers.length !== 1 ? 's' : ''} au total
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

              {/* ── Coaches ── */}
              <div className="rounded-xl border border-border bg-card overflow-hidden">
                <div className="flex items-center justify-between px-5 py-3.5 border-b border-border">
                  <div className="flex items-center gap-2">
                    <UserCheck className="h-4 w-4 text-primary" />
                    <p className="text-sm font-semibold text-foreground">
                      Coachs <span className="text-muted-foreground font-normal">({coaches.length})</span>
                    </p>
                  </div>
                  <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => setShowAddCoach(true)}>
                    <Plus className="h-3 w-3" />Ajouter
                  </Button>
                </div>

                <div className="px-4 divide-y divide-border/50">
                  {loadingStaff ? (
                    <div className="py-4 space-y-3">
                      {[1, 2].map((i) => <div key={i} className="h-9 rounded-lg bg-muted animate-pulse" />)}
                    </div>
                  ) : coaches.length === 0 ? (
                    <div className="py-6 text-center">
                      <Users className="h-6 w-6 text-muted-foreground mx-auto mb-1.5" />
                      <p className="text-xs text-muted-foreground">Aucun coach rattaché.</p>
                    </div>
                  ) : (
                    coaches.map((c) => (
                      <StaffRow
                        key={c.user_id}
                        member={c}
                        removing={removingId === c.user_id}
                        onRemove={() => handleRemoveCoach(c.user_id)}
                      />
                    ))
                  )}
                </div>
              </div>

              {/* ── Ball pickers ── */}
              <div className="rounded-xl border border-border bg-card overflow-hidden">
                <div className="flex items-center justify-between px-5 py-3.5 border-b border-border">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-primary" />
                    <p className="text-sm font-semibold text-foreground">
                      Ramasseurs <span className="text-muted-foreground font-normal">({ballPickers.length})</span>
                    </p>
                  </div>
                  <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => setShowAddBallPicker(true)}>
                    <Plus className="h-3 w-3" />Ajouter
                  </Button>
                </div>

                <div className="px-4 divide-y divide-border/50">
                  {loadingStaff ? (
                    <div className="py-4 space-y-3">
                      {[1].map((i) => <div key={i} className="h-9 rounded-lg bg-muted animate-pulse" />)}
                    </div>
                  ) : ballPickers.length === 0 ? (
                    <div className="py-6 text-center">
                      <Users className="h-6 w-6 text-muted-foreground mx-auto mb-1.5" />
                      <p className="text-xs text-muted-foreground">Aucun ramasseur rattaché.</p>
                    </div>
                  ) : (
                    ballPickers.map((b) => (
                      <StaffRow
                        key={b.user_id}
                        member={b}
                        removing={removingId === b.user_id}
                        onRemove={() => handleRemoveBallPicker(b.user_id)}
                      />
                    ))
                  )}
                </div>
              </div>

            </div>
          </div>
        </>
      )}

      {showModal && (
        <AddVenueModal
          clubId={user.organization_id}
          onClose={() => setShowModal(false)}
          onCreated={(v) => {
            setVenues((prev) => [...prev, v]);
            setShowModal(false);
          }}
        />
      )}

      {showAddCoach && (
        <AddCoachModal
          clubId={user.organization_id}
          onClose={() => setShowAddCoach(false)}
          onAdded={(coach) => {
            // Reload full list so we get all joined fields
            loadStaff(user.organization_id);
            setShowAddCoach(false);
          }}
        />
      )}

      {showAddBallPicker && (
        <AddBallPickerModal
          clubId={user.organization_id}
          onClose={() => setShowAddBallPicker(false)}
          onAdded={(bp) => {
            setBallPickers((prev) => [...prev, bp]);
            setShowAddBallPicker(false);
          }}
        />
      )}

      {showPayModal && subscription && (
        <SubscriptionPaymentModal
          sub={subscription}
          onClose={() => setShowPayModal(false)}
          onPaid={() => {
            setShowPayModal(false);
            // Refresh subscription status
            getMySubscription().then((r) => setSubscription(r.subscription ?? null)).catch(() => {});
            getSubscriptionHistory().then((r) => setSubHistory(r.history ?? [])).catch(() => {});
          }}
        />
      )}
    </div>
  );
}
