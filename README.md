# PadelConnect

**Application live : [https://padelconnect.onrender.com](https://padelconnect.onrender.com)**

Plateforme web multi-tenant de mise en relation de joueurs de padel à Abidjan.

## Fonctionnalités

- **Joueurs** — créer / rejoindre des sessions, réserver un terrain, paiement Wave / Orange Money / carte, profil IA généré par Gemini
- **Gérants** — gérer terrains et créneaux, tableau de bord avec revenus, gestion de l'organisation
- **Coachs** — voir leurs sessions à venir / passées
- **Super Admin** — modération des utilisateurs et des clubs
- IA compatibilité : score de matching entre joueurs (0–100)
- Notifications in-app, emails via Resend, export ICS

## Stack

| Couche | Tech |
|--------|------|
| Backend | Node.js 20 · Express 4 · Knex 3 · PostgreSQL 16 |
| Frontend | React 18 · Vite 5 · Tailwind CSS |
| IA | Google Gemini API (gemini-1.5-flash) |
| Emails | Resend |
| Auth | JWT httpOnly cookies |
| Déploiement | Docker · nginx · supervisord · Koyeb |

## Installation locale

### Prérequis

- Node.js 20, Docker Desktop

### 1 — Variables d'environnement

```
cp .env.example .env
# Remplir DATABASE_URL, JWT_SECRET (64 chars min), GEMINI_API_KEY, RESEND_API_KEY
```

### 2 — Base de données (PostgreSQL via Docker)

```bash
docker compose -f docker-compose.dev.yml up -d
npx knex migrate:latest
npx knex seed:run
```

### 3 — Lancer l'application

```bash
npm run dev        # backend (port 4000) + frontend (port 5173) en parallèle
```

Ouvrir [http://localhost:5173](http://localhost:5173)

### Comptes de test (après seed)

| Rôle | Email | Mot de passe |
|------|-------|--------------|
| Joueur | kofi@player.ci | Password123! |
| Gérant | toure@elite-padel.ci | Password123! |
| Super Admin | admin@padelconnect.ci | Admin2026! |

## Tests

```bash
npm test                  # Jest (unit + intégration)
npm test -- --coverage    # Avec rapport de couverture (>70%)
```

## Build Docker

```bash
docker build -t padelconnect .
docker run -p 8080:8080 --env-file .env padelconnect
# → http://localhost:8080
```

## Déploiement Koyeb

1. Créer une app Koyeb liée au repo GitHub
2. Ajouter les secrets Koyeb : `DATABASE_URL`, `JWT_SECRET`, `GEMINI_API_KEY`, `RESEND_API_KEY`, `EMAIL_FROM`, `CORS_ORIGIN`
3. Le `koyeb.yaml` à la racine configure le service (port 8080, health check `/healthz`)
4. Chaque push sur `main` déclenche CI (tests) + redéploiement automatique

## Architecture

```
client/              React SPA (Vite)
src/
  auth/              JWT signup · login · logout · /me
  features/
    sessions/        CRUD sessions · demandes · score IA
    clubs/           Organisations multi-tenant
    venues/          Terrains + créneaux
    bookings/        Réservations + addons
    coaches/         Coachs indépendants / rattachés
    notifications/   In-app notifications
    penalties/       Amendes · bans
    admin/           Dashboard super admin
  ai/                Gemini — génération profil + score matching
  emails/            Templates Resend
migrations/          Knex migrations (13 tables)
```

## Variables d'environnement

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | URL PostgreSQL |
| `JWT_SECRET` | Secret JWT (64 chars min) |
| `GEMINI_API_KEY` | Clé Google Gemini |
| `RESEND_API_KEY` | Clé Resend |
| `EMAIL_FROM` | Adresse expéditeur |
| `CORS_ORIGIN` | Origine autorisée (ex: http://localhost:5173) |
| `PORT` | Port Express (défaut: 4000) |
| `COOKIE_SECURE` | `true` en production, `false` en dev |
| `NODE_ENV` | `development` / `production` / `test` |
