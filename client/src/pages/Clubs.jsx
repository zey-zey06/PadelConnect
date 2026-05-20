import { Building2 } from 'lucide-react';

export default function Clubs() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Clubs</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Découvrez les clubs partenaires à Abidjan.
        </p>
      </div>

      <div className="rounded-xl border border-dashed border-border bg-card p-16 text-center space-y-3">
        <Building2 className="h-10 w-10 text-muted-foreground mx-auto" />
        <p className="font-medium text-foreground">Les clubs arrivent bientôt</p>
        <p className="text-sm text-muted-foreground max-w-xs mx-auto">
          Les fiches des clubs, leurs terrains et leurs créneaux disponibles seront accessibles ici.
        </p>
      </div>
    </div>
  );
}
