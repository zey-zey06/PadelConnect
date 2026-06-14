const db = require('../../db');

async function addSponsor(data) {
  const [sponsor] = await db('sponsors').insert(data).returning('*');
  return sponsor;
}

async function getTeamSponsors(teamId) {
  return db('sponsors')
    .where({ team_id: teamId })
    .orderBy([{ column: 'type' }, { column: 'created_at', order: 'desc' }]);
}

async function getTournamentSponsors(tournamentId) {
  return db('sponsors as s')
    .join('tournaments as t', 't.team_id', 's.team_id')
    .where('t.id', tournamentId)
    .where(function () {
      this.where('s.tournament_id', tournamentId).orWhereNull('s.tournament_id');
    })
    .select('s.*')
    .orderBy([{ column: 's.type' }, { column: 's.created_at', order: 'desc' }]);
}

async function getSponsorById(id) {
  return db('sponsors').where({ id }).first();
}

async function deleteSponsor(id) {
  return db('sponsors').where({ id }).delete();
}

module.exports = {
  addSponsor, getTeamSponsors, getTournamentSponsors, getSponsorById, deleteSponsor,
};
