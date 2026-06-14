const db = require('../../db');

async function getScore(sessionId) {
  return db('session_scores').where({ session_id: sessionId }).first();
}

async function createScore(sessionId, reporterId, { score_my_team, score_opponent, winner }) {
  const [row] = await db('session_scores')
    .insert({ session_id: sessionId, reporter_id: reporterId, score_my_team, score_opponent, winner })
    .returning('*');
  return row;
}

module.exports = { getScore, createScore };
