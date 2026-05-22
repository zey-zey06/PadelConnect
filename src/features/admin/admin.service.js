const adminRepo = require('./admin.repository');

function makeError(status, message) {
  const err = new Error(message);
  err.status = status;
  return err;
}

async function getDashboard() {
  return adminRepo.getDashboardStats();
}

async function getRecentActivity() {
  return adminRepo.getRecentActivity();
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

async function deleteSession(id) {
  return adminRepo.deleteSession(id);
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

async function listBookings(filters = {}) {
  return adminRepo.listBookings(filters);
}

async function listSanctions(filters = {}) {
  return adminRepo.listSanctions(filters);
}

async function markSanctionPaid(id) {
  const updated = await adminRepo.markPenaltyPaid(id);
  if (!updated) throw makeError(404, 'Sanction introuvable.');
  return updated;
}

async function liftBan(id) {
  const updated = await adminRepo.deletePenalty(id);
  if (!updated) throw makeError(404, 'Sanction introuvable.');
  return updated;
}

module.exports = {
  getDashboard,
  getRecentActivity,
  listUsers,
  updateUserStatus,
  listSessions,
  deleteSession,
  listClubs,
  updateClubStatus,
  listBookings,
  listSanctions,
  markSanctionPaid,
  liftBan,
};
