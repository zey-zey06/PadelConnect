const repo = require('./sponsors.repository');
const teamsRepo = require('../teams/teams.repository');

function makeError(status, message) {
  const err = new Error(message);
  err.status = status;
  return err;
}

async function assertTeamAdminOrManager(userId, teamId) {
  const member = await teamsRepo.getActiveMemberByUserId(teamId, userId);
  if (!member) throw makeError(403, 'Accès refusé.');
  if (!['admin', 'manager'].includes(member.role)) throw makeError(403, 'Réservé aux admins et managers.');
}

async function addSponsor(userId, teamId, { name, logo_url, website_url, amount, currency, type, tournament_id }) {
  await assertTeamAdminOrManager(userId, teamId);
  return repo.addSponsor({
    team_id:       teamId,
    tournament_id: tournament_id || null,
    name:          name.trim(),
    logo_url:      logo_url || null,
    website_url:   website_url || null,
    amount:        amount != null ? Number(amount) : null,
    currency:      currency || 'FCFA',
    type:          type || 'partner',
  });
}

async function getTeamSponsors(teamId) {
  return repo.getTeamSponsors(teamId);
}

async function getTournamentSponsors(tournamentId) {
  return repo.getTournamentSponsors(tournamentId);
}

async function deleteSponsor(userId, teamId, sponsorId) {
  await assertTeamAdminOrManager(userId, teamId);
  const sponsor = await repo.getSponsorById(sponsorId);
  if (!sponsor) throw makeError(404, 'Sponsor introuvable.');
  if (sponsor.team_id !== teamId) throw makeError(403, 'Accès refusé.');
  await repo.deleteSponsor(sponsorId);
}

module.exports = { addSponsor, getTeamSponsors, getTournamentSponsors, deleteSponsor };
