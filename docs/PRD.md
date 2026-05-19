# PRD — PadelConnect
**Version** : 1.3 | **Date** : 19 mai 2026 | **Auteur** : Zey

---

## 1. Pitch

PadelConnect est une plateforme web qui permet aux joueurs de padel d'Abidjan de trouver des partenaires de même niveau, d'organiser des sessions, et de réserver un terrain avec options (coach, ramasseur) directement depuis l'app. La mise en relation est assistée par une IA qui génère le profil du joueur depuis une description libre.

---

## 2. Problème

Trouver des partenaires de padel à Abidjan est difficile. Tout passe par WhatsApp et le bouche-à-oreille. Pas d'endroit centralisé pour trouver un partenaire du bon niveau, disponible au bon moment, sur le bon terrain.

---

## 3. Solution — 3 interfaces + rôles spécialisés

### Interface Joueur
1. Crée son profil via description libre → IA génère le profil structuré
2. Poste une session (date, heure, nb joueurs souhaité, préférences)
3. Reçoit des demandes, accepte/refuse avec aide du score IA
4. Réservation possible dès 2 joueurs confirmés
5. Choisit un club → terrain disponible → options (coach(s), ramasseur) → réservation auto confirmée
6. Email de confirmation
7. Peut annuler jusqu'à 4h avant gratuitement, après = paiement obligatoire

### Interface Gérant de club
1. Inscrit son club (Organization = tenant)
2. Ajoute ses terrains (1 à N terrains)
3. Gère les créneaux de chaque terrain
4. Ajoute ses coachs club et ramasseurs
5. Voit toutes les réservations + options réservées
6. Peut annuler/modifier un créneau → email auto au joueur

### Interface Coach indépendant
1. S'inscrit comme `coach` (pas joueur)
2. Peut être indépendant (visible sur tous les clubs) ou rattaché à un club
3. Gère ses disponibilités et son tarif
4. Voit ses sessions à venir

### Interface Super Admin
1. Vue globale : utilisateurs, sessions, clubs, réservations
2. Gestion des sanctions : déclencher un ban app, configurer les amendes
3. Modération : suspendre compte, désactiver club
4. Dashboard métriques

---

## 4. Personas

- **Kofi** — joueur régulier, niveau intermédiaire, cherche partenaires le weekend
- **Aya** — joueuse occasionnelle, débutante, préfère jouer entre femmes
- **M. Touré** — gérant d'Elite Club (4 terrains, 2 coachs club)
- **Sébastien** — coach indépendant, visible sur plusieurs clubs
- **Super Admin** — supervise et modère la plateforme

---

## 5. Architecture multi-tenant

```
Organization (Elite Club)
  └── venue_admin (M. Touré)
  └── Venue (Terrain 1) → VenueSlot
  └── Venue (Terrain 2) → VenueSlot
  └── Coach club (Jean)
  └── Ramasseur (Ali)

Coach indépendant (Sébastien)
  → visible sur tous les clubs OU rattaché à un club spécifique

Joueurs → tenant global PadelConnect
Super Admin → accès cross-tenant
```

---

## 6. Entités principales

| Entité | Description |
|--------|-------------|
| `Organization` | Club partenaire (tenant) |
| `User` | Rôles : `player`, `venue_admin`, `coach`, `ball_picker`, `super_admin` |
| `PlayerProfile` | Profil joueur généré par IA (niveau 1-7, style, photo) |
| `CoachProfile` | Profil coach (spécialité, tarif, bio, disponibilités) |
| `Session` | Demande de session d'un joueur |
| `SessionRequest` | Demande pour rejoindre une session |
| `Venue` | Terrain dans un club |
| `VenueSlot` | Créneau disponible (date, heure, tarif) |
| `Booking` | Réservation confirmée |
| `BookingAddon` | Options ajoutées : coach(s) choisis + ramasseur |
| `Notification` | Notification in-app |
| `NoShowRecord` | Historique no-shows et annulations tardives par joueur |
| `Penalty` | Amende ou ban (montant, statut, date expiration) |

---

## 7. Cas d'usage core (v1)

### CU-01 — Création de profil assistée par IA
- Description libre → Claude génère niveau (1-7), style, points forts/faibles
- Upload photo de profil

### CU-02 — Créer une session
- Date, heure, nb joueurs souhaité (2 ou 4), préférences (genre, niveau, âge min)

### CU-03 — Rejoindre une session
- Feed filtré → demande → créateur voit profil + score IA → accepte/refuse
- Réservation possible dès 2 joueurs confirmés

### CU-04 — Réservation avec options
```
Groupe prêt (≥2)
  → Choisir un club
    → Voir terrains disponibles
      → Choisir un terrain
        → Options :
            🎾 Coach(s) disponibles (club ou indépendant) → plusieurs possibles
            🏃 Ramasseur → un seul
          → Réservation confirmée + email Resend
```

### CU-05 — Annulation et sanctions
- **Avant 4h** → annulation gratuite, créneau libéré
- **Après 4h** → paiement du terrain obligatoire (mocké v1)
- **Répétition annulations tardives** → banni du club concerné
- **No-show** → amende automatique (montant défini par admin)
- **Répétition no-shows** → admin peut déclencher ban app
- **Débloquer ban app** → payer la pénalité

### CU-06 — Gestion club (gérant)
- Ajoute/modifie/supprime terrains et créneaux
- Ajoute coachs club et ramasseurs
- Voit toutes les réservations avec options
- Annulation créneau → email joueur

### CU-07 — Gestion coach indépendant
- Crée son profil coach (tarif, spécialité, bio)
- Définit ses disponibilités
- Choisit : indépendant (tous clubs) ou rattaché à un club

### CU-08 — Admin dashboard + sanctions
- Métriques globales
- Voir historique no-shows par joueur
- Déclencher ban app manuellement
- Configurer montant des amendes

### CU-09 — Notifications in-app
- Demande reçue, acceptée/refusée, session complète, réservation confirmée, annulation, amende, ban

### CU-10 — Historique
- Joueur : sessions passées, réservations, amendes
- Gérant : réservations par terrain
- Coach : sessions à venir et passées

---

## 8. Endpoints API

```
POST/GET    /api/auth/*

POST        /api/profile/generate        ← IA #1
PUT         /api/profile
POST        /api/profile/photo

GET/POST    /api/sessions
GET         /api/sessions/:id
PATCH       /api/sessions/:id/status
POST        /api/sessions/:id/requests
PATCH       /api/sessions/:id/requests/:id

GET/POST    /api/clubs
GET         /api/clubs/:id/venues
POST        /api/clubs/:id/venues
GET         /api/clubs/:id/coaches       ← coachs du club
POST        /api/clubs/:id/coaches       ← ajouter coach club
GET         /api/venues/:id/slots
POST/PATCH/DELETE /api/venues/:id/slots/:id

GET         /api/coaches                 ← tous coachs disponibles
GET         /api/coaches/:id
PUT         /api/coaches/:id/availability

POST        /api/bookings
GET         /api/bookings/me
DELETE      /api/bookings/:id            ← annulation (vérifie 4h)

POST        /api/penalties               ← enregistrer no-show/amende
GET         /api/penalties/me

GET/PATCH   /api/notifications/:id/read

GET         /api/admin/dashboard
GET/PATCH   /api/admin/users/:id/status  ← ban/unban
GET         /api/admin/noshows           ← historique no-shows
POST        /api/admin/bans              ← déclencher ban app
GET/PATCH   /api/admin/clubs/:id/status
PATCH       /api/admin/penalties/config  ← configurer montant amendes

POST        /api/ai/generate-profile
POST        /api/ai/match-score          ← IA #2
```

---

## 9. Système de sanctions (règles métier)

| Situation | Conséquence automatique | Action admin |
|-----------|------------------------|--------------|
| Annulation avant 4h | Rien | — |
| Annulation après 4h | Paiement terrain (mocké) | — |
| Répétition annulations tardives (même club) | Ban du club | Admin peut lever |
| No-show | Amende (montant configurable) | — |
| Répétition no-shows | — | Admin déclenche ban app |
| Ban app actif | Compte suspendu | Se débloque en payant pénalité |

---

## 10. IA

**IA #1 — Génération de profil**
Input : texte libre | Output : `{ niveau, style, points_forts, points_faibles, description_courte }`

**IA #2 — Score de compatibilité**
Input : profil candidat + groupe actuel + préférences session | Output : `{ score: 82, explication: "..." }`

---

## 11. Emails (Resend)

| Événement | Destinataire |
|-----------|-------------|
| Inscription | Tout utilisateur |
| Réservation confirmée | Joueur |
| Annulation créneau par gérant | Joueur |
| Annulation tardive (paiement dû) | Joueur |
| Amende no-show | Joueur |
| Ban déclenché | Joueur |

---

## 12. Modèle économique

- **Commission réservation** : 5-10% sur chaque réservation terrain
- **Abonnement club** : forfait mensuel pour être listé (15 000-25 000 FCFA/mois)
- **Premium joueur** (v2) : illimité + fonctionnalités avancées
- **Balance interne** (v2) : recharge compte, évite frais Wave/Orange Money
- **Expansion** (v2) : autres villes (Dakar, Lagos, Douala)

---

## 13. Hors-scope v1 → v2

- Paiement réel (Wave, Orange Money, Visa, balance interne)
- Chat entre joueurs
- Notation post-session
- Google Maps
- Application mobile native
- Multi-ville / multi-tenant
- Classement ELO
- Multi-langue
- Plusieurs admins par club

---

## 14. Stack

Node.js + Express + Knex + PostgreSQL · React (Vite) · JWT httpOnly · API Anthropic · Resend · Docker + Koyeb · GitHub Actions

---

## 15. Critères de succès

- [ ] Profil généré par IA depuis description libre
- [ ] Session créée, candidats acceptés/refusés avec score IA
- [ ] Réservation dès 2 joueurs + options coach/ramasseur
- [ ] Email confirmation réservation
- [ ] Annulation gratuite avant 4h, pénalité après
- [ ] No-show → amende enregistrée
- [ ] Admin peut bannir un joueur
- [ ] Gérant gère club, terrains, créneaux, coachs
- [ ] Coach indépendant visible sur la plateforme
- [ ] Notifications in-app fonctionnelles
- [ ] Historique complet
- [ ] URL publique HTTPS
- [ ] Tests Jest verts + CI GitHub Actions
