import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

function Section({ title, children }) {
  return (
    <div className="space-y-3">
      <h2 className="text-base font-semibold text-foreground">{title}</h2>
      <div className="text-sm text-muted-foreground leading-relaxed space-y-2">{children}</div>
    </div>
  );
}

export default function Terms() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <div className="border-b border-border bg-card px-6 py-4 flex items-center gap-3">
        <Link to="/" className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-4 w-4" />
          <span className="text-sm">Accueil</span>
        </Link>
        <span className="text-muted-foreground/40">·</span>
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded-md bg-primary flex items-center justify-center">
            <span className="text-white font-bold text-[8px]">P</span>
          </div>
          <span className="text-sm font-semibold text-foreground">PadelConnect</span>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 max-w-2xl mx-auto w-full px-6 py-10 space-y-8">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Conditions d'utilisation</h1>
          <p className="text-sm text-muted-foreground mt-2">Dernière mise à jour : juin 2026</p>
        </div>

        <Section title="1. Acceptation des conditions">
          <p>En utilisant PadelConnect, vous acceptez les présentes conditions d'utilisation. Si vous n'acceptez pas ces conditions, veuillez ne pas utiliser notre service.</p>
        </Section>

        <Section title="2. Description du service">
          <p>PadelConnect est une plateforme de mise en relation de joueurs de padel à Abidjan. Nous permettons aux joueurs de créer et rejoindre des sessions, de réserver des terrains, et de trouver des partenaires de jeu.</p>
        </Section>

        <Section title="3. Création de compte">
          <p>Pour utiliser PadelConnect, vous devez créer un compte avec une adresse email valide. Vous êtes responsable de la sécurité de vos identifiants de connexion.</p>
          <p>Vous devez avoir au moins 13 ans pour utiliser notre service. Les utilisateurs de moins de 18 ans doivent avoir l'autorisation parentale.</p>
        </Section>

        <Section title="4. Comportement des utilisateurs">
          <p>Vous vous engagez à :</p>
          <ul className="list-disc list-inside space-y-1 pl-2">
            <li>Fournir des informations exactes sur votre profil</li>
            <li>Respecter les autres joueurs sur la plateforme</li>
            <li>Honorer vos réservations et engagements de session</li>
            <li>Ne pas utiliser la plateforme à des fins illégales ou frauduleuses</li>
          </ul>
        </Section>

        <Section title="5. Réservations et annulations">
          <p>Les réservations sont confirmées automatiquement. L'annulation gratuite est possible jusqu'à 4 heures avant le créneau. Au-delà, une pénalité peut être appliquée conformément à notre politique de sanctions.</p>
          <p>Les no-shows répétés peuvent entraîner la suspension de votre compte.</p>
        </Section>

        <Section title="6. Abonnements clubs">
          <p>Les gérants de clubs peuvent souscrire à un abonnement pour accéder aux fonctionnalités avancées. Les abonnements sont facturés mensuellement et peuvent être résiliés à tout moment.</p>
        </Section>

        <Section title="7. Propriété intellectuelle">
          <p>Tout le contenu de PadelConnect (logo, design, code) est la propriété de PadelConnect. Vous ne pouvez pas reproduire ou utiliser notre contenu sans autorisation écrite.</p>
        </Section>

        <Section title="8. Limitation de responsabilité">
          <p>PadelConnect est une plateforme de mise en relation. Nous ne sommes pas responsables des accidents, litiges ou dommages survenant lors des sessions de padel organisées via notre plateforme.</p>
        </Section>

        <Section title="9. Modification des conditions">
          <p>Nous nous réservons le droit de modifier ces conditions à tout moment. Les utilisateurs seront informés par email des changements significatifs.</p>
        </Section>

        <Section title="10. Contact">
          <p>Pour toute question concernant ces conditions, contactez-nous via notre <Link to="/contact" className="text-primary hover:underline">formulaire de contact</Link>.</p>
        </Section>

        <div className="pt-4 border-t border-border flex gap-4 text-xs text-muted-foreground">
          <Link to="/privacy" className="hover:text-foreground transition-colors">Politique de confidentialité</Link>
          <Link to="/contact" className="hover:text-foreground transition-colors">Contact</Link>
        </div>
      </div>
    </div>
  );
}
