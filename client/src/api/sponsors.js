import client from './client';

export const getTeamSponsors       = (teamId)               => client.get(`/teams/${teamId}/sponsors`);
export const addSponsor            = (teamId, data)          => client.post(`/teams/${teamId}/sponsors`, data);
export const deleteSponsor         = (teamId, sponsorId)     => client.delete(`/teams/${teamId}/sponsors/${sponsorId}`);
export const getTournamentSponsors = (tournamentId)          => client.get(`/tournaments/${tournamentId}/sponsors`);
