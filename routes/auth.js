const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db');
const { secret } = require('../middleware/auth');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function publicUser(user) { return { id: user.id, name: user.name, email: user.email, role: user.role }; }
function tokenFor(user) { return jwt.sign({ id: user.id, name: user.name, email: user.email, role: user.role }, secret, { expiresIn: '3h' }); }

router.get('/me', requireAuth, async (req, res, next) => {
  try {
    const user = await db.get('SELECT id, name, email, role FROM users WHERE id = ? AND active = 1', [req.user.id]);
    if (!user) return res.status(401).json({ error: 'Usuario no disponible' });
    res.json(user);
  } catch (error) { next(error); }
});

router.post('/register', async (req, res, next) => {
  try {
    const { name, email, password } = req.body || {};
    if (typeof name !== 'string' || name.trim().length < 2 || name.trim().length > 100) return res.status(400).json({ error: 'El nombre debe tener entre 2 y 100 caracteres' });
    if (typeof email !== 'string' || !emailPattern.test(email.trim())) return res.status(400).json({ error: 'Correo electrónico inválido' });
    if (typeof password !== 'string' || password.length < 8) return res.status(400).json({ error: 'La contraseña debe tener al menos 8 caracteres' });
    const hash = await bcrypt.hash(password, 12);
    const result = await db.run('INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)', [name.trim(), email.trim().toLowerCase(), hash]);
    const user = await db.get('SELECT * FROM users WHERE id = ?', [result.id]);
    res.status(201).json({ user: publicUser(user), token: tokenFor(user) });
  } catch (error) {
    if (error.code === 'SQLITE_CONSTRAINT') return res.status(409).json({ error: 'El correo ya está registrado' });
    next(error);
  }
});

router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body || {};
    if (typeof email !== 'string' || typeof password !== 'string') return res.status(400).json({ error: 'Correo y contraseña son obligatorios' });
    const user = await db.get('SELECT * FROM users WHERE email = ? AND active = 1', [email.trim().toLowerCase()]);
    if (!user || !(await bcrypt.compare(password, user.password_hash))) return res.status(401).json({ error: 'Credenciales inválidas' });
    res.cookie('auth_token', tokenFor(user), { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', maxAge: 3 * 60 * 60 * 1000 });
    res.json({ user: publicUser(user), authenticated: true });
  } catch (error) { next(error); }
});

router.post('/logout', (req, res) => { res.clearCookie('auth_token'); res.json({ message: 'Sesión cerrada' }); });

module.exports = router;
