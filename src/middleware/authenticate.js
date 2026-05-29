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

  console.log('[AUTH] JWT_SECRET set:', !!process.env.JWT_SECRET);

  try {
    const payload = verifyToken(token);
    console.log('[AUTH] Token decoded OK, userId:', payload.sub, 'role:', payload.role);
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
  } catch (err) {
    console.error('[AUTH] Token invalid:', err.message);
    return res.status(401).json({
      status: 401,
      error: 'Unauthorized',
      message: 'Token invalide ou expiré.',
    });
  }
}

module.exports = authenticate;
