const jwt = require('jsonwebtoken');

const secret = process.env.JWT_SECRET || 'cambia-esta-clave-en-produccion';

function requireAuth(req, res, next) {
  const header = req.get('authorization') || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : req.cookies && req.cookies.auth_token;
  if (!token) return res.status(401).json({ error: 'Token requerido' });
  try {
    req.user = jwt.verify(token, secret);
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Token inválido o expirado' });
  }
}

function userFromRequest(req) {
  const header = req.get('authorization') || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : req.cookies && req.cookies.auth_token;
  if (!token) return null;
  try { return jwt.verify(token, secret); } catch (error) { return null; }
}

module.exports = { secret, requireAuth, userFromRequest };
