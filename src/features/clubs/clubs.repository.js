const db = require('../../db');

async function create(data) {
  const [row] = await db('organizations').insert(data).returning('*');
  return row;
}

async function list() {
  return db('organizations').whereNull('deleted_at').orderBy('name', 'asc').select();
}

async function getById(id) {
  return db('organizations').where({ id }).whereNull('deleted_at').first();
}

async function linkUserToOrg(userId, organizationId) {
  const [row] = await db('users')
    .where({ id: userId })
    .update({ organization_id: organizationId, updated_at: new Date() })
    .returning('*');
  return row;
}

async function update(id, data) {
  const [row] = await db('organizations')
    .where({ id })
    .update({ ...data, updated_at: new Date() })
    .returning('*');
  return row;
}

module.exports = { create, list, getById, linkUserToOrg, update };
