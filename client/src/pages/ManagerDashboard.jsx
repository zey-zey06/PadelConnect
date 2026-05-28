import { useState, useEffect, useCallback } from 'react';
import { Building2, MapPin, Plus, Calendar, AlertCircle, Clock, Trash2 } from 'lucide-react';
import { useAuth } from '@/App';
import { getClub, getClubVenues } from '@/api/clubs';
import { getVenueSlots, addSlot, deleteSlot, deleteVenue } from '@/api/venues';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const STATUS_LABEL = {
  available: { label: 'Disponible', cls: 'bg-green-100 text-green-700' },
  booked:    { label: 'Réservé',    cls: 'bg-blue-100 text-blue-700' },
  cancelled: { label: 'Annulé',     cls: 'bg-red-100 text-red-600' },
};

// ── Add slot form ─────────────────────────────────────────────────────────────
function AddSlotForm({ venueId, onAdded }) {
  const [form,    setForm]    = useState({ date: '', start_time: '', end_time: '', price: '' });
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const { slot } = await addSlot(venueId, {
        date:       form.date,
        start_time: form.start_time,
        end_time:   form.end_time,
        price:      Number(form.price),
      });
      onAdded(slot);
      setForm({ date: '', start_time: '', end_time: '', price: '' });
    } catch (err) {
      setError(err.message || 'Erreur lors de la création.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-lg border border-border bg-background p-4 space-y-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Nouveau créneau</p>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label htmlFor={`date-${venueId}`} className="text-xs">Date</Label>
          <Input
            id={`date-${venueId}`}
            type="date"
            value={form.date}
            onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
            required
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor={`price-${venueId}`} className="text-xs">Prix (FCFA)</Label>
          <Input
            id={`price-${venueId}`}
            type="number"
            min="0"
            placeholder="ex: 5000"
            value={form.price}
            onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
            required
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor={`start-${venueId}`} className="text-xs">Début</Label>
          <Input
            id={`start-${venueId}`}
            type="time"
            value={form.start_time}
            onChange={(e) => setForm((f) => ({ ...f, start_time: e.target.value }))}
            required
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor={`end-${venueId}`} className="text-xs">Fin</Label>
          <Input
            id={`end-${venueId}`}
            type="time"
            value={form.end_time}
            onChange={(e) => setForm((f) => ({ ...f, end_time: e.target.value }))}
            required
          />
        </div>
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
      <Button type="submit" size="sm" disabled={loading}>
        <Plus className="h-3.5 w-3.5" />
        {loading ? 'Ajout…' : 'Ajouter le créneau'}
      </Button>
    </form>
  );
}

// ── Venue card with slots ─────────────────────────────────────────────────────
function VenueSection({ venue, onVenueDeleted }) {
  const [slots,       setSlots]       = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState(null);
  const [showForm,    setShowForm]    = useState(false);
  const [deleting,    setDeleting]    = useState(null);
  const [deletingVenue, setDeletingVenue] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  useEffect(() => {
    getVenueSlots(venue.id)
      .then(({ slots: s }) => setSlots(s ?? []))
      .catch((e) => setError(e.message || 'Erreur.'))
      .finally(() => setLoading(false));
  }, [venue.id]);

  async function handleDelete(slotId) {
    setDeleting(slotId);
    try {
      await deleteSlot(venue.id, slotId);
      setSlots((prev) => prev.filter((s) => s.id !== slotId));
    } catch {
      // non-fatal: slot may already be booked
    } finally {
      setDeleting(null);
    }
  }

  async function handleDeleteVenue() {
    setDeletingVenue(true);
    try {
      await deleteVenue(venue.id);
      setShowDeleteModal(false);
      onVenueDeleted(venue.id);
    } catch (err) {
      alert(err.message || 'Erreur lors de la suppression du terrain.');
    } finally {
      setDeletingVenue(false);
    }
  }

  return (
    <>
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="flex items-center gap-3 px-5 py-3 border-b border-border">
          <MapPin className="h-4 w-4 text-muted-foreground shrink-0" />
          <div className="flex-1">
            <p className="font-medium text-foreground">{venue.name}</p>
            {venue.description && (
              <p className="text-xs text-muted-foreground">{venue.description}</p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={() => setShowForm((v) => !v)}>
              <Plus className="h-3.5 w-3.5" />
              Créneau
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setShowDeleteModal(true)}
              className="text-red-600 hover:text-red-700 hover:bg-red-50"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Supprimer
            </Button>
          </div>
        </div>

      <div className="p-4 space-y-3">
        {showForm && (
          <AddSlotForm
            venueId={venue.id}
            onAdded={(slot) => {
              setSlots((prev) => [slot, ...prev]);
              setShowForm(false);
            }}
          />
        )}

        {loading ? (
          <div className="space-y-2">
            {[1, 2].map((i) => <div key={i} className="h-10 rounded-lg bg-muted animate-pulse" />)}
          </div>
        ) : error ? (
          <p className="text-sm text-red-600">{error}</p>
        ) : slots.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">Aucun créneau. Ajoutez-en un ci-dessus.</p>
        ) : (
          <div className="space-y-2">
            {slots.map((slot) => {
              const s = STATUS_LABEL[slot.status] ?? { label: slot.status, cls: 'bg-muted text-muted-foreground' };
              const d = new Date(slot.date);
              return (
                <div key={slot.id} className="flex items-center gap-3 rounded-lg border border-border px-3 py-2">
                  <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">
                      {d.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })}
                    </p>
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {slot.start_time?.slice(0, 5)} – {slot.end_time?.slice(0, 5)}
                      <span className="ml-1">· {Number(slot.price).toLocaleString('fr-FR')} FCFA</span>
                    </p>
                  </div>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${s.cls}`}>{s.label}</span>
                  {slot.status === 'available' && (
                    <button
                      onClick={() => handleDelete(slot.id)}
                      disabled={deleting === slot.id}
                      className="text-muted-foreground hover:text-red-600 transition-colors disabled:opacity-40"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>

    {/* Delete venue confirmation modal */}
    {showDeleteModal && (
      <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
        <div className="bg-background rounded-lg border border-border shadow-lg max-w-sm w-full p-6 space-y-4">
          <div className="flex items-start gap-3">
            <div className="h-10 w-10 rounded-full bg-red-100 flex items-center justify-center shrink-0">
              <AlertCircle className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <p className="font-semibold text-foreground">Supprimer le terrain ?</p>
              <p className="text-sm text-muted-foreground mt-1">
                Êtes-vous sûr ? Tous les créneaux seront annulés et les joueurs seront notifiés.
              </p>
            </div>
          </div>
          <div className="flex gap-3 justify-end">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowDeleteModal(false)}
              disabled={deletingVenue}
            >
              Annuler
            </Button>
            <Button
              size="sm"
              variant="destructive"
              onClick={handleDeleteVenue}
              disabled={deletingVenue}
            >
              {deletingVenue ? 'Suppression…' : 'Supprimer'}
            </Button>
          </div>
        </div>
      </div>
    )}
    </>
  );
}

// ── ManagerDashboard page ─────────────────────────────────────────────────────
export default function ManagerDashboard() {
  const { user } = useAuth();

  const [club,    setClub]    = useState(null);
  const [venues,  setVenues]  = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);

  function handleVenueDeleted(venueId) {
    setVenues((prev) => prev.filter((v) => v.id !== venueId));
  }

  useEffect(() => {
    if (!user?.organization_id) {
      setLoading(false);
      return;
    }

    async function load() {
      try {
        const [{ club: c }, { venues: v }] = await Promise.all([
          getClub(user.organization_id),
          getClubVenues(user.organization_id),
        ]);
        setClub(c);
        setVenues(v ?? []);
      } catch (err) {
        setError(err.message || 'Erreur de chargement.');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [user?.organization_id]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Espace Gérant</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Gérez vos terrains et vos créneaux.
        </p>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2].map((i) => <div key={i} className="h-40 rounded-xl bg-muted animate-pulse" />)}
        </div>
      ) : error ? (
        <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      ) : !user?.organization_id ? (
        <div className="rounded-xl border border-dashed border-border bg-card p-16 text-center space-y-3">
          <Building2 className="h-10 w-10 text-muted-foreground mx-auto" />
          <p className="font-medium text-foreground">Aucun club associé</p>
          <p className="text-sm text-muted-foreground max-w-xs mx-auto">
            Votre compte gérant n'est pas encore rattaché à un club.
          </p>
        </div>
      ) : (
        <>
          {/* Club info */}
          {club && (
            <div className="rounded-xl border border-border bg-card px-5 py-4 flex items-center gap-4">
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <Building2 className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="font-semibold text-foreground">{club.name}</p>
                <p className="text-sm text-muted-foreground">/{club.slug} · {venues.length} terrain{venues.length !== 1 ? 's' : ''}</p>
              </div>
              <span className={`ml-auto text-xs font-medium px-2 py-0.5 rounded-full ${club.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-muted text-muted-foreground'}`}>
                {club.status === 'active' ? 'Actif' : 'Inactif'}
              </span>
            </div>
          )}

          {/* Venues */}
          {venues.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border bg-card p-10 text-center space-y-2">
              <MapPin className="h-8 w-8 text-muted-foreground mx-auto" />
              <p className="text-sm text-muted-foreground">Aucun terrain enregistré pour votre club.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {venues.map((v) => <VenueSection key={v.id} venue={v} onVenueDeleted={handleVenueDeleted} />)}
            </div>
          )}
        </>
      )}
    </div>
  );
}
