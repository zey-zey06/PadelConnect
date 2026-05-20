import { Building2 } from 'lucide-react';
import { useAuth } from '@/App';

export default function ManagerDashboard() {
  const { user } = useAuth();
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Espace Gérant
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Bienvenue, {user?.email?.split('@')[0]} — gérez votre club et vos terrains.
        </p>
      </div>
      <div className="rounded-xl border border-dashed border-border bg-card p-16 text-center space-y-3">
        <Building2 className="h-10 w-10 text-muted-foreground mx-auto" />
        <p className="font-medium text-foreground">Tableau de bord gérant — bientôt disponible</p>
        <p className="text-sm text-muted-foreground max-w-xs mx-auto">
          Gérez vos terrains, créneaux, réservations et accédez aux statistiques de votre club.
        </p>
      </div>
    </div>
  );
}
