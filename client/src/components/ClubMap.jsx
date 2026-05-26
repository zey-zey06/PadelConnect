import { useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import markerIconPng    from 'leaflet/dist/images/marker-icon.png';
import markerIcon2xPng  from 'leaflet/dist/images/marker-icon-2x.png';
import markerShadowPng  from 'leaflet/dist/images/marker-shadow.png';

// Fix broken default marker icons in Vite
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl:       markerIconPng,
  iconRetinaUrl: markerIcon2xPng,
  shadowUrl:     markerShadowPng,
});

// ── Single-club map (used in ClubProfile) ─────────────────────────────────────
export function SingleClubMap({ lat, lng, clubName, className = '' }) {
  const [ready, setReady] = useState(false);

  return (
    <div className={`relative z-0 h-64 rounded-xl overflow-hidden border border-border ${className}`}>
      {!ready && (
        <div className="absolute inset-0 z-10 bg-muted animate-pulse" />
      )}
      <MapContainer
        center={[lat, lng]}
        zoom={15}
        scrollWheelZoom={false}
        style={{ height: '100%', width: '100%' }}
        whenReady={() => setReady(true)}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <Marker position={[lat, lng]}>
          <Popup>{clubName}</Popup>
        </Marker>
      </MapContainer>
    </div>
  );
}

// ── Multi-club map (used in Clubs list) ───────────────────────────────────────
const ABIDJAN_CENTER = [5.3453, -4.0242];

export function MultiClubMap({ clubs, onClubClick, className = '' }) {
  const [ready, setReady] = useState(false);
  const withCoords = clubs.filter((c) => c.latitude != null && c.longitude != null);

  let center = ABIDJAN_CENTER;
  if (withCoords.length > 0) {
    const avgLat = withCoords.reduce((s, c) => s + Number(c.latitude), 0) / withCoords.length;
    const avgLng = withCoords.reduce((s, c) => s + Number(c.longitude), 0) / withCoords.length;
    center = [avgLat, avgLng];
  }

  if (withCoords.length === 0) {
    return (
      <div className={`flex items-center justify-center h-96 rounded-xl border border-dashed border-border bg-card text-sm text-muted-foreground ${className}`}>
        Aucun club avec des coordonnées disponible.
      </div>
    );
  }

  return (
    <div className={`relative z-0 h-96 rounded-xl overflow-hidden border border-border ${className}`}>
      {!ready && (
        <div className="absolute inset-0 z-10 bg-muted animate-pulse" />
      )}
      <MapContainer
        center={center}
        zoom={13}
        scrollWheelZoom={false}
        style={{ height: '100%', width: '100%' }}
        whenReady={() => setReady(true)}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {withCoords.map((c) => (
          <Marker key={c.id} position={[Number(c.latitude), Number(c.longitude)]}>
            <Popup>
              <div className="space-y-1 min-w-[140px]">
                <p className="font-semibold text-sm">{c.name}</p>
                {c.address && <p className="text-xs text-gray-600">{c.address}</p>}
                {onClubClick && (
                  <button
                    onClick={() => onClubClick(c.id)}
                    className="text-xs text-blue-600 hover:underline"
                  >
                    Voir le club →
                  </button>
                )}
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
