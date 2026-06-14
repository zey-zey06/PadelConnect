async function handle(res) {
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'Erreur réseau.');
  }
  return res.json();
}

export async function listTournaments(status) {
  const q = status ? `?status=${status}` : '';
  return handle(await fetch(`/api/tournaments${q}`));
}

export async function getTournament(id) {
  return handle(await fetch(`/api/tournaments/${id}`, { credentials: 'include' }));
}

export async function createTournament(data) {
  return handle(await fetch('/api/tournaments', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
    credentials: 'include',
  }));
}

export async function updateTournamentStatus(id, status) {
  return handle(await fetch(`/api/tournaments/${id}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status }),
    credentials: 'include',
  }));
}

export async function registerForTournament(id, data) {
  return handle(await fetch(`/api/tournaments/${id}/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
    credentials: 'include',
  }));
}

export async function generateBracket(id) {
  return handle(await fetch(`/api/tournaments/${id}/generate-bracket`, {
    method: 'POST',
    credentials: 'include',
  }));
}

export async function submitMatchScore(tournamentId, matchId, scores) {
  return handle(await fetch(`/api/tournaments/${tournamentId}/matches/${matchId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(scores),
    credentials: 'include',
  }));
}

export async function likeTournament(id) {
  return handle(await fetch(`/api/tournaments/${id}/like`, {
    method: 'POST',
    credentials: 'include',
  }));
}

export async function getComments(id) {
  return handle(await fetch(`/api/tournaments/${id}/comments`));
}

export async function addComment(id, body) {
  return handle(await fetch(`/api/tournaments/${id}/comments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ body }),
    credentials: 'include',
  }));
}

export async function cancelTournament(id) {
  return handle(await fetch(`/api/tournaments/${id}/cancel`, {
    method: 'PATCH',
    credentials: 'include',
  }));
}

export async function validateCashPayment(tournamentId, regId) {
  return handle(await fetch(`/api/tournaments/${tournamentId}/registrations/${regId}/validate`, {
    method: 'PATCH',
    credentials: 'include',
  }));
}
