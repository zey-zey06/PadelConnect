const { verifyToken } = require('../auth/jwt');
const db = require('../db');

async function authenticate(req, res, next) {
  console.log('[AUTH] Cookies received:', Object.keys(req.cookies || {}));
  console.log('[AUTH] Token exists:', !!req.cookies?.token);
  const token = req.cookies?.token;

  if (!token) {
    return res.status(401).json({
      status: 401,
      error: 'Unauthorized',
      message: 'Authentification requise.',
    });
  }

  try {
    const payload = verifyToken(token);
    req.user = payload;

    // Back-fill organization_id when the JWT was issued before club creation
    // (venue_admin logs in → creates club → old cookie still has org = null)
    if (payload.role === 'venue_admin' && !payload.organization_id) {
      try {
        const row = await db('users')
          .where({ id: payload.sub })
          .select('organization_id')
          .first();
        if (row?.organization_id) {
          req.user = { ...payload, organization_id: row.organization_id };
        }
      } catch {
        // Non-fatal: proceed without org_id, downstream check will 403 cleanly
      }
    }

    next();
  } catch {
    return res.status(401).json({
      status: 401,
      error: 'Unauthorized',
      message: 'Token invalide ou expiré.',
    });
  }
}

module.exports = authenticate;
