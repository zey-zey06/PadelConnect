const bcrypt = require('bcrypt');

const BCRYPT_COST = 12;

// ── Dynamic dates (always in the future) ─────────────────────────────────────
function iso(daysOffset) {
  const d = new Date();
  d.setDate(d.getDate() + daysOffset);
  return d.toISOString().slice(0, 10);
}

// ── Fixed UUIDs — idempotent re-runs ─────────────────────────────────────────
const IDS = {
  // Organizations
  org1: 'aaaaaaaa-0001-0001-0001-000000000001', // Elite Padel Club
  org2: 'aaaaaaaa-0002-0002-0002-000000000002', // Cocody Padel Academy

  // Super admin
  superAdmin: 'ffffffff-0001-0001-0001-000000000001',

  // Venue admins
  admin1: 'bbbbbbbb-0001-0001-0001-000000000001', // toure@elite-padel.ci
  admin2: 'bbbbbbbb-0002-0002-0002-000000000002', // diallo@cocody-padel.ci

  // Players
  player1: 'cccccccc-0001-0001-0001-000000000001', // kofi@player.ci
  player2: 'cccccccc-0002-0002-0002-000000000002', // aya@player.ci
  player3: 'cccccccc-0003-0003-0003-000000000003', // amara@player.ci
  player4: 'cccccccc-0004-0004-0004-000000000004', // fatou@player.ci
  player5: 'cccccccc-0005-0005-0005-000000000005', // yann@player.ci

  // Coaches
  coach1: 'dddddddd-0001-0001-0001-000000000001', // sébastien — independent
  coach2: 'dddddddd-0002-0002-0002-000000000002', // jean — attached to org1

  // Venues — org1 (Elite Padel)
  venue1: 'eeeeeeee-0001-0001-0001-000000000001',
  venue2: 'eeeeeeee-0002-0002-0002-000000000002',
  venue3: 'eeeeeeee-0003-0003-0003-000000000003',
  venue4: 'eeeeeeee-0004-0004-0004-000000000004',

  // Venues — org2 (Cocody Padel)
  venue5: 'eeeeeeee-0005-0005-0005-000000000005',
  venue6: 'eeeeeeee-0006-0006-0006-000000000006',
  venue7: 'eeeeeeee-0007-0007-0007-000000000007',
  venue8: 'eeeeeeee-0008-0008-0008-000000000008',

  // Venue slots (for bookings)
  slot1:  'f1000001-0001-0001-0001-000000000001', // venue1, +6d, 08:00 ← booking1
  slot2:  'f1000002-0002-0002-0002-000000000002', // venue5, +7d, 14:00 ← booking2
  slot3:  'f1000003-0003-0003-0003-000000000003', // venue1, -4d, 08:00 ← booking3 (past)
  slot4:  'f1000004-0004-0004-0004-000000000004', // venue2, +6d, 09:00
  slot5:  'f1000005-0005-0005-0005-000000000005', // venue2, +7d, 09:00
  slot6:  'f1000006-0006-0006-0006-000000000006', // venue4, +7d, 10:00 (VIP)
  slot7:  'f1000007-0007-0007-0007-000000000007', // venue5, +13d, 07:00
  slot8:  'f1000008-0008-0008-0008-000000000008', // venue6, +9d, 18:00
  slot9:  'f1000009-0009-0009-0009-000000000009', // venue8, +7d, 16:00
  slot10: 'f100000a-000a-000a-000a-00000000000a', // venue8, +9d, 07:00
  slot11: 'f100000b-000b-000b-000b-00000000000b', // venue1, +13d, 10:00
  slot12: 'f100000c-000c-000c-000c-00000000000c', // venue3, +6d, 07:00

  // Sessions
  session1: '11111111-0001-0001-0001-000000000001', // kofi, +6d — has aya joined
  session2: '11111111-0002-0002-0002-000000000002', // aya, +7d — has fatou joined
  session3: '11111111-0003-0003-0003-000000000003', // amara, +9d — level 3+
  session4: '11111111-0004-0004-0004-000000000004', // kofi PAST session (completed)
  session5: '11111111-0005-0005-0005-000000000005', // yann, +13d
  session6: '11111111-0006-0006-0006-000000000006', // fatou, +3d (soon)

  // Bookings
  booking1: '22222222-0001-0001-0001-000000000001', // kofi — upcoming
  booking2: '22222222-0002-0002-0002-000000000002', // aya  — upcoming
  booking3: '22222222-0003-0003-0003-000000000003', // kofi — completed (past)

  // Subscriptions (organization billing)
  sub1: '33333333-0001-0001-0001-000000000001', // org1
  sub2: '33333333-0002-0002-0002-000000000002', // org2

  // Club posts
  post1: '44444444-0001-0001-0001-000000000001',
  post2: '44444444-0002-0002-0002-000000000002',
  post3: '44444444-0003-0003-0003-000000000003',
};

// ── Password credentials ──────────────────────────────────────────────────────
// All demo accounts: Password123!
// Super admin:       Admin2026!

/**
 * @param {import('knex').Knex} knex
 */
exports.seed = async function (knex) {
  // ── Truncate every table in correct FK order ────────────────────────────────
  // Tables that depend on others must be cleared first.
  const tables = [
    'booking_addons',
    'bookings',
    'no_show_records',
    'session_ratings',
    'session_requests',
    'penalties',
    'notifications',
    'push_subscriptions',
    'pia_conversations',
    'messages',
    'friendships',
    'club_posts',
    'club_subscriptions',
    'club_favorites',
    'club_invitations',
    'subscriptions',
    'reviews',
    'sessions',
    'venue_slots',
    'venues',
    'coach_profiles',
    'player_profiles',
    'users',
    'organizations',
  ];
  for (const t of tables) {
    try {
      await knex(t).del();
    } catch {
      // Table might not exist in older schema versions — skip safely
    }
  }

  const now          = new Date();
  const trialEndsAt  = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  const subEndsAt    = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  const hash      = await bcrypt.hash('Password123!', BCRYPT_COST);
  const adminHash = await bcrypt.hash('Admin2026!',   BCRYPT_COST);

  // ── Date strings ─────────────────────────────────────────────────────────────
  const d1    = iso(6);   // upcoming — week 1
  const d2    = iso(7);   // upcoming — week 1
  const d3    = iso(9);   // upcoming — week 2
  const d4    = iso(13);  // upcoming — week 2
  const d5    = iso(3);   // very soon — this week
  const dPast = iso(-4);  // completed 4 days ago

  // ── Organizations ─────────────────────────────────────────────────────────────
  await knex('organizations').insert([
    {
      id:                  IDS.org1,
      name:                'Elite Padel Club',
      slug:                'elite-padel',
      status:              'active',
      subscription_status: 'active',
      trial_ends_at:       trialEndsAt,
      address:             'Zone 3, Marcory, Abidjan',
      latitude:            5.2986175,
      longitude:           -3.9889973,
      description:         'Le club de padel premium d\'Abidjan — 4 terrains indoor & outdoor, coachs certifiés, ambiance conviviale.',
      email:               'contact@elite-padel.ci',
      amenities:           JSON.stringify({
        parking: true, wifi: true, showers: true,
        pro_shop: true, bar: true, air_conditioning: true,
      }),
      opening_hours: JSON.stringify({
        monday: { open: '07:00', close: '22:00', closed: false },
        tuesday: { open: '07:00', close: '22:00', closed: false },
        wednesday: { open: '07:00', close: '22:00', closed: false },
        thursday: { open: '07:00', close: '22:00', closed: false },
        friday: { open: '07:00', close: '22:00', closed: false },
        saturday: { open: '07:00', close: '23:00', closed: false },
        sunday: { open: '08:00', close: '20:00', closed: false },
      }),
      created_at: now,
      updated_at: now,
    },
    {
      id:                  IDS.org2,
      name:                'Cocody Padel Academy',
      slug:                'cocody-padel',
      status:              'active',
      subscription_status: 'active',
      trial_ends_at:       trialEndsAt,
      latitude:            5.3657,
      longitude:           -3.9744,
      description:         'L\'académie de padel de Cocody — cours pour tous niveaux, tournois mensuels.',
      amenities:           JSON.stringify({
        parking: true, wifi: true, showers: true, coaching: true,
      }),
      opening_hours: JSON.stringify({
        monday: { open: '08:00', close: '21:00', closed: false },
        tuesday: { open: '08:00', close: '21:00', closed: false },
        wednesday: { open: '08:00', close: '21:00', closed: false },
        thursday: { open: '08:00', close: '21:00', closed: false },
        friday: { open: '08:00', close: '21:00', closed: false },
        saturday: { open: '07:00', close: '22:00', closed: false },
        sunday: { open: '09:00', close: '18:00', closed: false },
      }),
      created_at: now,
      updated_at: now,
    },
  ]);

  // ── Users ─────────────────────────────────────────────────────────────────────
  await knex('users').insert([
    {
      id: IDS.superAdmin,
      organization_id: null,
      email: 'admin@padelconnect.ci',
      password_hash: adminHash,
      role: 'super_admin',
      first_name: 'Super',
      last_name: 'Admin',
      username: 'superadmin',
      status: 'active',
      email_verified: true,
      no_show_count: 0,
      balance: 0,
      created_at: now,
      updated_at: now,
    },
    // ── Venue admins
    {
      id: IDS.admin1,
      organization_id: IDS.org1,
      email: 'toure@elite-padel.ci',
      password_hash: hash,
      role: 'venue_admin',
      first_name: 'Moussa',
      last_name: 'Touré',
      username: 'toure_elite',
      status: 'active',
      email_verified: true,
      no_show_count: 0,
      balance: 0,
      created_at: now,
      updated_at: now,
    },
    {
      id: IDS.admin2,
      organization_id: IDS.org2,
      email: 'diallo@cocody-padel.ci',
      password_hash: hash,
      role: 'venue_admin',
      first_name: 'Ibrahim',
      last_name: 'Diallo',
      username: 'diallo_cocody',
      status: 'active',
      email_verified: true,
      no_show_count: 0,
      balance: 0,
      created_at: now,
      updated_at: now,
    },
    // ── Players
    {
      id: IDS.player1,
      organization_id: null,
      email: 'kofi@player.ci',
      password_hash: hash,
      role: 'player',
      first_name: 'Kofi',
      last_name: 'Mensah',
      username: 'kofi_padel',
      status: 'active',
      email_verified: true,
      no_show_count: 0,
      balance: 25000,
      created_at: now,
      updated_at: now,
    },
    {
      id: IDS.player2,
      organization_id: null,
      email: 'aya@player.ci',
      password_hash: hash,
      role: 'player',
      first_name: 'Aya',
      last_name: 'Coulibaly',
      username: 'aya_coul',
      status: 'active',
      email_verified: true,
      no_show_count: 0,
      balance: 10000,
      created_at: now,
      updated_at: now,
    },
    {
      id: IDS.player3,
      organization_id: null,
      email: 'amara@player.ci',
      password_hash: hash,
      role: 'player',
      first_name: 'Amara',
      last_name: 'Koné',
      username: 'amara_kone',
      status: 'active',
      email_verified: true,
      no_show_count: 0,
      balance: 5000,
      created_at: now,
      updated_at: now,
    },
    {
      id: IDS.player4,
      organization_id: null,
      email: 'fatou@player.ci',
      password_hash: hash,
      role: 'player',
      first_name: 'Fatou',
      last_name: 'Traoré',
      username: 'fatou_traore',
      status: 'active',
      email_verified: true,
      no_show_count: 0,
      balance: 0,
      created_at: now,
      updated_at: now,
    },
    {
      id: IDS.player5,
      organization_id: null,
      email: 'yann@player.ci',
      password_hash: hash,
      role: 'player',
      first_name: 'Yann',
      last_name: 'Brou',
      username: 'yann_brou',
      status: 'active',
      email_verified: true,
      no_show_count: 0,
      balance: 50000,
      created_at: now,
      updated_at: now,
    },
    // ── Coaches
    {
      id: IDS.coach1,
      organization_id: null,
      email: 'sebastien@coach.ci',
      password_hash: hash,
      role: 'coach',
      first_name: 'Sébastien',
      last_name: 'Dupont',
      username: 'seb_coach',
      status: 'active',
      email_verified: true,
      no_show_count: 0,
      balance: 0,
      created_at: now,
      updated_at: now,
    },
    {
      id: IDS.coach2,
      organization_id: IDS.org1,
      email: 'jean@coach.ci',
      password_hash: hash,
      role: 'coach',
      first_name: 'Jean',
      last_name: 'Nguesso',
      username: 'jean_coach',
      status: 'active',
      email_verified: true,
      no_show_count: 0,
      balance: 0,
      created_at: now,
      updated_at: now,
    },
  ]);

  // ── Player profiles ───────────────────────────────────────────────────────────
  await knex('player_profiles').insert([
    {
      user_id:      IDS.player1,
      level:        4,
      style:        'Attaquant',
      strengths:    JSON.stringify(['Smash', 'Volée', 'Service']),
      weaknesses:   JSON.stringify(['Revers', 'Défense fond de court']),
      bio:          'Joueur régulier niveau intermédiaire, disponible le weekend et certains soirs. Je cherche des partenaires motivés pour progresser !',
      photo_url:    'https://api.dicebear.com/7.x/notionists/svg?seed=kofi&backgroundColor=b6e3f4',
      phone_number: '+225 07 01 23 45 67',
      is_available: true,
      preferred_time: 'Soir',
      motivation_answer: 'Progresser rapidement et trouver des partenaires réguliers.',
      created_at:   now,
      updated_at:   now,
    },
    {
      user_id:      IDS.player2,
      level:        2,
      style:        'Défensif',
      strengths:    JSON.stringify(['Régularité', 'Placement']),
      weaknesses:   JSON.stringify(['Puissance', 'Service']),
      bio:          'Joueuse occasionnelle débutante, préfère jouer entre femmes ou en mixte sympa. Disponible le samedi matin.',
      photo_url:    'https://api.dicebear.com/7.x/notionists/svg?seed=aya&backgroundColor=ffd5dc',
      phone_number: '+225 05 98 76 54 32',
      is_available: true,
      preferred_time: 'Matin',
      motivation_answer: 'Découvrir le padel dans une ambiance détendue.',
      created_at:   now,
      updated_at:   now,
    },
    {
      user_id:      IDS.player3,
      level:        5,
      style:        'Complet',
      strengths:    JSON.stringify(['Endurance', 'Tactique', 'Service']),
      weaknesses:   JSON.stringify(['Lob défensif']),
      bio:          'Joueur expérimenté, disponible en semaine. J\'organise souvent des sessions le matin.',
      photo_url:    'https://api.dicebear.com/7.x/notionists/svg?seed=amara&backgroundColor=c0aede',
      is_available: false,
      preferred_time: 'Matin',
      motivation_answer: 'Maintenir un bon niveau et rencontrer de nouveaux joueurs.',
      created_at:   now,
      updated_at:   now,
    },
    {
      user_id:      IDS.player4,
      level:        3,
      style:        'Défensif',
      strengths:    JSON.stringify(['Patience', 'Défense', 'Constance']),
      weaknesses:   JSON.stringify(['Attaque', 'Smash']),
      bio:          'Joueuse intermédiaire, cherche sessions mixtes ou féminines conviviales. Passionnée de padel depuis 2 ans.',
      photo_url:    'https://api.dicebear.com/7.x/notionists/svg?seed=fatou&backgroundColor=ffdfbf',
      phone_number: '+225 07 44 55 66 77',
      is_available: true,
      preferred_time: 'Après-midi',
      motivation_answer: 'M\'améliorer et jouer dans une bonne ambiance.',
      created_at:   now,
      updated_at:   now,
    },
    {
      user_id:      IDS.player5,
      level:        6,
      style:        'Attaquant',
      strengths:    JSON.stringify(['Smash', 'Vitesse', 'Anticipation', 'Service']),
      weaknesses:   JSON.stringify(['Patience en défense']),
      bio:          'Joueur avancé, compétitif. Tôt le matin ou tard le soir. Niveau minimum 4 svp. Je prépare les tournois.',
      photo_url:    'https://api.dicebear.com/7.x/notionists/svg?seed=yann&backgroundColor=d1d4f9',
      is_available: true,
      preferred_time: 'Matin',
      motivation_answer: 'Participer aux tournois et atteindre le niveau expert.',
      created_at:   now,
      updated_at:   now,
    },
  ]);

  // ── Coach profiles ────────────────────────────────────────────────────────────
  await knex('coach_profiles').insert([
    {
      user_id:        IDS.coach1,
      organization_id: null,
      specialty:      'Technique et tactique',
      rate:           15000,
      bio:            'Coach indépendant certifié FFT, 8 ans d\'expérience à Abidjan. Visible sur tous les clubs.',
      is_independent: true,
      is_ball_picker: false,
      created_at:     now,
      updated_at:     now,
    },
    {
      user_id:        IDS.coach2,
      organization_id: IDS.org1,
      specialty:      'Débutants et perfectionnement',
      rate:           12000,
      bio:            'Coach rattaché à Elite Padel Club. Spécialisé dans l\'accueil des débutants.',
      is_independent: false,
      is_ball_picker: false,
      created_at:     now,
      updated_at:     now,
    },
  ]);

  // ── Venues ────────────────────────────────────────────────────────────────────
  await knex('venues').insert([
    // Elite Padel — 4 terrains
    {
      id: IDS.venue1,
      organization_id: IDS.org1,
      name: 'Terrain 1 — Panoramique',
      description: 'Terrain extérieur couvert avec vue sur le lagon. Sol synthétique premium.',
      amenities: JSON.stringify(['Éclairage LED', 'Vestiaires', 'WiFi']),
      created_at: now, updated_at: now,
    },
    {
      id: IDS.venue2,
      organization_id: IDS.org1,
      name: 'Terrain 2 — Intérieur A',
      description: 'Terrain intérieur climatisé, sol en moquette bleue.',
      amenities: JSON.stringify(['Climatisation', 'Vestiaires']),
      created_at: now, updated_at: now,
    },
    {
      id: IDS.venue3,
      organization_id: IDS.org1,
      name: 'Terrain 3 — Intérieur B',
      description: 'Terrain intérieur climatisé, idéal pour débutants.',
      amenities: JSON.stringify(['Climatisation', 'Vestiaires', 'Location de raquettes']),
      created_at: now, updated_at: now,
    },
    {
      id: IDS.venue4,
      organization_id: IDS.org1,
      name: 'Terrain 4 — VIP',
      description: 'Terrain premium avec espace lounge privatisé.',
      amenities: JSON.stringify(['Éclairage LED', 'Lounge', 'Service boissons', 'Vestiaires VIP']),
      created_at: now, updated_at: now,
    },
    // Cocody Padel — 4 terrains
    {
      id: IDS.venue5,
      organization_id: IDS.org2,
      name: 'Terrain A — Central',
      description: 'Terrain central de l\'académie, utilisé pour les tournois.',
      amenities: JSON.stringify(['Tribune', 'Éclairage LED', 'Vestiaires']),
      created_at: now, updated_at: now,
    },
    {
      id: IDS.venue6,
      organization_id: IDS.org2,
      name: 'Terrain B — Entraînement',
      description: 'Terrain dédié aux entraînements et cours collectifs.',
      amenities: JSON.stringify(['Filets de pratique', 'Paniers de balles']),
      created_at: now, updated_at: now,
    },
    {
      id: IDS.venue7,
      organization_id: IDS.org2,
      name: 'Terrain C — Extérieur',
      description: 'Terrain extérieur non couvert, ambiance plein air.',
      amenities: JSON.stringify(['Éclairage nocturne', 'Bancs']),
      created_at: now, updated_at: now,
    },
    {
      id: IDS.venue8,
      organization_id: IDS.org2,
      name: 'Terrain D — Indoor',
      description: 'Salle indoor avec sol en gazon synthétique.',
      amenities: JSON.stringify(['Climatisation', 'Vestiaires', 'WiFi']),
      created_at: now, updated_at: now,
    },
  ]);

  // ── Venue slots ───────────────────────────────────────────────────────────────
  // slot1/2/3 are linked to bookings — use 'booked' status.
  // Others are available.
  await knex('venue_slots').insert([
    // ── slots for bookings ────────────────────────────
    {
      id: IDS.slot1, venue_id: IDS.venue1,
      date: d1, start_time: '08:00', end_time: '09:30',
      price: 10000, status: 'booked',
      created_at: now, updated_at: now,
    },
    {
      id: IDS.slot2, venue_id: IDS.venue5,
      date: d2, start_time: '14:00', end_time: '15:30',
      price: 9000, status: 'booked',
      created_at: now, updated_at: now,
    },
    {
      id: IDS.slot3, venue_id: IDS.venue1,
      date: dPast, start_time: '08:00', end_time: '09:30',
      price: 10000, status: 'booked',
      created_at: now, updated_at: now,
    },
    // ── available slots ───────────────────────────────
    {
      id: IDS.slot4, venue_id: IDS.venue2,
      date: d1, start_time: '09:00', end_time: '10:30',
      price: 8000, status: 'available',
      created_at: now, updated_at: now,
    },
    {
      id: IDS.slot5, venue_id: IDS.venue2,
      date: d2, start_time: '09:00', end_time: '10:30',
      price: 8000, status: 'available',
      created_at: now, updated_at: now,
    },
    {
      id: IDS.slot6, venue_id: IDS.venue4,
      date: d2, start_time: '10:00', end_time: '11:30',
      price: 20000, status: 'available',
      created_at: now, updated_at: now,
    },
    {
      id: IDS.slot7, venue_id: IDS.venue5,
      date: d4, start_time: '07:00', end_time: '08:30',
      price: 9000, status: 'available',
      created_at: now, updated_at: now,
    },
    {
      id: IDS.slot8, venue_id: IDS.venue6,
      date: d3, start_time: '18:00', end_time: '19:30',
      price: 7000, status: 'available',
      created_at: now, updated_at: now,
    },
    {
      id: IDS.slot9, venue_id: IDS.venue8,
      date: d2, start_time: '16:00', end_time: '17:30',
      price: 11000, status: 'available',
      created_at: now, updated_at: now,
    },
    {
      id: IDS.slot10, venue_id: IDS.venue8,
      date: d3, start_time: '07:00', end_time: '08:30',
      price: 11000, status: 'available',
      created_at: now, updated_at: now,
    },
    {
      id: IDS.slot11, venue_id: IDS.venue1,
      date: d4, start_time: '10:00', end_time: '11:30',
      price: 10000, status: 'available',
      created_at: now, updated_at: now,
    },
    {
      id: IDS.slot12, venue_id: IDS.venue3,
      date: d1, start_time: '07:00', end_time: '08:30',
      price: 8000, status: 'available',
      created_at: now, updated_at: now,
    },
  ]);

  // ── Sessions ──────────────────────────────────────────────────────────────────
  await knex('sessions').insert([
    {
      id: IDS.session1,
      creator_id: IDS.player1,
      date: d1, time: '08:00', end_time: '09:30',
      max_players: 4, current_players: 2,
      status: 'open',
      location: 'Elite Padel Club — Terrain 1',
      preferences: JSON.stringify({ level_min: 2 }),
      created_at: now, updated_at: now,
    },
    {
      id: IDS.session2,
      creator_id: IDS.player2,
      date: d2, time: '14:00', end_time: '15:30',
      max_players: 4, current_players: 2,
      status: 'open',
      location: 'Cocody Padel Academy',
      preferences: JSON.stringify({ gender: 'mixed' }),
      created_at: now, updated_at: now,
    },
    {
      id: IDS.session3,
      creator_id: IDS.player3,
      date: d3, time: '18:00', end_time: '19:30',
      max_players: 4, current_players: 1,
      status: 'open',
      preferences: JSON.stringify({ level_min: 3 }),
      created_at: now, updated_at: now,
    },
    {
      id: IDS.session4,
      creator_id: IDS.player1,
      date: dPast, time: '08:00', end_time: '09:30',
      max_players: 4, current_players: 4,
      status: 'complete',
      location: 'Elite Padel Club',
      preferences: null,
      created_at: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000),
      updated_at: new Date(now.getTime() - 4 * 24 * 60 * 60 * 1000),
    },
    {
      id: IDS.session5,
      creator_id: IDS.player5,
      date: d4, time: '07:00', end_time: '08:30',
      max_players: 2, current_players: 1,
      status: 'open',
      preferences: JSON.stringify({ level_min: 5 }),
      created_at: now, updated_at: now,
    },
    {
      id: IDS.session6,
      creator_id: IDS.player4,
      date: d5, time: '10:00', end_time: '11:30',
      max_players: 4, current_players: 1,
      status: 'open',
      preferences: JSON.stringify({ gender: 'women' }),
      created_at: now, updated_at: now,
    },
  ]);

  // ── Session requests (participants) ──────────────────────────────────────────
  await knex('session_requests').insert([
    // session1 (kofi): aya accepted, amara pending
    {
      session_id: IDS.session1, player_id: IDS.player2,
      status: 'accepted', role: 'player',
      created_at: now, updated_at: now,
    },
    {
      session_id: IDS.session1, player_id: IDS.player3,
      status: 'pending', role: 'player',
      created_at: now, updated_at: now,
    },
    // session2 (aya): fatou accepted, kofi pending
    {
      session_id: IDS.session2, player_id: IDS.player4,
      status: 'accepted', role: 'player',
      created_at: now, updated_at: now,
    },
    {
      session_id: IDS.session2, player_id: IDS.player1,
      status: 'pending', role: 'player',
      created_at: now, updated_at: now,
    },
    // session3 (amara): level 3+, kofi pending
    {
      session_id: IDS.session3, player_id: IDS.player1,
      status: 'pending', role: 'player',
      created_at: now, updated_at: now,
    },
    // session4 (kofi past complete): aya, amara, fatou accepted
    {
      session_id: IDS.session4, player_id: IDS.player2,
      status: 'accepted', role: 'player',
      created_at: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000),
      updated_at: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000),
    },
    {
      session_id: IDS.session4, player_id: IDS.player3,
      status: 'accepted', role: 'player',
      created_at: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000),
      updated_at: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000),
    },
    {
      session_id: IDS.session4, player_id: IDS.player4,
      status: 'accepted', role: 'player',
      created_at: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000),
      updated_at: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000),
    },
  ]);

  // ── Bookings ──────────────────────────────────────────────────────────────────
  await knex('bookings').insert([
    {
      id: IDS.booking1,
      session_id: IDS.session1,
      venue_slot_id: IDS.slot1,
      status: 'confirmed',
      payment_method: 'wave',
      created_at: now, updated_at: now,
    },
    {
      id: IDS.booking2,
      session_id: IDS.session2,
      venue_slot_id: IDS.slot2,
      status: 'confirmed',
      payment_method: 'orange_money',
      created_at: now, updated_at: now,
    },
    {
      id: IDS.booking3,
      session_id: IDS.session4,
      venue_slot_id: IDS.slot3,
      status: 'confirmed',
      payment_method: 'on_arrival',
      created_at: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000),
      updated_at: new Date(now.getTime() - 4 * 24 * 60 * 60 * 1000),
    },
  ]);

  // ── Subscriptions (club billing) ──────────────────────────────────────────────
  await knex('subscriptions').insert([
    {
      id: IDS.sub1,
      organization_id: IDS.org1,
      plan: 'venue_monthly',
      amount: 12000,
      venue_count: 4,
      status: 'active',
      payment_method: 'wave',
      current_period_start: now,
      current_period_end: subEndsAt,
      paid_at: now,
      created_at: now,
    },
    {
      id: IDS.sub2,
      organization_id: IDS.org2,
      plan: 'venue_monthly',
      amount: 12000,
      venue_count: 4,
      status: 'active',
      payment_method: 'wave',
      current_period_start: now,
      current_period_end: subEndsAt,
      paid_at: now,
      created_at: now,
    },
  ]);

  // ── Club subscriptions (players following clubs) ──────────────────────────────
  await knex('club_subscriptions').insert([
    { user_id: IDS.player1, organization_id: IDS.org1, created_at: now },
    { user_id: IDS.player2, organization_id: IDS.org1, created_at: now },
    { user_id: IDS.player3, organization_id: IDS.org1, created_at: now },
    { user_id: IDS.player3, organization_id: IDS.org2, created_at: now },
    { user_id: IDS.player4, organization_id: IDS.org2, created_at: now },
    { user_id: IDS.player5, organization_id: IDS.org1, created_at: now },
  ]);

  // ── Club favorites ────────────────────────────────────────────────────────────
  await knex('club_favorites').insert([
    { user_id: IDS.player1, organization_id: IDS.org1, created_at: now },
    { user_id: IDS.player2, organization_id: IDS.org1, created_at: now },
    { user_id: IDS.player5, organization_id: IDS.org1, created_at: now },
  ]);

  // ── Friendships ───────────────────────────────────────────────────────────────
  await knex('friendships').insert([
    { requester_id: IDS.player1, addressee_id: IDS.player2, status: 'accepted', created_at: now, updated_at: now },
    { requester_id: IDS.player1, addressee_id: IDS.player3, status: 'accepted', created_at: now, updated_at: now },
    { requester_id: IDS.player2, addressee_id: IDS.player4, status: 'accepted', created_at: now, updated_at: now },
    { requester_id: IDS.player3, addressee_id: IDS.player5, status: 'accepted', created_at: now, updated_at: now },
    { requester_id: IDS.player1, addressee_id: IDS.player5, status: 'pending',  created_at: now, updated_at: now },
  ]);

  // ── Club posts (Elite Padel) ───────────────────────────────────────────────────
  await knex('club_posts').insert([
    {
      id: IDS.post1,
      organization_id: IDS.org1,
      content: '🎾 Bienvenue à Elite Padel Club !\n\nNous sommes heureux d\'accueillir nos nouveaux membres cette saison. Nos 4 terrains sont désormais disponibles 7j/7 de 7h à 22h. Réservez dès maintenant via PadelConnect !',
      photos: JSON.stringify([]),
      created_at: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000),
      updated_at: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000),
    },
    {
      id: IDS.post2,
      organization_id: IDS.org1,
      content: `🏆 Tournoi mensuel samedi ${d4} !\n\nInscriptions ouvertes pour notre tournoi amical. Toutes les paires sont les bienvenues, niveaux 3 et plus. Venez jouer et faire connaissance dans une ambiance conviviale. Places limitées — réservez vite !`,
      photos: JSON.stringify([]),
      created_at: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000),
      updated_at: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000),
    },
    {
      id: IDS.post3,
      organization_id: IDS.org1,
      content: '📣 Coaching disponible avec Sébastien Dupont !\n\nNotre coach certifié FFT est disponible du lundi au vendredi pour des cours particuliers ou collectifs. Tarif : 15 000 FCFA / heure. Contactez-le directement via Messages.',
      photos: JSON.stringify([]),
      created_at: now,
      updated_at: now,
    },
  ]);

  // ── Reviews (players reviewing Elite Padel Club) ──────────────────────────────
  await knex('reviews').insert([
    {
      reviewer_id: IDS.player1,
      target_id:   IDS.org1,
      target_type: 'club',
      rating:      5,
      comment:     'Excellent club ! Terrains impeccables, personnel super accueillant. Je recommande à 100%.',
      created_at:  new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000),
    },
    {
      reviewer_id: IDS.player2,
      target_id:   IDS.org1,
      target_type: 'club',
      rating:      4,
      comment:     'Très bonne ambiance, terrains bien entretenus. Vestiaires un peu petits mais globalement top !',
      created_at:  new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000),
    },
    {
      reviewer_id: IDS.player3,
      target_id:   IDS.org1,
      target_type: 'club',
      rating:      5,
      comment:     'Les meilleures installations de padel à Abidjan. Le terrain panoramique est incroyable.',
      created_at:  new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000),
    },
    {
      reviewer_id: IDS.player5,
      target_id:   IDS.org1,
      target_type: 'club',
      rating:      4,
      comment:     'Niveau de jeu élevé, j\'adore. Peut mieux faire sur la disponibilité des créneaux tôt le matin.',
      created_at:  now,
    },
    // Cocody Padel reviews
    {
      reviewer_id: IDS.player3,
      target_id:   IDS.org2,
      target_type: 'club',
      rating:      4,
      comment:     'Académie sérieuse, coachs compétents. Idéal pour progresser.',
      created_at:  new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000),
    },
    {
      reviewer_id: IDS.player4,
      target_id:   IDS.org2,
      target_type: 'club',
      rating:      5,
      comment:     'Super ambiance, personnel aux petits soins. Je reviens toutes les semaines !',
      created_at:  now,
    },
  ]);

  // ── Messages (kofi ↔ aya demo conversation) ────────────────────────────────────
  const msgBase = now.getTime() - 2 * 60 * 60 * 1000;
  await knex('messages').insert([
    {
      sender_id: IDS.player1, receiver_id: IDS.player2,
      content: 'Salut Aya ! Tu joues ce weekend ? J\'organise une session samedi matin.',
      read: true, type: 'text',
      created_at: new Date(msgBase),
    },
    {
      sender_id: IDS.player2, receiver_id: IDS.player1,
      content: 'Oui bien sûr ! J\'ai vu ta session sur PadelConnect, j\'ai demandé à rejoindre.',
      read: true, type: 'text',
      created_at: new Date(msgBase + 5 * 60 * 1000),
    },
    {
      sender_id: IDS.player1, receiver_id: IDS.player2,
      content: 'Parfait, j\'ai accepté ta demande 🎾 Rendez-vous à Elite Padel à 8h !',
      read: true, type: 'text',
      created_at: new Date(msgBase + 10 * 60 * 1000),
    },
    {
      sender_id: IDS.player2, receiver_id: IDS.player1,
      content: 'Top ! On cherche encore 2 joueurs, tu connais quelqu\'un ?',
      read: false, type: 'text',
      created_at: new Date(msgBase + 15 * 60 * 1000),
    },
    // amara → kofi
    {
      sender_id: IDS.player3, receiver_id: IDS.player1,
      content: 'Kofi, j\'ai envoyé une demande pour ta session samedi. Niveau 5, ça va ?',
      read: false, type: 'text',
      created_at: new Date(msgBase + 20 * 60 * 1000),
    },
  ]);

  // ── Notifications ─────────────────────────────────────────────────────────────
  const n = (userId, type, message, read = false, createdAgo = 0) => ({
    user_id:    userId,
    type,
    message,
    read,
    created_at: new Date(now.getTime() - createdAgo * 60 * 1000),
    updated_at: new Date(now.getTime() - createdAgo * 60 * 1000),
  });

  await knex('notifications').insert([
    // kofi
    n(IDS.player1, 'welcome',         'Bienvenue sur PadelConnect ! 🎾', true, 1440),
    n(IDS.player1, 'booking_confirmed', 'Votre réservation chez Elite Padel est confirmée — samedi 8h00.', false, 60),
    n(IDS.player1, 'request_accepted',  'Aya Coulibaly a rejoint votre session du samedi !', false, 45),
    n(IDS.player1, 'session_request',   'Amara Koné souhaite rejoindre votre session du samedi.', false, 30),
    n(IDS.player1, 'friend_accepted',   'Amara Koné a accepté votre demande d\'ami.', true, 120),
    n(IDS.player1, 'new_message',       'Nouveau message d\'Aya Coulibaly.', false, 15),

    // aya
    n(IDS.player2, 'welcome',           'Bienvenue sur PadelConnect ! 🎾', true, 1440),
    n(IDS.player2, 'request_accepted',  'Kofi Mensah a accepté votre demande — vous rejoignez sa session !', false, 40),
    n(IDS.player2, 'booking_confirmed', 'Votre réservation chez Cocody Padel est confirmée — dimanche 14h00.', false, 55),
    n(IDS.player2, 'friend_request',    'Kofi Mensah vous a envoyé une demande d\'ami.', true, 200),

    // amara
    n(IDS.player3, 'welcome',         'Bienvenue sur PadelConnect ! 🎾', true, 1440),
    n(IDS.player3, 'session_request', 'Votre demande pour la session de Kofi est en attente.', false, 30),
    n(IDS.player3, 'friend_accepted', 'Yann Brou a accepté votre demande d\'ami.', true, 90),

    // fatou
    n(IDS.player4, 'welcome',        'Bienvenue sur PadelConnect ! 🎾', true, 1440),
    n(IDS.player4, 'request_accepted', 'Aya Coulibaly a accepté votre demande de session !', false, 50),

    // yann
    n(IDS.player5, 'welcome',       'Bienvenue sur PadelConnect ! 🎾', true, 1440),
    n(IDS.player5, 'friend_request', 'Kofi Mensah vous a envoyé une demande d\'ami.', false, 25),
  ]);

  console.log('✅ Seed completed successfully:');
  console.log(`   📅 Session dates: ${d1}, ${d2}, ${d3}, ${d4}, ${d5}, ${dPast}`);
  console.log('   👤 Accounts:');
  console.log('      kofi@player.ci      / Password123!  (player, niv.4)');
  console.log('      aya@player.ci       / Password123!  (player, niv.2)');
  console.log('      amara@player.ci     / Password123!  (player, niv.5)');
  console.log('      fatou@player.ci     / Password123!  (player, niv.3)');
  console.log('      yann@player.ci      / Password123!  (player, niv.6)');
  console.log('      toure@elite-padel.ci / Password123! (gérant Elite Padel)');
  console.log('      diallo@cocody-padel.ci / Password123! (gérant Cocody)');
  console.log('      sebastien@coach.ci  / Password123!  (coach indépendant)');
  console.log('      admin@padelconnect.ci / Admin2026!  (super admin)');
};
