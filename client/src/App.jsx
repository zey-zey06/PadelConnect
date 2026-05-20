import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useState, useEffect, createContext, useContext } from 'react';
import Login            from '@/pages/Login';
import Signup           from '@/pages/Signup';
import AdminLogin       from '@/pages/AdminLogin';
import VerifyEmail      from '@/pages/VerifyEmail';
import ProfileSetup     from '@/pages/ProfileSetup';
import Dashboard        from '@/pages/Dashboard';
import Sessions         from '@/pages/Sessions';
import Calendar         from '@/pages/Calendar';
import Clubs            from '@/pages/Clubs';
import Notifications    from '@/pages/Notifications';
import CoachDashboard   from '@/pages/CoachDashboard';
import ManagerDashboard from '@/pages/ManagerDashboard';
import AdminDashboard   from '@/pages/AdminDashboard';
import Layout           from '@/components/Layout';
import { me }           from '@/api/auth';
import { getProfile }   from '@/api/profile';

// ── Auth + profile context ────────────────────────────────────────────────────
export const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

// ── Loading screen ────────────────────────────────────────────────────────────
export function LoadingScreen() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        <p className="text-muted-foreground text-sm">Chargement…</p>
      </div>
    </div>
  );
}

// ── Route guards ──────────────────────────────────────────────────────────────
function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  if (!user)   return <Navigate to="/login" replace />;
  return children;
}

function PublicRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  if (user)    return <Navigate to="/dashboard" replace />;
  return children;
}

// ── Root app ──────────────────────────────────────────────────────────────────
export default function App() {
  const [user,    setUser]    = useState(null);
  const [profile, setProfile] = useState(undefined); // undefined = not yet loaded
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const { user: u } = await me();
        if (cancelled) return;
        setUser(u);

        // Load profile in parallel — profile may legitimately be null (not set up yet)
        try {
          const { profile: p } = await getProfile();
          if (!cancelled) setProfile(p);
        } catch {
          if (!cancelled) setProfile(null);
        }
      } catch {
        if (!cancelled) {
          setUser(null);
          setProfile(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => { cancelled = true; };
  }, []);

  return (
    <AuthContext.Provider value={{ user, setUser, profile, setProfile, loading }}>
      <BrowserRouter>
        <Routes>
          {/* ── Public routes ──────────────────────────────────────── */}
          <Route path="/login"        element={<PublicRoute><Login  /></PublicRoute>} />
          <Route path="/signup"       element={<PublicRoute><Signup /></PublicRoute>} />
          <Route path="/verify-email" element={<VerifyEmail />} />
          <Route path="/admin/login"  element={<AdminLogin />} />

          {/* ── Profile setup — auth required, profile not required ─ */}
          <Route
            path="/profile/setup"
            element={
              <ProtectedRoute>
                <ProfileSetup />
              </ProtectedRoute>
            }
          />

          {/* ── Main app — auth + layout ────────────────────────────── */}
          <Route
            path="/dashboard"
            element={<ProtectedRoute><Layout><Dashboard /></Layout></ProtectedRoute>}
          />
          <Route
            path="/sessions"
            element={<ProtectedRoute><Layout><Sessions /></Layout></ProtectedRoute>}
          />
          <Route
            path="/calendar"
            element={<ProtectedRoute><Layout><Calendar /></Layout></ProtectedRoute>}
          />
          <Route
            path="/clubs"
            element={<ProtectedRoute><Layout><Clubs /></Layout></ProtectedRoute>}
          />
          <Route
            path="/notifications"
            element={<ProtectedRoute><Layout><Notifications /></Layout></ProtectedRoute>}
          />
          <Route
            path="/coach/dashboard"
            element={<ProtectedRoute><Layout><CoachDashboard /></Layout></ProtectedRoute>}
          />
          <Route
            path="/manager/dashboard"
            element={<ProtectedRoute><Layout><ManagerDashboard /></Layout></ProtectedRoute>}
          />
          <Route
            path="/admin/dashboard"
            element={<ProtectedRoute><Layout><AdminDashboard /></Layout></ProtectedRoute>}
          />

          {/* ── Default redirects ────────────────────────────────────── */}
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthContext.Provider>
  );
}
