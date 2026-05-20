const { verifyToken } = require('../auth/jwt');

function authenticate(req, res, next) {
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
