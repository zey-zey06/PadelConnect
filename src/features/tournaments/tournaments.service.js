const repo = require('./tournaments.repository');
const { generateBracket } = require('../../ai/bracket');
const { sendEmail, FROM } = require('../../emails/mailer');
const db = require('../../db');

function makeError(status, message) {
  const err = new Error(message);
  err.status = status;
  return err;
}

// Payments that are auto-confirmed on receipt
const AUTO_CONFIRM = ['wave', 'orange_money', 'mtn_money', 'card'];

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
    throw makeError(403, "Vous n'êtes pas l'organisateur de ce tournoi.");
  }

  return repo.updateTournament(id, { status });
}

async function cancelTournament(tournamentId, userId) {
  const tournament = await repo.getTournamentById(tournamentId);
  if (!tournament) throw makeError(404, 'Tournoi introuvable.');

  const user = await db('users').where({ id: userId }).first();
  if (!user?.team_id || user.team_id !== tournament.team_id) {
    throw makeError(403, "Seul l'organisateur peut annuler ce tournoi.");
  }

  if (tournament.status === 'cancelled') throw makeError(400, 'Ce tournoi est déjà annulé.');
  if (tournament.status === 'completed') throw makeError(400, 'Un tournoi terminé ne peut pas être annulé.');

  // Check 72h rule
  const hoursUntilStart = tournament.start_date
    ? (new Date(tournament.start_date) - Date.now()) / 3_600_000
    : Infinity;
  const fullRefund = hoursUntilStart > 72;

  await repo.updateTournament(tournamentId, { status: 'cancelled' });

  // Email all registered players — fire-and-forget
  (async () => {
    try {
      const registrations = await repo.getRegistrations(tournamentId);
      const playerIds = [...new Set(
        registrations.flatMap((r) => [r.player1_id, r.player2_id].filter(Boolean)),
      )];
      const players = await db('users').whereIn('id', playerIds).select('email', 'first_name');
      const refundLine = fullRefund
        ? '<p>Un remboursement complet sera effectué.</p>'
        : '<p>Conformément à la politique d\'annulation, aucun remboursement ne sera effectué (annulation à moins de 72h).</p>';

      for (const p of players) {
        sendEmail({
          from: FROM,
          to: p.email,
          subject: `Annulation — ${tournament.name}`,
          html: `
            <div style="font-family:sans-serif;max-width:520px;margin:auto;padding:32px 24px">
              <div style="margin-bottom:24px">
                <span style="background:#1A3D2B;color:#FAF8F5;padding:6px 12px;border-radius:6px;font-weight:700;font-size:14px">PadelConnect</span>
              </div>
              <h1 style="font-size:20px;color:#1C1C1A">Tournoi annulé</h1>
              <p>Bonjour ${p.first_name || ''},</p>
              <p>Le tournoi <strong>${tournament.name}</strong> a été annulé par l'organisateur.</p>
              ${refundLine}
              <p style="color:#999;font-size:12px;margin-top:32px">PadelConnect — ne pas répondre à cet email.</p>
            </div>`,
        }).catch(() => {});
      }
    } catch { /* non-fatal */ }
  })();

  return { ok: true, fullRefund };
}

// ── Registrations ─────────────────────────────────────────────────────────────

async function registerPlayer(tournamentId, userId, { partner_username, partner_email, payment_method }) {
  const tournament = await repo.getTournamentById(tournamentId);
  if (!tournament) throw makeError(404, 'Tournoi introuvable.');
  if (tournament.status !== 'open') throw makeError(400, 'Les inscriptions ne sont pas ouvertes.');

  const existing = await repo.getRegistrationByPlayer(tournamentId, userId);
  if (existing) throw makeError(409, 'Vous êtes déjà inscrit à ce tournoi.');

  const regs = await repo.getRegistrations(tournamentId);
  if (regs.length >= tournament.max_teams) throw makeError(400, 'Le tournoi est complet.');

  let partner_id = null;
  const partnerKey = partner_username?.trim() || partner_email?.trim();
  if (partnerKey) {
    const partner = await db('users')
      .whereNull('deleted_at')
      .where(function () {
        if (partner_username) this.whereILike('username', partner_username.trim());
        else this.whereILike('email', partner_email.trim().toLowerCase());
      })
      .first();
    if (!partner) throw makeError(404, 'Partenaire introuvable.');
    if (partner.id === userId) throw makeError(400, 'Vous ne pouvez pas vous inscrire avec vous-même.');
    partner_id = partner.id;
  }

  const payment_status = AUTO_CONFIRM.includes(payment_method) ? 'paid' : 'pending';

  return repo.registerTeam({
    tournament_id:  tournamentId,
    player1_id:     userId,
    player2_id:     partner_id,
    payment_method: payment_method || 'on_arrival',
    payment_status,
  });
}

async function validateCashPayment(tournamentId, regId, userId) {
  const tournament = await repo.getTournamentById(tournamentId);
  if (!tournament) throw makeError(404, 'Tournoi introuvable.');

  const user = await db('users').where({ id: userId }).first();
  if (!user?.team_id || user.team_id !== tournament.team_id) {
    throw makeError(403, "Seul l'organisateur peut valider les paiements.");
  }

  const [reg] = await db('tournament_registrations')
    .where({ id: regId, tournament_id: tournamentId })
    .update({ payment_status: 'paid' })
    .returning('*');

  if (!reg) throw makeError(404, 'Inscription introuvable.');
  return reg;
}

// ── Bracket generation ────────────────────────────────────────────────────────

async function generateBracketForTournament(tournamentId, userId) {
  const tournament = await repo.getTournamentById(tournamentId);
  if (!tournament) throw makeError(404, 'Tournoi introuvable.');

  const user = await db('users').where({ id: userId }).first();
  if (!user?.team_id || user.team_id !== tournament.team_id) {
    throw makeError(403, "Seul l'organisateur peut générer le tableau.");
  }

  const registrations = await repo.getRegistrations(tournamentId);
  if (registrations.length < 2) throw makeError(400, 'Il faut au moins 2 équipes inscrites.');

  const teams = registrations.map((r) => ({
    id: r.id, p1: r.player1_id, p2: r.player2_id,
    p1Level: r.p1_level ?? 4, p2Level: r.p2_level ?? 4,
    avgLevel: ((r.p1_level ?? 4) + (r.p2_level ?? 4)) / 2,
  }));

  const groups = await generateBracket({ teams, format: tournament.format });

  await repo.deleteMatchesByTournament(tournamentId);

  const matchRows = [];

  if (tournament.format === 'round_robin') {
    groups.forEach((group, groupIdx) => {
      for (let i = 0; i < group.length; i++) {
        for (let j = i + 1; j < group.length; j++) {
          const t1 = group[i]; const t2 = group[j];
          matchRows.push({
            tournament_id: tournamentId,
            team1_player1: t1.p1, team1_player2: t1.p2 || null,
            team2_player1: t2.p1, team2_player2: t2.p2 || null,
            round: 1, group_number: groupIdx + 1, status: 'scheduled',
          });
        }
      }
    });
  } else {
    groups.forEach((matchup) => {
      const [t1, t2] = matchup;
      if (!t1 || !t2) return;
      matchRows.push({
        tournament_id: tournamentId,
        team1_player1: t1.p1, team1_player2: t1.p2 || null,
        team2_player1: t2.p1, team2_player2: t2.p2 || null,
        round: 1, group_number: null, status: 'scheduled',
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
    throw makeError(403, "Seul l'organisateur peut saisir les scores.");
  }

  const winner = score_team1 > score_team2 ? 1 : score_team1 < score_team2 ? 2 : null;
  return repo.updateMatch(matchId, { score_team1, score_team2, winner_team: winner, status: 'completed' });
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
  createTournament, listTournaments, getTournament, updateTournamentStatus,
  cancelTournament, registerPlayer, validateCashPayment,
  generateBracketForTournament, submitMatchScore,
  toggleLike, getComments, addComment,
};
