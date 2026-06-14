const db = require('../../db');

// ── Tournaments ───────────────────────────────────────────────────────────────

async function createTournament(data) {
  const [row] = await db('tournaments').insert(data).returning('*');
  return row;
}

async function listTournaments({ status } = {}) {
  const q = db('tournaments as t')
    .leftJoin('teams as tm', 'tm.id', 't.team_id')
    .leftJoin('organizations as o', 'o.id', 't.club_id')
    .whereNull('t.deleted_at')
    .select(
      't.*',
      'tm.name as team_name',
      'tm.logo_url as team_logo',
      'o.name as club_name',
    )
    .orderBy('t.start_date', 'asc');

  if (status) q.where('t.status', status);
  return q;
}

async function getTournamentById(id) {
  return db('tournaments as t')
    .leftJoin('teams as tm', 'tm.id', 't.team_id')
    .leftJoin('organizations as o', 'o.id', 't.club_id')
    .where('t.id', id)
    .whereNull('t.deleted_at')
    .select(
      't.*',
      'tm.name as team_name',
      'tm.logo_url as team_logo',
      'o.name as club_name',
    )
    .first();
}

async function updateTournament(id, data) {
  const [row] = await db('tournaments').where({ id }).update({ ...data, updated_at: new Date() }).returning('*');
  return row;
}

// ── Registrations ─────────────────────────────────────────────────────────────

async function registerTeam(data) {
  const [row] = await db('tournament_registrations').insert(data).returning('*');
  return row;
}

async function getRegistrations(tournament_id) {
  return db('tournament_registrations as r')
    .leftJoin('users as p1', 'p1.id', 'r.player1_id')
    .leftJoin('users as p2', 'p2.id', 'r.player2_id')
    .leftJoin('player_profiles as pp1', 'pp1.user_id', 'r.player1_id')
    .leftJoin('player_profiles as pp2', 'pp2.user_id', 'r.player2_id')
    .where('r.tournament_id', tournament_id)
    .select(
      'r.id', 'r.payment_method', 'r.payment_status', 'r.registered_at',
      'r.player1_id', 'p1.first_name as p1_first_name', 'p1.last_name as p1_last_name',
      'pp1.level as p1_level',
      'r.player2_id', 'p2.first_name as p2_first_name', 'p2.last_name as p2_last_name',
      'pp2.level as p2_level',
    );
}

async function getRegistrationByPlayer(tournament_id, player1_id) {
  return db('tournament_registrations').where({ tournament_id, player1_id }).first();
}

// ── Matches ───────────────────────────────────────────────────────────────────

async function insertMatches(rows) {
  if (!rows.length) return [];
  return db('tournament_matches').insert(rows).returning('*');
}

async function getMatches(tournament_id) {
  return db('tournament_matches as m')
    .leftJoin('users as u1', 'u1.id', 'm.team1_player1')
    .leftJoin('users as u2', 'u2.id', 'm.team1_player2')
    .leftJoin('users as u3', 'u3.id', 'm.team2_player1')
    .leftJoin('users as u4', 'u4.id', 'm.team2_player2')
    .where('m.tournament_id', tournament_id)
    .orderBy(['m.round', 'm.group_number', 'm.created_at'])
    .select(
      'm.*',
      'u1.first_name as t1p1_first', 'u1.last_name as t1p1_last',
      'u2.first_name as t1p2_first', 'u2.last_name as t1p2_last',
      'u3.first_name as t2p1_first', 'u3.last_name as t2p1_last',
      'u4.first_name as t2p2_first', 'u4.last_name as t2p2_last',
    );
}

async function updateMatch(id, data) {
  const [row] = await db('tournament_matches').where({ id }).update(data).returning('*');
  return row;
}

async function deleteMatchesByTournament(tournament_id) {
  return db('tournament_matches').where({ tournament_id }).delete();
}

// ── Social ────────────────────────────────────────────────────────────────────

async function toggleLike(tournament_id, user_id) {
  const existing = await db('tournament_likes').where({ tournament_id, user_id }).first();
  if (existing) {
    await db('tournament_likes').where({ tournament_id, user_id }).delete();
    return false;
  }
  await db('tournament_likes').insert({ tournament_id, user_id });
  return true;
}

async function getLikeCount(tournament_id) {
  const [{ count }] = await db('tournament_likes').where({ tournament_id }).count('id as count');
  return Number(count);
}

async function getUserLiked(tournament_id, user_id) {
  return !!(await db('tournament_likes').where({ tournament_id, user_id }).first());
}

async function getComments(tournament_id) {
  return db('tournament_comments as c')
    .join('users as u', 'u.id', 'c.user_id')
    .where('c.tournament_id', tournament_id)
    .whereNull('c.deleted_at')
    .orderBy('c.created_at', 'asc')
    .select('c.id', 'c.body', 'c.created_at', 'u.id as user_id', 'u.first_name', 'u.last_name');
}

async function addComment(tournament_id, user_id, body) {
  const [row] = await db('tournament_comments').insert({ tournament_id, user_id, body }).returning('*');
  return row;
}

module.exports = {
  createTournament,
  listTournaments,
  getTournamentById,
  updateTournament,
  registerTeam,
  getRegistrations,
  getRegistrationByPlayer,
  insertMatches,
  getMatches,
  updateMatch,
  deleteMatchesByTournament,
  toggleLike,
  getLikeCount,
  getUserLiked,
  getComments,
  addComment,
};
