const adminRepo = require('./admin.repository');

function makeError(status, message) {
  const err = new Error(message);
  err.status = status;
  return err;
}

async function getDashboard() {
  return adminRepo.getDashboardStats();
}

async function listUsers(filters = {}) {
  return adminRepo.listUsers(filters);
}

async function updateUserStatus(id, status) {
  const user = await adminRepo.getUserById(id);
  if (!user) throw makeError(404, 'Utilisateur introuvable.');

  const updated = await adminRepo.updateUserStatus(id, status);

  // Suspending a user invalidates all their active sessions
  if (status === 'suspended') {
    await adminRepo.cancelActiveSessionsForUser(id);
  }

  return updated;
}

async function listSessions(filters = {}) {
  return adminRepo.listSessions(filters);
}

async function listClubs() {
  return adminRepo.listClubs();
}

async function updateClubStatus(id, status) {
  const club = await adminRepo.getClubById(id);
  if (!club) throw makeError(404, 'Club introuvable.');

  const updated = await adminRepo.updateClubStatus(id, status);

  // Deactivating a club hides all its available slots from booking
  if (status === 'inactive') {
    await adminRepo.cancelAvailableSlotsForClub(id);
  }

  return updated;
}

module.exports = {
  getDashboard,
  listUsers,
  updateUserStatus,
  listSessions,
  listClubs,
  updateClubStatus,
};
