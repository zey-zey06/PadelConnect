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

export default function Privacy() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <div className="border-b border-border bg-card px-6 py-4 flex items-center gap-3">
        <Link to="/" className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-4 w-4" />
          <span className="text-sm">Accueil</span>
        </Link>
        <span className="text-border">·</span>
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded bg-primary flex items-center justify-center">
            <span className="text-white font-bold text-xs">P</span>
          </div>
          <span className="font-semibold text-foreground text-sm">PadelConnect</span>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 px-6 py-12">
        <div className="max-w-2xl mx-auto space-y-8">
          <div className="space-y-2">
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">
              Politique de confidentialité
            </h1>
            <p className="text-sm text-muted-foreground">
              Dernière mise à jour : 25 mai 2026
            </p>
          </div>

          <Section title="1. Qui sommes-nous ?">
            <p>
              PadelConnect est une plateforme de mise en relation de joueurs de padel à Abidjan,
              Côte d'Ivoire. Nous facilitons la réservation de terrains, l'organisation de sessions
              de jeu et le matching entre joueurs grâce à l'intelligence artificielle.
            </p>
            <p>
              Responsable du traitement : PadelConnect — Abidjan, Côte d'Ivoire.<br />
              Contact : support@padelconnect.ci
            </p>
          </Section>

          <Section title="2. Données collectées">
            <p>Nous collectons les données suivantes :</p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>Informations de compte : adresse email, prénom, nom, mot de passe (chiffré)</li>
              <li>Profil joueur : niveau de jeu, style, points forts et faibles, photo de profil</li>
              <li>Numéro de téléphone (optionnel, pour les paiements mobile)</li>
              <li>Historique des sessions et réservations</li>
              <li>Données de navigation : adresse IP, navigateur, pages consultées</li>
            </ul>
          </Section>

          <Section title="3. Utilisation des données">
            <p>Vos données sont utilisées pour :</p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>Créer et gérer votre compte</li>
              <li>Vous mettre en relation avec d'autres joueurs compatibles (matching IA)</li>
              <li>Gérer vos réservations de terrains</li>
              <li>Vous envoyer des notifications et emails liés à vos activités</li>
              <li>Améliorer nos services et prévenir les abus</li>
            </ul>
          </Section>

          <Section title="4. Intelligence artificielle">
            <p>
              Nous utilisons Google Gemini (gemini-1.5-flash) pour analyser les descriptions de
              jeu et calculer des scores de compatibilité entre joueurs. Vos données de profil
              sont envoyées à l'API Google de manière sécurisée et ne sont pas conservées par Google
              au-delà du traitement immédiat.
            </p>
          </Section>

          <Section title="5. Partage des données">
            <p>
              Nous ne vendons pas vos données. Elles peuvent être partagées avec :
            </p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>Les clubs et gérants concernés par vos réservations (nom, email)</li>
              <li>Nos prestataires techniques (hébergement Render, email Resend, IA Google Gemini)</li>
              <li>Les autorités compétentes en cas d'obligation légale</li>
            </ul>
          </Section>

          <Section title="6. Conservation des données">
            <p>
              Vos données sont conservées tant que votre compte est actif. En cas de suppression de
              compte, vos données personnelles sont anonymisées dans un délai de 30 jours.
              Les données de réservation peuvent être conservées à des fins comptables pendant 5 ans.
            </p>
          </Section>

          <Section title="7. Vos droits">
            <p>
              Conformément aux lois applicables, vous disposez des droits suivants :
            </p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>Droit d'accès à vos données personnelles</li>
              <li>Droit de rectification des données inexactes</li>
              <li>Droit à l'effacement (suppression de compte)</li>
              <li>Droit à la portabilité de vos données</li>
              <li>Droit d'opposition au traitement</li>
            </ul>
            <p>
              Pour exercer ces droits, contactez-nous à{' '}
              <a href="mailto:support@padelconnect.ci" className="text-primary hover:underline">
                support@padelconnect.ci
              </a>.
            </p>
          </Section>

          <Section title="8. Cookies">
            <p>
              Nous utilisons un cookie httpOnly sécurisé pour maintenir votre session (JWT).
              Ce cookie est nécessaire au fonctionnement de l'application et ne peut pas être désactivé.
              Nous n'utilisons pas de cookies publicitaires ou de tracking tiers.
            </p>
          </Section>

          <Section title="9. Sécurité">
            <p>
              Vos mots de passe sont chiffrés avec bcrypt (facteur 12). Les communications sont
              chiffrées via HTTPS. L'accès aux données est strictement limité selon les rôles
              utilisateurs.
            </p>
          </Section>

          <Section title="10. Contact">
            <p>
              Pour toute question relative à cette politique ou à vos données :{' '}
              <Link to="/contact" className="text-primary hover:underline">
                Formulaire de contact
              </Link>
              {' '}ou{' '}
              <a href="mailto:support@padelconnect.ci" className="text-primary hover:underline">
                support@padelconnect.ci
              </a>
            </p>
          </Section>
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-border px-6 py-4 text-center text-xs text-muted-foreground">
        © 2026 PadelConnect ·{' '}
        <Link to="/contact" className="hover:text-foreground transition-colors">Contact</Link>
      </div>
    </div>
  );
}
