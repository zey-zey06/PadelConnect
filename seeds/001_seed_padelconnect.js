const bcrypt = require('bcrypt');

const BCRYPT_COST = 12;

// Fixed UUIDs so seeds are idempotent
const IDS = {
  // Organizations
  org1: 'aaaaaaaa-0001-0001-0001-000000000001',
  org2: 'aaaaaaaa-0002-0002-0002-000000000002',

  // Users — venue admins
  admin1: 'bbbbbbbb-0001-0001-0001-000000000001',
  admin2: 'bbbbbbbb-0002-0002-0002-000000000002',

  // Users — players
  player1: 'cccccccc-0001-0001-0001-000000000001',
  player2: 'cccccccc-0002-0002-0002-000000000002',
  player3: 'cccccccc-0003-0003-0003-000000000003',
  player4: 'cccccccc-0004-0004-0004-000000000004',
  player5: 'cccccccc-0005-0005-0005-000000000005',

  // Users — coaches
  coach1: 'dddddddd-0001-0001-0001-000000000001',
  coach2: 'dddddddd-0002-0002-0002-000000000002',

  // Venues — org1
  venue1: 'eeeeeeee-0001-0001-0001-000000000001',
  venue2: 'eeeeeeee-0002-0002-0002-000000000002',
  venue3: 'eeeeeeee-0003-0003-0003-000000000003',
  venue4: 'eeeeeeee-0004-0004-0004-000000000004',

  // Venues — org2
  venue5: 'eeeeeeee-0005-0005-0005-000000000005',
  venue6: 'eeeeeeee-0006-0006-0006-000000000006',
  venue7: 'eeeeeeee-0007-0007-0007-000000000007',
  venue8: 'eeeeeeee-0008-0008-0008-000000000008',
};

/**
 * @param {import('knex').Knex} knex
 */
exports.seed = async function (knex) {
  // Truncate in reverse FK order
  await knex('booking_addons').del();
  await knex('bookings').del();
  await knex('no_show_records').del();
  await knex('penalties').del();
  await knex('notifications').del();
  await knex('session_requests').del();
  await knex('sessions').del();
  await knex('venue_slots').del();
  await knex('venues').del();
  await knex('coach_profiles').del();
  await knex('player_profiles').del();
  await knex('users').del();
  await knex('organizations').del();

  const now = new Date();
  const hash      = await bcrypt.hash('Password123!', BCRYPT_COST);
  const adminHash = await bcrypt.hash('Admin2026!',   BCRYPT_COST);

  // ── Organizations ────────────────────────────────────────────────
  await knex('organizations').insert([
    {
      id: IDS.org1,
      name: 'Elite Padel Club',
      slug: 'elite-padel',
      status: 'active',
      created_at: now,
      updated_at: now,
    },
    {
      id: IDS.org2,
      name: 'Cocody Padel Academy',
      slug: 'cocody-padel',
      status: 'active',
      created_at: now,
      updated_at: now,
    },
  ]);

  // ── Users ────────────────────────────────────────────────────────
  await knex('users').insert([
    // Super admin
    {
      id: 'ffffffff-0001-0001-0001-000000000001',
      organization_id: null,
      email: 'admin@padelconnect.ci',
      password_hash: adminHash,
      role: 'super_admin',
      first_name: 'Super',
      last_name: 'Admin',
      status: 'active',
      email_verified: true,
      no_show_count: 0,
      created_at: now,
      updated_at: now,
    },
    // Venue admins
    {
      id: IDS.admin1,
      organization_id: IDS.org1,
      email: 'toure@elite-padel.ci',
      password_hash: hash,
      role: 'venue_admin',
      first_name: 'Moussa',
      last_name: 'Touré',
      status: 'active',
      email_verified: true,
      no_show_count: 0,
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
      status: 'active',
      email_verified: true,
      no_show_count: 0,
      created_at: now,
      updated_at: now,
    },
    // Players
    {
      id: IDS.player1,
      organization_id: null,
      email: 'kofi@player.ci',
      password_hash: hash,
      role: 'player',
      first_name: 'Kofi',
      last_name: 'Mensah',
      status: 'active',
      email_verified: true,
      no_show_count: 0,
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
      status: 'active',
      email_verified: true,
      no_show_count: 0,
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
      status: 'active',
      email_verified: true,
      no_show_count: 0,
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
      status: 'active',
      email_verified: true,
      no_show_count: 0,
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
      status: 'active',
      email_verified: true,
      no_show_count: 0,
      created_at: now,
      updated_at: now,
    },
    // Coaches
    {
      id: IDS.coach1,
      organization_id: null,
      email: 'sebastien@coach.ci',
      password_hash: hash,
      role: 'coach',
      first_name: 'Sébastien',
      last_name: 'Dupont',
      status: 'active',
      email_verified: true,
      no_show_count: 0,
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
      status: 'active',
      email_verified: true,
      no_show_count: 0,
      created_at: now,
      updated_at: now,
    },
  ]);

  // ── Player profiles ──────────────────────────────────────────────
  await knex('player_profiles').insert([
    {
      user_id: IDS.player1,
      level: 4,
      style: 'attaquant',
      strengths: JSON.stringify(['smash', 'volée']),
      weaknesses: JSON.stringify(['revers', 'défense fond de court']),
      description: 'Joueur régulier, niveau intermédiaire, cherche partenaires le weekend.',
      photo_url: null,
      created_at: now,
      updated_at: now,
    },
    {
      user_id: IDS.player2,
      level: 2,
      style: 'défensif',
      strengths: JSON.stringify(['régularité', 'placement']),
      weaknesses: JSON.stringify(['puissance', 'service']),
      description: 'Joueuse occasionnelle, débutante, préfère jouer entre femmes.',
      photo_url: null,
      created_at: now,
      updated_at: now,
    },
    {
      user_id: IDS.player3,
      level: 5,
      style: 'complet',
      strengths: JSON.stringify(['endurance', 'tactique', 'service']),
      weaknesses: JSON.stringify(['lob']),
      description: 'Joueur expérimenté, disponible en semaine.',
      photo_url: null,
      created_at: now,
      updated_at: now,
    },
    {
      user_id: IDS.player4,
      level: 3,
      style: 'défensif',
      strengths: JSON.stringify(['patience', 'défense']),
      weaknesses: JSON.stringify(['attaque', 'smash']),
      description: 'Joueuse intermédiaire cherchant mixte ou féminin.',
      photo_url: null,
      created_at: now,
      updated_at: now,
    },
    {
      user_id: IDS.player5,
      level: 6,
      style: 'attaquant',
      strengths: JSON.stringify(['smash', 'vitesse', 'anticipation']),
      weaknesses: JSON.stringify(['patience en défense']),
      description: 'Joueur avancé, compétitif, disponible tôt le matin.',
      photo_url: null,
      created_at: now,
      updated_at: now,
    },
  ]);

  // ── Coach profiles ───────────────────────────────────────────────
  await knex('coach_profiles').insert([
    {
      user_id: IDS.coach1,
      organization_id: null,
      specialty: 'technique et tactique',
      rate: 15000,
      bio: 'Coach indépendant certifié FFT, 8 ans d\'expérience. Visible sur tous les clubs.',
      is_independent: true,
      created_at: now,
      updated_at: now,
    },
    {
      user_id: IDS.coach2,
      organization_id: IDS.org1,
      specialty: 'débutants et perfectionnement',
      rate: 12000,
      bio: 'Coach rattaché à Elite Padel Club, spécialisé dans l\'accueil des débutants.',
      is_independent: false,
      created_at: now,
      updated_at: now,
    },
  ]);

  // ── Venues ───────────────────────────────────────────────────────
  await knex('venues').insert([
    // Elite Padel Club — 4 terrains
    {
      id: IDS.venue1,
      organization_id: IDS.org1,
      name: 'Terrain 1 — Panoramique',
      description: 'Terrain extérieur couvert avec vue sur le lagon.',
      amenities: JSON.stringify(['éclairage LED', 'vestiaires', 'wifi']),
      created_at: now,
      updated_at: now,
    },
    {
      id: IDS.venue2,
      organization_id: IDS.org1,
      name: 'Terrain 2 — Intérieur A',
      description: 'Terrain intérieur climatisé, sol en moquette bleue.',
      amenities: JSON.stringify(['climatisation', 'vestiaires']),
      created_at: now,
      updated_at: now,
    },
    {
      id: IDS.venue3,
      organization_id: IDS.org1,
      name: 'Terrain 3 — Intérieur B',
      description: 'Terrain intérieur climatisé, idéal pour débutants.',
      amenities: JSON.stringify(['climatisation', 'vestiaires', 'location de raquettes']),
      created_at: now,
      updated_at: now,
    },
    {
      id: IDS.venue4,
      organization_id: IDS.org1,
      name: 'Terrain 4 — VIP',
      description: 'Terrain premium avec espace lounge privatisé.',
      amenities: JSON.stringify(['éclairage LED', 'lounge', 'service boissons', 'vestiaires VIP']),
      created_at: now,
      updated_at: now,
    },
    // Cocody Padel Academy — 4 terrains
    {
      id: IDS.venue5,
      organization_id: IDS.org2,
      name: 'Terrain A — Central',
      description: 'Terrain central de l\'académie, utilisé pour les tournois.',
      amenities: JSON.stringify(['tribune', 'éclairage LED', 'vestiaires']),
      created_at: now,
      updated_at: now,
    },
    {
      id: IDS.venue6,
      organization_id: IDS.org2,
      name: 'Terrain B — Entraînement',
      description: 'Terrain dédié aux entraînements et cours collectifs.',
      amenities: JSON.stringify(['filets de pratique', 'paniers de balles']),
      created_at: now,
      updated_at: now,
    },
    {
      id: IDS.venue7,
      organization_id: IDS.org2,
      name: 'Terrain C — Extérieur',
      description: 'Terrain extérieur non couvert, ambiance plein air.',
      amenities: JSON.stringify(['éclairage nocturne', 'bancs']),
      created_at: now,
      updated_at: now,
    },
    {
      id: IDS.venue8,
      organization_id: IDS.org2,
      name: 'Terrain D — Indoor',
      description: 'Salle indoor avec sol en gazon synthétique.',
      amenities: JSON.stringify(['climatisation', 'vestiaires', 'wifi']),
      created_at: now,
      updated_at: now,
    },
  ]);

  // ── Venue slots (10 total, spread across venues and upcoming dates) ──
  const d1 = '2026-05-24'; // Saturday
  const d2 = '2026-05-25'; // Sunday
  const d3 = '2026-05-27'; // Tuesday

  await knex('venue_slots').insert([
    // Elite — Terrain 1
    {
      venue_id: IDS.venue1,
      date: d1,
      start_time: '08:00',
      end_time: '09:30',
      price: 10000,
      status: 'available',
      created_at: now,
      updated_at: now,
    },
    {
      venue_id: IDS.venue1,
      date: d1,
      start_time: '10:00',
      end_time: '11:30',
      price: 10000,
      status: 'available',
      created_at: now,
      updated_at: now,
    },
    // Elite — Terrain 2
    {
      venue_id: IDS.venue2,
      date: d1,
      start_time: '09:00',
      end_time: '10:30',
      price: 8000,
      status: 'available',
      created_at: now,
      updated_at: now,
    },
    {
      venue_id: IDS.venue2,
      date: d2,
      start_time: '14:00',
      end_time: '15:30',
      price: 8000,
      status: 'available',
      created_at: now,
      updated_at: now,
    },
    // Elite — Terrain 4 VIP
    {
      venue_id: IDS.venue4,
      date: d2,
      start_time: '10:00',
      end_time: '11:30',
      price: 20000,
      status: 'available',
      created_at: now,
      updated_at: now,
    },
    // Cocody — Terrain A
    {
      venue_id: IDS.venue5,
      date: d1,
      start_time: '07:00',
      end_time: '08:30',
      price: 9000,
      status: 'available',
      created_at: now,
      updated_at: now,
    },
    {
      venue_id: IDS.venue5,
      date: d2,
      start_time: '09:00',
      end_time: '10:30',
      price: 9000,
      status: 'available',
      created_at: now,
      updated_at: now,
    },
    // Cocody — Terrain B
    {
      venue_id: IDS.venue6,
      date: d3,
      start_time: '18:00',
      end_time: '19:30',
      price: 7000,
      status: 'available',
      created_at: now,
      updated_at: now,
    },
    // Cocody — Terrain D Indoor
    {
      venue_id: IDS.venue8,
      date: d2,
      start_time: '16:00',
      end_time: '17:30',
      price: 11000,
      status: 'available',
      created_at: now,
      updated_at: now,
    },
    {
      venue_id: IDS.venue8,
      date: d3,
      start_time: '07:00',
      end_time: '08:30',
      price: 11000,
      status: 'available',
      created_at: now,
      updated_at: now,
    },
  ]);
};
