import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useState, useEffect, createContext, useContext } from 'react';
import Login from '@/pages/Login';
import Signup from '@/pages/Signup';
import Layout from '@/components/Layout';
import { me } from '@/api/auth';

// ── Auth context ──────────────────────────────────────────────────────────────
export const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

// ── Loading screen ────────────────────────────────────────────────────────────
function LoadingScreen() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        <p className="text-muted-foreground text-sm">Chargement...</p>
      </div>
    </div>
  );
}

// ── Route guards ──────────────────────────────────────────────────────────────
function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

function PublicRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  if (user) return <Navigate to="/" replace />;
  return children;
}

// ── Placeholder dashboard ─────────────────────────────────────────────────────
function Dashboard() {
  const { user } = useAuth();
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Bienvenue 👋</h1>
        <p className="text-muted-foreground mt-1">
          Connecté en tant que{' '}
          <span className="text-primary font-medium">{user?.email}</span>
        </p>
        <p className="text-muted-foreground text-sm">
          Rôle :{' '}
          <span className="capitalize text-foreground/80">{user?.role}</span>
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
        {['Sessions', 'Calendrier', 'Clubs'].map((label) => (
          <div
            key={label}
            className="rounded-lg border border-border bg-card p-5 text-card-foreground"
          >
            <p className="text-sm text-muted-foreground">{label}</p>
            <p className="mt-1 text-2xl font-semibold text-foreground">—</p>
            <p className="text-xs text-muted-foreground mt-1">Bientôt disponible</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Root app ──────────────────────────────────────────────────────────────────
export default function App() {
  const [user, setUser]     = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    me()
      .then((data) => setUser(data.user))
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  return (
    <AuthContext.Provider value={{ user, setUser, loading }}>
      <BrowserRouter>
        <Routes>
          <Route
            path="/login"
            element={<PublicRoute><Login /></PublicRoute>}
          />
          <Route
            path="/signup"
            element={<PublicRoute><Signup /></PublicRoute>}
          />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Layout><Dashboard /></Layout>
              </ProtectedRoute>
            }
          />
          {/* Catch-all → home (ProtectedRoute handles unauthenticated redirect) */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthContext.Provider>
  );
}
