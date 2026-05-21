# CLAUDE.md — PadelConnect

## Project Overview
PadelConnect est une plateforme web multi-tenant de mise en relation de joueurs de padel à Abidjan.
Les clubs sont des tenants isolés — aucun utilisateur ne peut accéder aux données d'un autre club.
Ce fichier contient toutes les règles que Claude Code doit appliquer à chaque session.

---

## Tech Stack
- Backend: Node.js 20 LTS avec Express 4
- Base de données: PostgreSQL 16 avec Knex.js 3
- Frontend: React 18 avec Vite 5
- Tests: Jest (unit + integration)
- Emails: Resend
- IA: Google Gemini API (gemini-1.5-flash)
- Upload photos: Multer (stockage local en v1)
- Containers: Docker multi-stage
- CI/CD: GitHub Actions
- Déploiement: Koyeb

La stack est verrouillée. Ne pas suggérer d'alternatives (Prisma, Next.js, Fastify, etc.).

---

## Architecture
- Les routes appellent les controllers.
- Les controllers appellent les services.
- Les services appellent les repositories.
- Aucune logique métier dans les routes ou les controllers.
- Aucune requête base de données en dehors des repositories.
- Le dossier `client/src/api/` est le seul endroit où fetch() est appelé côté frontend.

---

## Structure des dossiers
```
padelconnect/
├── CLAUDE.md
├── Dockerfile
├── docker-compose.dev.yml
├── nginx.conf
├── supervisord.conf
├── koyeb.yaml
├── docs/
│   ├── PRD.md
│   └── PLAN.md
├── src/
│   ├── app.js
│   ├── db.js
│   ├── auth/
│   │   ├── auth.controller.js
│   │   ├── auth.service.js
│   │   ├── auth.validation.js
│   │   ├── jwt.js
│   │   └── auth.test.js
│   ├── features/
│   │   ├── profiles/
│   │   ├── sessions/
│   │   ├── clubs/
│   │   ├── venues/
│   │   ├── bookings/
│   │   ├── coaches/
│   │   ├── notifications/
│   │   ├── penalties/
│   │   └── admin/
│   ├── middleware/
│   │   ├── authenticate.js
│   │   ├── requireRole.js
│   │   ├── errorHandler.js
│   │   └── validate.js
│   ├── ai/
│   │   ├── generate-profile.js
│   │   └── match-score.js
│   └── emails/
│       ├── confirmation.js
│       └── cancellation.js
├── client/
│   └── src/
│       ├── pages/
│       ├── components/
│       └── api/
├── migrations/
├── seeds/
└── .github/
    └── workflows/
        ├── ci.yml
        └── deploy.yml
```

---

## Multi-tenancy — Règles critiques
- Chaque club est une Organization (tenant).
- TOUTE requête sur les données d'un club DOIT filtrer par organization_id.
- Un joueur ne peut jamais voir les données d'un autre club.
- Le Super Admin est le seul rôle avec accès cross-tenant.
- Retourner 403 (jamais 404) sur les tentatives d'accès cross-tenant.

---

## Sécurité — Non-négociable
- Les JWT DOIVENT être stockés dans des cookies httpOnly + Secure + SameSite=Lax. Jamais localStorage.
- Les mots de passe DOIVENT utiliser bcrypt avec un cost factor de 12 minimum.
- Toute requête qui récupère des données par ID DOIT aussi filtrer par organization_id quand applicable.
- Les secrets (JWT_SECRET, GEMINI_API_KEY, RESEND_API_KEY) uniquement via variables d'environnement. Jamais dans le code.
- Ne jamais committer le fichier .env.
- Valider TOUTES les entrées utilisateur avec Joi au niveau des routes.
- Rate limiting sur les endpoints d'auth : 5 tentatives / 15 minutes par IP.

---

## Rôles utilisateurs
- `player` : joueur standard
- `venue_admin` : gérant d'un club (gère tous les terrains de son Organization)
- `coach` : coach indépendant ou rattaché à un club
- `ball_picker` : ramasseur rattaché à un club
- `super_admin` : accès total cross-tenant

---

## Règles métier critiques
- Une réservation est confirmée automatiquement dès qu'elle est créée. Pas d'approbation manuelle.
- Une session peut être réservée dès 2 joueurs confirmés (pas besoin d'attendre 4).
- Annulation gratuite jusqu'à 4h avant le créneau. Après : pénalité enregistrée.
- No-show : amende automatique enregistrée dans no_show_records.
- Ban club : automatique sur répétition d'annulations tardives dans le même club.
- Ban app : déclenché manuellement par le super_admin uniquement.
- Un joueur banni de l'app ne peut pas réserver tant qu'il n'a pas payé la pénalité.
- Un coach peut être indépendant (visible sur tous les clubs) ou rattaché à un club spécifique.
- Un seul ramasseur par réservation. Plusieurs coachs possibles.

---

## Tests — Règles
- Les tests sont écrits AVANT l'implémentation (TDD).
- Chaque endpoint API doit avoir des tests pour : succès (2xx), 401, 403, 422.
- Les tests cross-tenant doivent vérifier que le 403 est retourné, jamais les données.
- Couverture minimale : 70% sur les fichiers métier (services + repositories).
- Nommer les tests avec les cas d'usage du PRD : "CU-04: session request — cross-tenant returns 403".

---

## IA — Règles
- IA #1 (génération profil) : POST /api/ai/generate-profile — toujours retourner du JSON valide.
- IA #2 (score compatibilité) : POST /api/ai/match-score — score entre 0 et 100 obligatoire.
- En cas d'erreur API Gemini : retourner une réponse dégradée (profil vide / score neutre 50), jamais bloquer l'utilisateur.
- Ne jamais exposer la clé GEMINI_API_KEY côté frontend.
- Modèle à utiliser : gemini-1.5-flash

---

## Emails
- Tous les emails passent par Resend.
- Templates dans src/emails/.
- En cas d'échec d'envoi : logger l'erreur mais ne pas bloquer la réservation.
- Événements email : inscription, réservation confirmée, annulation créneau par gérant, amende no-show, ban.

---

## Frontend — Règles
- Chaque composant qui fetch des données doit avoir 3 états : loading, success, error.
- Les appels API uniquement depuis client/src/api/.
- Les interfaces joueur, gérant et admin sont des routes protégées par rôle.
- Rediriger vers /login si le cookie JWT est absent ou expiré.

---

## Commandes fréquentes
```bash
# Dev
npm run dev              # Lance backend + frontend
docker compose -f docker-compose.dev.yml up -d   # Lance PostgreSQL local

# Base de données
npx knex migrate:latest  # Applique les migrations
npx knex migrate:rollback # Rollback dernière migration
npx knex seed:run        # Lance les seeds

# Tests
npm test                 # Lance Jest
npm test -- --coverage   # Avec couverture

# Build
docker build -t padelconnect .
docker run -p 8080:8080 --env-file .env padelconnect
```

---

## Variables d'environnement requises
```
DATABASE_URL=postgres://...
JWT_SECRET=<64 chars minimum>
GEMINI_API_KEY=AIza...
RESEND_API_KEY=re_...
EMAIL_FROM=onboarding@resend.dev
CORS_ORIGIN=http://localhost:5173
COOKIE_SECURE=false
NODE_ENV=development
PORT=4000
```

---

## Plan d'implémentation
Le plan complet est dans docs/PLAN.md.
Aucune feature ne peut être construite si elle n'est pas dans ce plan sans approbation explicite.

## PRD
Le PRD complet est dans docs/PRD.md.
Les cas d'usage (CU-XX) sont référencés dans tous les noms de tests.

---

## Règles générales
- Soft delete sur toutes les tables user-owned : utiliser deleted_at, jamais DELETE.
- UUIDs pour tous les IDs primaires.
- Timestamps created_at et updated_at sur toutes les tables.
- Format de réponse erreur standard : { status, error, message }.
- Logs structurés JSON en production. Jamais console.log en production.
- /healthz retourne { status: "ok", db: "ok", uptime } — toujours public, sans auth.
