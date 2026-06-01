import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useState, useEffect, createContext, useContext, useCallback } from 'react';
import Login            from '@/pages/Login';
import Signup           from '@/pages/Signup';
import AdminLogin       from '@/pages/AdminLogin';
import VerifyEmail      from '@/pages/VerifyEmail';
import ForgotPassword   from '@/pages/ForgotPassword';
import ProfileSetup     from '@/pages/ProfileSetup';
import Dashboard        from '@/pages/Dashboard';
import Sessions         from '@/pages/Sessions';
import SessionDetail    from '@/pages/SessionDetail';
import Calendar         from '@/pages/Calendar';
import Clubs            from '@/pages/Clubs';
import Notifications    from '@/pages/Notifications';
import CoachDashboard   from '@/pages/CoachDashboard';
import CoachSetup       from '@/pages/CoachSetup';
import ManagerHome     from '@/pages/manager/ManagerHome';
import ManagerVenues   from '@/pages/manager/ManagerVenues';
import ManagerBookings from '@/pages/manager/ManagerBookings';
import SlotManager     from '@/pages/manager/SlotManager';
import ClubSetup       from '@/pages/manager/ClubSetup';
import ManagerProfile  from '@/pages/manager/ManagerProfile';
import ClubProfile      from '@/pages/ClubProfile';
import AdminDashboard   from '@/pages/AdminDashboard';
import AdminProfile     from '@/pages/AdminProfile';
import History          from '@/pages/History';
import SessionHistory   from '@/pages/SessionHistory';
import Landing          from '@/pages/Landing';
import Profile          from '@/pages/Profile';
import PlayerProfile    from '@/pages/PlayerProfile';
import Messages         from '@/pages/Messages';
import Contact          from '@/pages/Contact';
import Privacy          from '@/pages/Privacy';
import Terms            from '@/pages/Terms';
import Layout              from '@/components/Layout';
import SplashScreen        from '@/components/SplashScreen';
import PlayerProfilePanel  from '@/components/PlayerProfilePanel';
import ErrorBoundary       from '@/components/ErrorBoundary';
import { me }           from '@/api/auth';
import { getProfile }   from '@/api/profile';

// ── Auth + profile context ────────────────────────────────────────────────────
export const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

// ── Player profile panel context ──────────────────────────────────────────────
export const PlayerPanelContext = createContext(null);
export const usePlayerPanel = () => useContext(PlayerPanelContext);

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

// Returns the role-correct home URL for an authenticated user.
export function homeFor(user) {
  if (user.role === 'venue_admin') return user.organization_id ? '/manager/dashboard' : '/manager/setup';
  if (user.role === 'coach')       return '/coach/dashboard';
  if (user.role === 'super_admin') return '/admin/dashboard';
  return '/sessions';
}

// Any authenticated user.
function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  if (!user)   return <Navigate to="/login" replace />;
  return children;
}

// Unauthenticated only — authenticated users go to their role home.
function PublicRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  if (user)    return <Navigate to={homeFor(user)} replace />;
  return children;
}

// player + coach only — venue_admin and super_admin are sent to their home.
function PlayerRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  if (!user)   return <Navigate to="/login" replace />;
  if (user.role === 'venue_admin' || user.role === 'super_admin')
    return <Navigate to={homeFor(user)} replace />;
  return children;
}

// coach only.
function CoachRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading)                return <LoadingScreen />;
  if (!user)                  return <Navigate to="/login"        replace />;
  if (user.role !== 'coach')  return <Navigate to={homeFor(user)} replace />;
  return children;
}

// venue_admin only, no org required (for /manager/setup).
function ManagerSetupRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading)                        return <LoadingScreen />;
  if (!user)                          return <Navigate to="/login"        replace />;
  if (user.role !== 'venue_admin')    return <Navigate to={homeFor(user)} replace />;
  return children;
}

// venue_admin + org required.
function ManagerRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading)                        return <LoadingScreen />;
  if (!user)                          return <Navigate to="/login"         replace />;
  if (user.role !== 'venue_admin')    return <Navigate to={homeFor(user)}  replace />;
  if (!user.organization_id)          return <Navigate to="/manager/setup" replace />;
  return children;
}

// super_admin only.
function AdminRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading)                          return <LoadingScreen />;
  if (!user)                            return <Navigate to="/login"        replace />;
  if (user.role !== 'super_admin')      return <Navigate to={homeFor(user)} replace />;
  return children;
}

// Sends authenticated users to their role home; unauthenticated to /login.
function DefaultRedirect() {
  const { user, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  return <Navigate to={user ? homeFor(user) : '/login'} replace />;
}

// ── Root app ──────────────────────────────────────────────────────────────────
export default function App() {
  const [user,        setUser]       = useState(null);
  const [profile,     setProfile]    = useState(undefined); // undefined = not yet loaded
  const [loading,     setLoading]    = useState(true);
  const [showSplash,  setShowSplash] = useState(
    () => !sessionStorage.getItem('splash_shown'),
  );

  // ── Player panel state ─────────────────────────────────────────────────────
  const [panelUserId, setPanelUserId] = useState(null);
  const openPlayerPanel  = useCallback((id) => setPanelUserId(id), []);
  const closePlayerPanel = useCallback(() => setPanelUserId(null), []);

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

  function handleSplashDone() {
    sessionStorage.setItem('splash_shown', '1');
    setShowSplash(false);
  }

  if (showSplash) return <SplashScreen onDone={handleSplashDone} />;

  return (
    <AuthContext.Provider value={{ user, setUser, profile, setProfile, loading }}>
      <PlayerPanelContext.Provider value={{ openPlayerPanel, closePlayerPanel, panelUserId }}>
      <BrowserRouter>
        <ErrorBoundary>
        <Routes>
          {/* ── Public routes ──────────────────────────────────────── */}
          <Route path="/login"        element={<PublicRoute><Login  /></PublicRoute>} />
          <Route path="/signup"       element={<PublicRoute><Signup /></PublicRoute>} />
          <Route path="/verify-email"    element={<VerifyEmail />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/admin/login"     element={<AdminLogin />} />

          {/* ── Profile setup — auth required, profile not required ─ */}
          <Route
            path="/profile/setup"
            element={
              <ProtectedRoute>
                <ProfileSetup />
              </ProtectedRoute>
            }
          />

          {/* ── Player + coach routes ───────────────────────────────── */}
          <Route path="/dashboard" element={<DefaultRedirect />} />
          <Route path="/sessions"      element={<PlayerRoute><Layout><Sessions /></Layout></PlayerRoute>} />
          <Route path="/sessions/:id"  element={<PlayerRoute><Layout><SessionDetail /></Layout></PlayerRoute>} />
          <Route path="/calendar"  element={<PlayerRoute><Layout><Calendar /></Layout></PlayerRoute>} />
          <Route path="/history"          element={<PlayerRoute><Layout><History /></Layout></PlayerRoute>} />
          <Route path="/history/sessions" element={<PlayerRoute><Layout><SessionHistory /></Layout></PlayerRoute>} />
          <Route path="/clubs"     element={<PlayerRoute><Layout><Clubs /></Layout></PlayerRoute>} />
          <Route path="/clubs/:id" element={<PlayerRoute><Layout><ClubProfile /></Layout></PlayerRoute>} />
          <Route path="/profile"   element={<PlayerRoute><Layout><Profile /></Layout></PlayerRoute>} />
          <Route path="/messages"  element={<PlayerRoute><Layout><Messages /></Layout></PlayerRoute>} />
          <Route path="/players/:userId" element={<PlayerRoute><Layout><PlayerProfile /></Layout></PlayerRoute>} />

          {/* ── Shared (all authenticated roles) ────────────────────── */}
          <Route path="/notifications" element={<ProtectedRoute><Layout><Notifications /></Layout></ProtectedRoute>} />

          {/* ── Coach ───────────────────────────────────────────────── */}
          <Route path="/coach/setup"     element={<CoachRoute><CoachSetup /></CoachRoute>} />
          <Route path="/coach/dashboard" element={<CoachRoute><Layout><CoachDashboard /></Layout></CoachRoute>} />

          {/* ── Manager — setup (venue_admin, no org required) ──────── */}
          <Route path="/manager/setup" element={<ManagerSetupRoute><ClubSetup /></ManagerSetupRoute>} />

          {/* ── Manager — org required ──────────────────────────────── */}
          <Route path="/manager"                       element={<Navigate to="/manager/dashboard" replace />} />
          <Route path="/manager/dashboard"             element={<ManagerRoute><Layout><ManagerHome /></Layout></ManagerRoute>} />
          <Route path="/manager/venues"                element={<ManagerRoute><Layout><ManagerVenues /></Layout></ManagerRoute>} />
          <Route path="/manager/venues/:venueId/slots" element={<ManagerRoute><Layout><SlotManager /></Layout></ManagerRoute>} />
          <Route path="/manager/bookings"              element={<ManagerRoute><Layout><ManagerBookings /></Layout></ManagerRoute>} />
          <Route path="/manager/profile"               element={<ManagerRoute><Layout><ManagerProfile /></Layout></ManagerRoute>} />

          {/* ── Admin — super_admin only ─────────────────────────────── */}
          <Route path="/admin/dashboard" element={<AdminRoute><Layout><AdminDashboard /></Layout></AdminRoute>} />
          <Route path="/admin/profile"   element={<AdminRoute><Layout><AdminProfile /></Layout></AdminRoute>} />

          {/* ── Landing — public ────────────────────────────────────── */}
          <Route path="/" element={<Landing />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/privacy" element={<Privacy />} />
          <Route path="/terms"   element={<Terms />} />

          {/* ── Catch-all: role-aware redirect ──────────────────────── */}
          <Route path="*" element={<DefaultRedirect />} />
        </Routes>
        {/* ── Global player profile slide panel ─────────────────────────── */}
        <PlayerProfilePanel userId={panelUserId} onClose={closePlayerPanel} />
        </ErrorBoundary>
      </BrowserRouter>

      </PlayerPanelContext.Provider>
    </AuthContext.Provider>
  );
}
