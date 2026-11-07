var express = require('express');
var db = require('../db');
var router = express.Router();
var codes = ['RED', 'ORANGE', 'YELLOW'];
var statuses = ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'DISMISSED'];

function getId(value) { if (!/^[1-9]\d*$/.test(value)) return null; var id = Number(value); return Number.isSafeInteger(id) ? id : null; }
function validate(body) {
  body = body && typeof body === 'object' && !Array.isArray(body) ? body : {};
  var e = [];
  if (!codes.includes(body.code)) e.push('code debe ser RED, ORANGE o YELLOW');
  if (typeof body.category !== 'string' || !body.category.trim() || body.category.trim().length > 80) e.push('category debe tener entre 1 y 80 caracteres');
  if (typeof body.description !== 'string' || !body.description.trim() || body.description.trim().length > 1000) e.push('description debe tener entre 1 y 1000 caracteres');
  [['latitude', -90, 90], ['longitude', -180, 180]].forEach(function(f) { if (body[f[0]] != null && (!Number.isFinite(Number(body[f[0]])) || Number(body[f[0]]) < f[1] || Number(body[f[0]]) > f[2])) e.push(f[0] + ' está fuera de rango'); });
  if (body.status !== undefined && !statuses.includes(body.status)) e.push('status no es válido');
  return e;
}
function values(body) { return [body.code, body.category.trim(), body.description.trim(), body.latitude == null ? null : Number(body.latitude), body.longitude == null ? null : Number(body.longitude), body.status || 'OPEN']; }

router.get('/', async function(req, res, next) { try {
  var page = Math.max(parseInt(req.query.page || '1', 10), 1), limit = Math.min(Math.max(parseInt(req.query.limit || '20', 10), 1), 100), params = [], where = [];
  if (req.query.code) { if (!codes.includes(req.query.code)) return res.status(400).json({ error: 'code no es válido' }); where.push('code = ?'); params.push(req.query.code); }
  if (req.query.status) { if (!statuses.includes(req.query.status)) return res.status(400).json({ error: 'status no es válido' }); where.push('status = ?'); params.push(req.query.status); }
  var clause = where.length ? ' WHERE ' + where.join(' AND ') : '', total = await db.get('SELECT COUNT(*) AS count FROM alerts' + clause, params), rows = await db.all('SELECT * FROM alerts' + clause + ' ORDER BY created_at DESC, id DESC LIMIT ? OFFSET ?', params.concat([limit, (page - 1) * limit]));
  res.json({ data: rows, pagination: { page: page, limit: limit, total: total.count, pages: Math.ceil(total.count / limit) } });
} catch (e) { next(e); } });

router.get('/:id', async function(req, res, next) { try { var id = getId(req.params.id); if (!id) return res.status(400).json({ error: 'id debe ser un entero positivo' }); var row = await db.get('SELECT * FROM alerts WHERE id = ?', [id]); if (!row) return res.status(404).json({ error: 'Alerta no encontrada' }); res.json(row); } catch (e) { next(e); } });
router.post('/', async function(req, res, next) { try { var e = validate(req.body); if (e.length) return res.status(400).json({ errors: e }); var r = await db.run('INSERT INTO alerts (code, category, description, latitude, longitude, status) VALUES (?, ?, ?, ?, ?, ?)', values(req.body)); res.status(201).json(await db.get('SELECT * FROM alerts WHERE id = ?', [r.id])); } catch (e) { next(e); } });
router.put('/:id', async function(req, res, next) { try { var id = getId(req.params.id); if (!id) return res.status(400).json({ error: 'id debe ser un entero positivo' }); var e = validate(req.body); if (e.length) return res.status(400).json({ errors: e }); var r = await db.run('UPDATE alerts SET code=?, category=?, description=?, latitude=?, longitude=?, status=?, updated_at=CURRENT_TIMESTAMP WHERE id=?', values(req.body).concat(id)); if (!r.changes) return res.status(404).json({ error: 'Alerta no encontrada' }); res.json(await db.get('SELECT * FROM alerts WHERE id = ?', [id])); } catch (e) { next(e); } });
router.delete('/:id', async function(req, res, next) { try { var id = getId(req.params.id); if (!id) return res.status(400).json({ error: 'id debe ser un entero positivo' }); var r = await db.run('DELETE FROM alerts WHERE id = ?', [id]); if (!r.changes) return res.status(404).json({ error: 'Alerta no encontrada' }); res.status(204).send(); } catch (e) { next(e); } });
module.exports = router;
