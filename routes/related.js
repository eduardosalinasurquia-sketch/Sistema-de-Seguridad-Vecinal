var express = require('express');
var db = require('../db');
var router = express.Router();
var resources = {
  neighborhoods: { table: 'neighborhoods', fields: ['name', 'address'], required: ['name'] },
  residents: { table: 'residents', fields: ['name', 'phone', 'email', 'neighborhood_id'], required: ['name', 'phone', 'neighborhood_id'] },
  authorities: { table: 'authorities', fields: ['name', 'institution', 'phone', 'active'], required: ['name', 'institution'] },
  comments: { table: 'alert_comments', fields: ['alert_id', 'resident_id', 'content'], required: ['alert_id', 'resident_id', 'content'] },
  assignments: { table: 'alert_assignments', fields: ['alert_id', 'authority_id', 'status'], required: ['alert_id', 'authority_id'] }
};
function id(v) { return /^[1-9]\d*$/.test(v) && Number.isSafeInteger(Number(v)) ? Number(v) : null; }
function clean(resource, body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return { errors: ['El cuerpo debe ser un objeto JSON'] };
  var errors = [], values = [];
  resource.required.forEach(function (field) { if (body[field] === undefined || body[field] === null || body[field] === '' || (typeof body[field] === 'string' && !body[field].trim())) errors.push(field + ' es obligatorio'); });
  resource.fields.forEach(function (field) { var value = body[field]; if (typeof value === 'string') value = value.trim(); if (field.endsWith('_id') && value != null && (!Number.isInteger(Number(value)) || Number(value) < 1)) errors.push(field + ' debe ser un entero positivo'); if (field === 'active') value = value === undefined ? 1 : Number(value) ? 1 : 0; values.push(value === undefined ? null : value); });
  if (body.content && String(body.content).length > 2000) errors.push('content no puede superar 2000 caracteres');
  if (body.status && resource.table === 'alert_assignments' && !['ASSIGNED','ACCEPTED','COMPLETED','CANCELLED'].includes(body.status)) errors.push('status no es válido');
  return { errors: errors, values: values };
}
Object.keys(resources).forEach(function (name) {
  var r = resources[name];
  router.get('/' + name, async function (req, res, next) { try { res.json(await db.all('SELECT * FROM ' + r.table + ' ORDER BY id DESC')); } catch (e) { next(e); } });
  router.get('/' + name + '/:id', async function (req, res, next) { try { var key = id(req.params.id); if (!key) return res.status(400).json({ error: 'id inválido' }); var row = await db.get('SELECT * FROM ' + r.table + ' WHERE id=?', [key]); if (!row) return res.status(404).json({ error: 'Registro no encontrado' }); res.json(row); } catch (e) { next(e); } });
  router.post('/' + name, async function (req, res, next) { try { var c = clean(r, req.body); if (c.errors.length) return res.status(400).json({ errors: c.errors }); var marks = r.fields.map(function () { return '?'; }).join(','); var result = await db.run('INSERT INTO ' + r.table + ' (' + r.fields.join(',') + ') VALUES (' + marks + ')', c.values); res.status(201).json(await db.get('SELECT * FROM ' + r.table + ' WHERE id=?', [result.id])); } catch (e) { if (e.code === 'SQLITE_CONSTRAINT') return res.status(409).json({ error: 'El registro viola una relación o restricción única' }); next(e); } });
  router.put('/' + name + '/:id', async function (req, res, next) { try { var key = id(req.params.id); if (!key) return res.status(400).json({ error: 'id inválido' }); var c = clean(r, req.body); if (c.errors.length) return res.status(400).json({ errors: c.errors }); var result = await db.run('UPDATE ' + r.table + ' SET ' + r.fields.map(function (f) { return f + '=?'; }).join(',') + ' WHERE id=?', c.values.concat(key)); if (!result.changes) return res.status(404).json({ error: 'Registro no encontrado' }); res.json(await db.get('SELECT * FROM ' + r.table + ' WHERE id=?', [key])); } catch (e) { next(e); } });
  router.delete('/' + name + '/:id', async function (req, res, next) { try { var key = id(req.params.id); if (!key) return res.status(400).json({ error: 'id inválido' }); var result = await db.run('DELETE FROM ' + r.table + ' WHERE id=?', [key]); if (!result.changes) return res.status(404).json({ error: 'Registro no encontrado' }); res.status(204).send(); } catch (e) { if (e.code === 'SQLITE_CONSTRAINT') return res.status(409).json({ error: 'No se puede eliminar: el registro está relacionado' }); next(e); } });
});
module.exports = router;
