const bcrypt = require('bcrypt');
const crypto = require('crypto');
const db = require('../db');
const notificationsService = require('../features/notifications/notifications.service');
const { sendVerificationEmail } = require('../emails/verification');

const BCRYPT_ROUNDS = 12;
const VERIFICATION_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

async function signup({ email, password, role = 'player', organization_id = null, first_name = null, last_name = null }) {
  const existing = await db('users').where({ email }).whereNull('deleted_at').first();
  if (existing) {
    const err = new Error('Email déjà utilisé.');
    err.status = 409;
    throw err;
  }

  const password_hash = await bcrypt.hash(password, BCRYPT_ROUNDS);
  // [DEV] Email verification disabled — set email_verified = true immediately
  // const verification_token = crypto.randomBytes(32).toString('hex');
  // const verification_expires = new Date(Date.now() + VERIFICATION_TTL_MS);

  const [row] = await db('users')
    .insert({ email, password_hash, role, organization_id, email_verified: true, first_name: first_name || null, last_name: last_name || null })
    .returning(['id', 'email', 'role', 'organization_id', 'status', 'first_name', 'last_name', 'created_at']);

  // [DEV] Skip token storage and verification email
  // await db('users').where({ id: row.id }).update({
  //   email_verification_token: verification_token,
  //   email_verification_expires_at: verification_expires,
  // });

  // Fire-and-forget — don't block signup on side-effect failures
  notificationsService
    .createNotification(row.id, 'welcome', 'Bienvenue sur PadelConnect !')
    .catch(() => {});

  // sendVerificationEmail(email, verification_token).catch(() => {});

  return {
    id: row.id,
    email: row.email,
    role: row.role,
    organization_id: row.organization_id,
    status: row.status,
    first_name: row.first_name ?? null,
    last_name: row.last_name ?? null,
    created_at: row.created_at,
  };
}

async function login({ email, password }) {
  const user = await db('users').where({ email }).whereNull('deleted_at').first();
  if (!user) {
    const err = new Error('Email ou mot de passe incorrect.');
    err.status = 401;
    throw err;
  }

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) {
    const err = new Error('Email ou mot de passe incorrect.');
    err.status = 401;
    throw err;
  }

  if (!user.email_verified) {
    const err = new Error('Veuillez vérifier votre adresse email avant de vous connecter.');
    err.status = 401;
    err.code = 'EMAIL_NOT_VERIFIED';
    throw err;
  }

  return {
    id: user.id,
    email: user.email,
    role: user.role,
    organization_id: user.organization_id,
    status: user.status,
    first_name: user.first_name ?? null,
    last_name: user.last_name ?? null,
  };
}

async function verifyEmail(token) {
  const user = await db('users')
    .where({ email_verification_token: token })
    .whereNull('deleted_at')
    .first();

  if (!user) {
    const err = new Error('Lien de vérification invalide ou déjà utilisé.');
    err.status = 400;
    throw err;
  }

  if (new Date(user.email_verification_expires_at) < new Date()) {
    const err = new Error('Ce lien de vérification a expiré. Veuillez vous inscrire à nouveau.');
    err.status = 400;
    throw err;
  }

  await db('users').where({ id: user.id }).update({
    email_verified: true,
    email_verification_token: null,
    email_verification_expires_at: null,
  });

  return {
    id: user.id,
    email: user.email,
    role: user.role,
  };
}

async function getUserById(id) {
  const user = await db('users').where({ id }).whereNull('deleted_at').first();
  if (!user) {
    const err = new Error('Utilisateur introuvable.');
    err.status = 404;
    throw err;
  }

  return {
    id: user.id,
    email: user.email,
    role: user.role,
    organization_id: user.organization_id,
    status: user.status,
    first_name: user.first_name ?? null,
    last_name: user.last_name ?? null,
  };
}

async function updateName(userId, first_name, last_name) {
  await db('users').where({ id: userId }).update({
    first_name: first_name || null,
    last_name:  last_name  || null,
    updated_at: new Date(),
  });
}

async function changePassword(userId, currentPassword, newPassword) {
  const user = await db('users').where({ id: userId }).whereNull('deleted_at').first();
  if (!user) {
    const err = new Error('Utilisateur introuvable.');
    err.status = 404;
    throw err;
  }
  const valid = await bcrypt.compare(currentPassword, user.password_hash);
  if (!valid) {
    const err = new Error('Mot de passe actuel incorrect.');
    err.status = 400;
    throw err;
  }
  const hash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
  await db('users').where({ id: userId }).update({ password_hash: hash, updated_at: new Date() });
}

module.exports = { signup, login, verifyEmail, getUserById, updateName, changePassword };
