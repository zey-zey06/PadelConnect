const repo = require('./tournaments.repository');
const { generateBracket } = require('../../ai/bracket');
const db = require('../../db');

function makeError(status, message) {
  const err = new Error(message);
  err.status = status;
  return err;
}

// ── Tournaments ───────────────────────────────────────────────────────────────

async function createTournament(userId, data) {
  const user = await db('users').where({ id: userId }).first();
  if (!user?.team_id) throw makeError(403, 'Vous devez avoir une équipe pour créer un tournoi.');

  const tournament = await repo.createTournament({
    team_id:          user.team_id,
    club_id:          data.club_id || null,
    name:             data.name,
    description:      data.description || null,
    format:           data.format || 'elimination',
    level_min:        data.level_min || 1,
    level_max:        data.level_max || 7,
    max_teams:        data.max_teams || 16,
    registration_fee: data.registration_fee || 0,
    start_date:       data.start_date || null,
    end_date:         data.end_date || null,
    status:           data.status || 'draft',
    banner_url:       data.banner_url || null,
  });

  return tournament;
}

async function listTournaments(status) {
  return repo.listTournaments(status ? { status } : {});
}

async function getTournament(id, userId) {
  const tournament = await repo.getTournamentById(id);
  if (!tournament) throw makeError(404, 'Tournoi introuvable.');

  const [registrations, matches, likeCount, liked] = await Promise.all([
    repo.getRegistrations(id),
    repo.getMatches(id),
    repo.getLikeCount(id),
    userId ? repo.getUserLiked(id, userId) : false,
  ]);

  return { tournament, registrations, matches, likeCount, liked };
}

async function updateTournamentStatus(id, userId, status) {
  const tournament = await repo.getTournamentById(id);
  if (!tournament) throw makeError(404, 'Tournoi introuvable.');

  const user = await db('users').where({ id: userId }).first();
  if (!user?.team_id || user.team_id !== tournament.team_id) {
    throw makeError(403, 'Vous n\'êtes pas l\'organisateur de ce tournoi.');
  }

  return repo.updateTournament(id, { status });
}

// ── Registrations ─────────────────────────────────────────────────────────────

async function registerPlayer(tournamentId, userId, { partner_email, payment_method }) {
  const tournament = await repo.getTournamentById(tournamentId);
  if (!tournament) throw makeError(404, 'Tournoi introuvable.');
  if (tournament.status !== 'open') throw makeError(400, 'Les inscriptions ne sont pas ouvertes.');

  const existing = await repo.getRegistrationByPlayer(tournamentId, userId);
  if (existing) throw makeError(409, 'Vous êtes déjà inscrit à ce tournoi.');

  // Count existing registrations
  const regs = await repo.getRegistrations(tournamentId);
  if (regs.length >= tournament.max_teams) throw makeError(400, 'Le tournoi est complet.');

  let partner_id = null;
  if (partner_email) {
    const partner = await db('users').where({ email: partner_email.toLowerCase().trim() }).whereNull('deleted_at').first();
    if (!partner) throw makeError(404, 'Partenaire introuvable avec cet email.');
    if (partner.id === userId) throw makeError(400, 'Vous ne pouvez pas vous inscrire avec vous-même.');
    partner_id = partner.id;
  }

  const reg = await repo.registerTeam({
    tournament_id:  tournamentId,
    player1_id:     userId,
    player2_id:     partner_id,
    payment_method: payment_method || 'on_arrival',
    payment_status: 'pending',
  });

  return reg;
}

// ── Bracket generation ────────────────────────────────────────────────────────

async function generateBracketForTournament(tournamentId, userId) {
  const tournament = await repo.getTournamentById(tournamentId);
  if (!tournament) throw makeError(404, 'Tournoi introuvable.');

  const user = await db('users').where({ id: userId }).first();
  if (!user?.team_id || user.team_id !== tournament.team_id) {
    throw makeError(403, 'Seul l\'organisateur peut générer le tableau.');
  }

  const registrations = await repo.getRegistrations(tournamentId);
  if (registrations.length < 2) throw makeError(400, 'Il faut au moins 2 équipes inscrites.');

  // Build team objects with average level
  const teams = registrations.map((r) => ({
    id:       r.id,
    p1:       r.player1_id,
    p2:       r.player2_id,
    p1Level:  r.p1_level ?? 4,
    p2Level:  r.p2_level ?? 4,
    avgLevel: ((r.p1_level ?? 4) + (r.p2_level ?? 4)) / 2,
  }));

  const groups = await generateBracket({ teams, format: tournament.format });

  // Delete existing generated matches
  await repo.deleteMatchesByTournament(tournamentId);

  const matchRows = [];

  if (tournament.format === 'round_robin') {
    // groups is Array<Array<team>>
    groups.forEach((group, groupIdx) => {
      for (let i = 0; i < group.length; i++) {
        for (let j = i + 1; j < group.length; j++) {
          const t1 = group[i];
          const t2 = group[j];
          matchRows.push({
            tournament_id:  tournamentId,
            team1_player1:  t1.p1,
            team1_player2:  t1.p2 || null,
            team2_player1:  t2.p1,
            team2_player2:  t2.p2 || null,
            round:          1,
            group_number:   groupIdx + 1,
            status:         'scheduled',
          });
        }
      }
    });
  } else {
    // elimination: groups is Array<[team1, team2]> matchups
    groups.forEach((matchup, idx) => {
      const [t1, t2] = matchup;
      if (!t1 || !t2) return; // bye
      matchRows.push({
        tournament_id:  tournamentId,
        team1_player1:  t1.p1,
        team1_player2:  t1.p2 || null,
        team2_player1:  t2.p1,
        team2_player2:  t2.p2 || null,
        round:          1,
        group_number:   null,
        status:         'scheduled',
      });
    });
  }

  const matches = await repo.insertMatches(matchRows);
  await repo.updateTournament(tournamentId, { status: 'ongoing' });

  return { matches, groupCount: tournament.format === 'round_robin' ? groups.length : null };
}

// ── Match scores ──────────────────────────────────────────────────────────────

async function submitMatchScore(tournamentId, matchId, userId, { score_team1, score_team2 }) {
  const tournament = await repo.getTournamentById(tournamentId);
  if (!tournament) throw makeError(404, 'Tournoi introuvable.');

  const user = await db('users').where({ id: userId }).first();
  if (!user?.team_id || user.team_id !== tournament.team_id) {
    throw makeError(403, 'Seul l\'organisateur peut saisir les scores.');
  }

  const winner = score_team1 > score_team2 ? 1 : score_team1 < score_team2 ? 2 : null;

  return repo.updateMatch(matchId, {
    score_team1,
    score_team2,
    winner_team: winner,
    status: 'completed',
  });
}

// ── Social ────────────────────────────────────────────────────────────────────

async function toggleLike(tournamentId, userId) {
  const tournament = await repo.getTournamentById(tournamentId);
  if (!tournament) throw makeError(404, 'Tournoi introuvable.');
  const liked = await repo.toggleLike(tournamentId, userId);
  const likeCount = await repo.getLikeCount(tournamentId);
  return { liked, likeCount };
}

async function getComments(tournamentId) {
  const tournament = await repo.getTournamentById(tournamentId);
  if (!tournament) throw makeError(404, 'Tournoi introuvable.');
  return repo.getComments(tournamentId);
}

async function addComment(tournamentId, userId, body) {
  const tournament = await repo.getTournamentById(tournamentId);
  if (!tournament) throw makeError(404, 'Tournoi introuvable.');
  if (!body?.trim()) throw makeError(422, 'Le commentaire ne peut pas être vide.');
  return repo.addComment(tournamentId, userId, body.trim());
}

module.exports = {
  createTournament,
  listTournaments,
  getTournament,
  updateTournamentStatus,
  registerPlayer,
  generateBracketForTournament,
  submitMatchScore,
  toggleLike,
  getComments,
  addComment,
};
