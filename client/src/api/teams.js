async function handleResponse(res) {
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'Erreur réseau.');
  }
  return res.json();
}

export async function createTeam(data) {
  return handleResponse(await fetch('/api/teams', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
    credentials: 'include',
  }));
}

export async function getMyTeam() {
  return handleResponse(await fetch('/api/teams/my', { credentials: 'include' }));
}

export async function getTeamById(id) {
  return handleResponse(await fetch(`/api/teams/${id}`, { credentials: 'include' }));
}

export async function inviteMember(teamId, data) {
  return handleResponse(await fetch(`/api/teams/${teamId}/invite`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
    credentials: 'include',
  }));
}

export async function joinTeam(token) {
  return handleResponse(await fetch(`/api/teams/join/${token}`, { credentials: 'include' }));
}

export async function followTeam(id) {
  return handleResponse(await fetch(`/api/teams/${id}/follow`, {
    method: 'POST',
    credentials: 'include',
  }));
}
