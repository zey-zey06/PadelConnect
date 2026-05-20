const bcrypt = require('bcrypt');
const db = require('../db');

const BCRYPT_ROUNDS = 12;

async function signup({ email, password, role = 'player', organization_id = null }) {
  const existing = await db('users').where({ email }).whereNull('deleted_at').first();
  if (existing) {
    const err = new Error('Email déjà utilisé.');
    err.status = 409;
    throw err;
  }

  const password_hash = await bcrypt.hash(password, BCRYPT_ROUNDS);

  const [row] = await db('users')
    .insert({ email, password_hash, role, organization_id })
    .returning(['id', 'email', 'role', 'organization_id', 'status', 'created_at']);

  return {
    id: row.id,
    email: row.email,
    role: row.role,
    organization_id: row.organization_id,
    status: row.status,
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

  return {
    id: user.id,
    email: user.email,
    role: user.role,
    organization_id: user.organization_id,
    status: user.status,
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
  };
}

module.exports = { signup, login, getUserById };
