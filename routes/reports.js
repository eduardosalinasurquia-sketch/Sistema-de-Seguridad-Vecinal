const express = require('express');
const db = require('../db');
const router = express.Router();
router.get('/', async (req, res, next) => { try {
  const names = ['users','alerts','neighborhoods','residents','authorities','alert_comments','alert_assignments'];
  const totals = {}; for (const table of names) totals[table === 'alert_comments' ? 'comments' : table === 'alert_assignments' ? 'assignments' : table] = (await db.get('SELECT COUNT(*) AS total FROM ' + table)).total;
  totals.authorities = (await db.get('SELECT COUNT(*) AS total FROM authorities WHERE active=1')).total;
  const byCode = await db.all('SELECT code, COUNT(*) AS total FROM alerts GROUP BY code');
  const byStatus = await db.all('SELECT status, COUNT(*) AS total FROM alerts GROUP BY status');
  res.json({ totals, alerts: { byCode, byStatus } });
} catch (e) { next(e); } });
router.get('/alerts', async (req, res, next) => { try { res.json(await db.all('SELECT a.id,a.code,a.category,a.status,COUNT(DISTINCT c.id) comments,COUNT(DISTINCT x.id) assignments FROM alerts a LEFT JOIN alert_comments c ON c.alert_id=a.id LEFT JOIN alert_assignments x ON x.alert_id=a.id GROUP BY a.id ORDER BY a.id DESC')); } catch (e) { next(e); } });
router.get('/relational', async (req, res, next) => { try {
  const [neighborhoods, residents, authorities, comments, assignments] = await Promise.all([
    db.all('SELECT id, name, address, created_at FROM neighborhoods ORDER BY id DESC'),
    db.all('SELECT r.id, r.name, r.phone, r.email, n.name AS neighborhood FROM residents r JOIN neighborhoods n ON n.id=r.neighborhood_id ORDER BY r.id DESC'),
    db.all('SELECT id, name, institution, phone, active, created_at FROM authorities ORDER BY id DESC'),
    db.all('SELECT c.id, a.category AS alert, r.name AS resident, c.content, c.created_at FROM alert_comments c JOIN alerts a ON a.id=c.alert_id JOIN residents r ON r.id=c.resident_id ORDER BY c.id DESC'),
    db.all('SELECT x.id, a.category AS alert, h.name AS authority, x.status, x.assigned_at FROM alert_assignments x JOIN alerts a ON a.id=x.alert_id JOIN authorities h ON h.id=x.authority_id ORDER BY x.id DESC')
  ]); res.json({ neighborhoods, residents, authorities, comments, assignments });
} catch (e) { next(e); } });
module.exports = router;
