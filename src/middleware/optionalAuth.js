const { verifyToken } = require('../auth/jwt');

function optionalAuth(req, res, next) {
  const token = req.cookies?.token;
  if (!token) return next();
  try {
    req.user = verifyToken(token);
  } catch {
    // Invalid token — proceed unauthenticated
  }
  next();
}

module.exports = optionalAuth;
