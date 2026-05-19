# PLAN — PadelConnect
**Version** : 1.0 | **Date** : 19 mai 2026 | **Deadline** : 1er juin 2026

---

## Vue d'ensemble (13 jours)

| Jours | Bloc | Objectif |
|-------|------|----------|
| J1-J2 | Fondations | Repo, CLAUDE.md, BDD, migrations, seeds |
| J3-J4 | Auth + Profils | JWT, signup/login, profil IA #1 |
| J5-J6 | Sessions | CRUD sessions, demandes, score IA #2 |
| J7-J8 | Clubs + Terrains | Gestion club, terrains, créneaux |
| J9 | Réservation | Booking + options coach/ramasseur + email |
| J10 | Sanctions | Annulation 4h, no-show, amendes, bans |
| J11 | Notifications + Historique | In-app notifs, historique joueur/gérant |
| J12 | Admin + Tests | Dashboard admin, tests Jest, CI |
| J13 | Docker + Déploiement | Dockerfile, Koyeb, URL publique HTTPS |

---

## J1 — Fondations (repo + BDD)

### Objectifs
- Repo GitHub créé, branch `main`
- CLAUDE.md complet (~30 règles)
- Stack installée et fonctionnelle en local
- Schéma BDD complet avec toutes les migrations

### Tâches
- [ ] `git init` + push GitHub
- [ ] Créer `CLAUDE.md` avec 30+ règles (8 sections minimum)
- [ ] Installer stack : Express + Knex + PostgreSQL + React (Vite)
- [ ] Docker Compose pour PostgreSQL local
- [ ] Migrations dans l'ordre :
  1. `organizations` (id, name, slug, status, created_at)
  2. `users` (id, organization_id nullable, email, password_hash, role, status, ban_reason, banned_until, no_show_count, created_at)
  3. `player_profiles` (id, user_id, level, style, strengths, weaknesses, description, photo_url, created_at)
  4. `coach_profiles` (id, user_id, organization_id nullable, specialty, rate, bio, is_independent, created_at)
  5. `sessions` (id, creator_id, date, time, max_players, current_players, status, preferences jsonb, created_at)
  6. `session_requests` (id, session_id, player_id, status, ai_score, ai_explanation, created_at)
  7. `venues` (id, organization_id, name, description, amenities, created_at)
  8. `venue_slots` (id, venue_id, date, start_time, end_time, price, status, created_at)
  9. `bookings` (id, session_id, venue_slot_id, status, cancelled_at, cancellation_reason, created_at)
  10. `booking_addons` (id, booking_id, type [coach|ball_picker], user_id, price, created_at)
  11. `notifications` (id, user_id, type, message, read, created_at)
  12. `no_show_records` (id, user_id, booking_id, type [no_show|late_cancel], amount_due, paid, created_at)
  13. `penalties` (id, user_id, type [club_ban|app_ban], organization_id nullable, amount, paid, expires_at, created_at)

- [ ] Seeds : 2 clubs, 4 terrains chacun, 5 joueurs, 2 coachs, 10 créneaux
- [ ] Vérifier `npx knex migrate:latest` + `npx knex seed:run` ✅

### Commit
```
J1: repo init, CLAUDE.md, migrations complètes, seeds
```

---

## J2 — CLAUDE.md + PRD validé

### Objectifs
- CLAUDE.md validé par passes Critic et Architect
- PRD.md et PLAN.md dans `/docs`
- Structure dossiers propre

### Structure dossiers
```
padelconnect/
├── CLAUDE.md
├── Dockerfile
├── docker-compose.dev.yml
├── docs/
│   ├── PRD.md
│   └── PLAN.md
├── src/
│   ├── app.js
│   ├── db.js
│   ├── auth/
│   ├── features/
│   │   ├── sessions/
│   │   ├── clubs/
│   │   ├── venues/
│   │   ├── bookings/
│   │   ├── coaches/
│   │   ├── notifications/
│   │   └── admin/
│   ├── middleware/
│   ├── ai/
│   └── observability/
├── client/
│   └── src/
│       ├── pages/
│       ├── components/
│       └── hooks/
├── migrations/
├── seeds/
└── e2e/
```

### Commit
```
J2: CLAUDE.md finalisé, PRD + PLAN dans docs, structure dossiers
```

---

## J3 — Auth JWT

### Objectifs
- Signup / Login / Logout fonctionnels
- JWT en cookies httpOnly
- Middleware authenticate opérationnel
- Tests auth verts

### Tâches
- [ ] `src/auth/auth.service.js` — signup (hash bcrypt), login, vérification
- [ ] `src/auth/jwt.js` — sign / verify
- [ ] `src/auth/auth.controller.js` — POST /signup, /login, /logout, GET /me
- [ ] `src/middleware/authenticate.js` — lit cookie, attache req.user
- [ ] `src/auth/auth.validation.js` — Joi schemas
- [ ] `src/auth/auth.test.js` — tests : signup, login, logout, /me, 401
- [ ] Installer : bcrypt, jsonwebtoken, cookie-parser, joi

### Commit
```
J3: JWT auth — signup/login/logout/me, tests verts
```

---

## J4 — Profils joueur + IA #1

### Objectifs
- Création de profil via description libre → Claude génère le profil
- Upload photo de profil
- Tests profil verts

### Tâches
- [ ] `src/ai/generate-profile.js` — appel API Anthropic, prompt engineering
  ```
  System: "Tu es un expert padel. À partir de la description d'un joueur, génère un profil JSON structuré."
  Output format: { niveau (1-7), style, points_forts[], points_faibles[], description_courte }
  ```
- [ ] `src/features/profiles/profile.controller.js`
  - POST /api/profile/generate ← appel IA
  - PUT /api/profile ← mise à jour manuelle
  - POST /api/profile/photo ← upload photo (multer, stockage local)
- [ ] `src/features/profiles/profile.test.js`
- [ ] Installer : multer, @anthropic-ai/sdk

### Commit
```
J4: profil joueur + IA génération profil, upload photo, tests verts
```

---

## J5 — Sessions (CRUD)

### Objectifs
- Créer, lister, voir une session
- Filtres : date, niveau, statut, préférences
- Tests sessions verts

### Tâches
- [ ] `src/features/sessions/sessions.service.js`
  - create(userId, data)
  - listOpen(filters) — sessions avec statut `open`
  - getById(sessionId, userId)
  - updateStatus(sessionId, status)
- [ ] `src/features/sessions/sessions.controller.js`
  - GET /api/sessions?date=&level=&status=
  - POST /api/sessions
  - GET /api/sessions/:id
  - PATCH /api/sessions/:id/status
- [ ] Validation Joi pour création session
- [ ] `src/features/sessions/sessions.test.js`

### Commit
```
J5: sessions CRUD + filtres, tests verts
```

---

## J6 — Demandes + Score IA #2

### Objectifs
- Rejoindre une session (SessionRequest)
- Score de compatibilité IA affiché au créateur
- Accepter/refuser un candidat
- Passage automatique en `complete` à 2+ joueurs confirmés

### Tâches
- [ ] `src/ai/match-score.js` — appel Anthropic
  ```
  Input: profil candidat + profils groupe + préférences session
  Output: { score (0-100), explication }
  ```
- [ ] `src/features/sessions/requests.service.js`
  - createRequest(sessionId, playerId)
  - getRequests(sessionId) — avec score IA calculé à la volée
  - respondToRequest(requestId, status) — accepte/refuse
  - checkSessionComplete(sessionId) — passe en `complete` si ≥2 joueurs
- [ ] `src/features/sessions/requests.controller.js`
  - POST /api/sessions/:id/requests
  - GET /api/sessions/:id/requests ← vue créateur avec scores IA
  - PATCH /api/sessions/:id/requests/:requestId
- [ ] `src/features/sessions/requests.test.js`
- [ ] Notifications : demande reçue, acceptée, refusée, session complète

### Commit
```
J6: demandes session + score IA compatibilité, tests verts
```

---

## J7 — Clubs + Terrains

### Objectifs
- Inscription d'un club
- Ajout de terrains par le gérant
- Gestion des créneaux

### Tâches
- [ ] `src/features/clubs/clubs.service.js`
  - createClub(userId, data) — crée Organization + associe venue_admin
  - getClub(clubId)
  - listClubs()
- [ ] `src/features/clubs/clubs.controller.js`
  - GET /api/clubs
  - POST /api/clubs ← inscription gérant
  - GET /api/clubs/:id
- [ ] `src/features/venues/venues.service.js`
  - addVenue(clubId, data)
  - listVenuesByClub(clubId)
  - getAvailableSlots(venueId, date)
- [ ] `src/features/venues/venues.controller.js`
  - GET /api/clubs/:id/venues
  - POST /api/clubs/:id/venues
  - GET /api/venues/:id/slots?date=
  - POST /api/venues/:id/slots
  - PATCH /api/venues/:id/slots/:slotId
  - DELETE /api/venues/:id/slots/:slotId
- [ ] Tests clubs + venues

### Commit
```
J7: clubs + terrains + créneaux CRUD, tests verts
```

---

## J8 — Coachs + Ramasseurs

### Objectifs
- Inscription coach indépendant
- Ajout coach club par gérant
- Disponibilités coach visibles à la réservation

### Tâches
- [ ] `src/features/coaches/coaches.service.js`
  - createCoach(userId, data) — indépendant ou rattaché
  - listAvailableCoaches(date, time, clubId) — indépendants + coachs du club
  - updateAvailability(coachId, slots)
- [ ] `src/features/coaches/coaches.controller.js`
  - GET /api/coaches?date=&clubId=
  - GET /api/coaches/:id
  - PUT /api/coaches/:id/availability
  - GET /api/clubs/:id/coaches
  - POST /api/clubs/:id/coaches ← gérant ajoute coach club
- [ ] Tests coachs

### Commit
```
J8: coachs indépendants + coachs club + ramasseurs, tests verts
```

---

## J9 — Réservation + Email

### Objectifs
- Flow réservation complet (terrain + options)
- Email de confirmation via Resend
- Visible dans "Mes réservations"

### Tâches
- [ ] `src/features/bookings/bookings.service.js`
  - createBooking(sessionId, slotId, addons) — confirme auto
  - getMyBookings(userId)
  - cancelBooking(bookingId, userId) — vérifie délai 4h
- [ ] `src/features/bookings/bookings.controller.js`
  - POST /api/bookings
  - GET /api/bookings/me
  - DELETE /api/bookings/:id
- [ ] `src/emails/confirmation.js` — template email Resend
- [ ] `src/emails/cancellation.js` — email annulation gérant
- [ ] Tests bookings + email mocké
- [ ] Installer : resend

### Commit
```
J9: réservation complète + addons + email confirmation, tests verts
```

---

## J10 — Sanctions

### Objectifs
- Annulation tardive → pénalité enregistrée
- No-show → amende automatique
- Admin peut déclencher ban app
- Ban club automatique sur répétition

### Tâches
- [ ] `src/features/penalties/penalties.service.js`
  - recordLateCancel(bookingId, userId) — enregistre + email
  - recordNoShow(bookingId, userId) — enregistre amende
  - triggerClubBan(userId, clubId) — si répétition même club
  - triggerAppBan(userId) — admin seulement
  - payPenalty(penaltyId, userId) — déblocage ban
- [ ] `src/features/penalties/penalties.controller.js`
  - GET /api/penalties/me
  - POST /api/admin/bans
  - PATCH /api/admin/penalties/config
- [ ] Email amende + ban
- [ ] Tests sanctions

### Commit
```
J10: système sanctions — annulation tardive, no-show, bans, tests verts
```

---

## J11 — Notifications + Historique

### Objectifs
- Notifications in-app (cloche)
- Historique complet joueur et gérant
- Coach voit ses sessions à venir

### Tâches
- [ ] `src/features/notifications/notifications.service.js`
  - createNotification(userId, type, message)
  - getUnread(userId)
  - markAsRead(notificationId)
- [ ] `src/features/notifications/notifications.controller.js`
  - GET /api/notifications
  - PATCH /api/notifications/:id/read
- [ ] Brancher notifications sur tous les événements (J3 à J10)
- [ ] Endpoint historique joueur (sessions passées + réservations + amendes)
- [ ] Endpoint historique gérant (réservations par terrain)
- [ ] Tests notifications

### Commit
```
J11: notifications in-app + historique joueur/gérant/coach
```

---

## J12 — Admin + Tests + CI

### Objectifs
- Dashboard admin complet
- Suite Jest verte sur tous les chemins critiques
- GitHub Actions CI configuré

### Tâches
- [ ] `src/features/admin/admin.controller.js`
  - GET /api/admin/dashboard — métriques globales
  - GET/PATCH /api/admin/users/:id/status
  - GET /api/admin/noshows
  - GET/PATCH /api/admin/clubs/:id/status
  - GET /api/admin/sessions
- [ ] Middleware `requireAdmin` — vérifie rôle super_admin
- [ ] `.github/workflows/ci.yml`
  - Node 20, PostgreSQL service
  - npm ci + migrations + jest --coverage
- [ ] Vérifier couverture ≥ 70% sur fichiers métier
- [ ] Corriger tous les tests qui échouent

### Commit
```
J12: admin dashboard, suite tests complète, CI GitHub Actions
```

---

## J13 — Docker + Déploiement Koyeb

### Objectifs
- App conteneurisée et déployée
- URL publique HTTPS fonctionnelle
- README complet

### Tâches
- [ ] `Dockerfile` multi-stage (build React + Express)
- [ ] `nginx.conf` — sert React, proxy /api → Express
- [ ] `supervisord.conf`
- [ ] `koyeb.yaml`
- [ ] Test local : `docker build -t padelconnect . && docker run -p 8080:8080 ...`
- [ ] Provisionner Postgres Koyeb
- [ ] Créer secrets Koyeb (DATABASE_URL, JWT_SECRET, ANTHROPIC_API_KEY, RESEND_API_KEY)
- [ ] `koyeb app init padelconnect ...`
- [ ] Migrations sur base Koyeb
- [ ] Vérifier URL publique : `curl https://padelconnect-xxx.koyeb.app/healthz`
- [ ] `README.md` : pitch, captures, install locale, lien démo
- [ ] `.github/workflows/deploy.yml`
- [ ] PR finale ouverte

### Commit
```
J13: Dockerfile, déploiement Koyeb, README, PR finale
```

---

## Règles de priorité (si tu prends du retard)

| Priorité | Feature | Pourquoi |
|----------|---------|----------|
| 🔴 Critique | Auth + Sessions + Réservation + IA | C'est le coeur de l'app |
| 🟡 Important | Clubs + Terrains + Notifications | Sans ça la démo est incomplète |
| 🟢 Bonus | Sanctions + Coach indépendant + Admin complet | Bien mais peut être simplifié |

**Si J12 arrive et tu es en retard :** simplifie les sanctions à un flag `is_banned` sur User, et l'admin dashboard à 3 compteurs. L'essentiel c'est que le flow joueur soit parfait pour la démo.

---

## Variables d'environnement (.env)

```
DATABASE_URL=postgres://...
JWT_SECRET=<64 chars random>
ANTHROPIC_API_KEY=sk-ant-...
RESEND_API_KEY=re_...
EMAIL_FROM=onboarding@resend.dev
CORS_ORIGIN=http://localhost:5173
COOKIE_SECURE=false
NODE_ENV=development
PORT=4000
```
