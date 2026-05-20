import { ShieldCheck } from 'lucide-react';
import { useAuth } from '@/App';

export default function AdminDashboard() {
  const { user } = useAuth();
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Administration
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Bienvenue, {user?.email?.split('@')[0]} — accès super admin.
        </p>
      </div>
      <div className="rounded-xl border border-dashed border-border bg-card p-16 text-center space-y-3">
        <ShieldCheck className="h-10 w-10 text-muted-foreground mx-auto" />
        <p className="font-medium text-foreground">Dashboard admin — bientôt disponible</p>
        <p className="text-sm text-muted-foreground max-w-xs mx-auto">
          Gérez les utilisateurs, clubs, bans et consultez les métriques globales.
        </p>
      </div>
    </div>
  );
}
