(function () {
  const logoutForm = document.getElementById('logout-form');
  logoutForm.addEventListener('submit', async function (event) { event.preventDefault(); await fetch('/api/auth/logout', { method: 'POST' }); window.location.href = '/login'; });
  const labels = { name: 'Nombre', address: 'Dirección', phone: 'Teléfono', email: 'Correo electrónico', neighborhood_id: 'Barrio', institution: 'Institución', active: 'Estado', alert_id: 'Alerta', resident_id: 'Vecino', authority_id: 'Autoridad', content: 'Comentario', status: 'Estado' };
  const values = { OPEN: 'Abierta', IN_PROGRESS: 'En progreso', RESOLVED: 'Resuelta', DISMISSED: 'Descartada', ASSIGNED: 'Asignada', ACCEPTED: 'Aceptada', COMPLETED: 'Completada', CANCELLED: 'Cancelada', 1: 'Activa', 0: 'Inactiva' };
  const codes = { RED: 'Rojo', ORANGE: 'Naranja', YELLOW: 'Amarillo' };
  const resourceNames = { neighborhoods: 'Barrios', residents: 'Vecinos', authorities: 'Autoridades', comments: 'Comentarios', assignments: 'Asignaciones' };
  const relationConfig = { neighborhood_id: { endpoint: 'neighborhoods', label: function (row) { return row.name; } }, resident_id: { endpoint: 'residents', label: function (row) { return row.name + ' (' + row.phone + ')'; } }, alert_id: { endpoint: 'alerts', label: function (row) { return '#' + row.id + ' - ' + row.category + ': ' + row.description; } }, authority_id: { endpoint: 'authorities', label: function (row) { return row.name + ' - ' + row.institution; } } };
  const relationCache = {};
  document.querySelectorAll('[data-label]').forEach(function (label) { label.textContent = labels[label.dataset.label] || label.dataset.label; });
  document.querySelectorAll('#module-nav [data-module]').forEach(function (button) {
    button.addEventListener('click', function () {
      document.querySelectorAll('.module-view').forEach(function (view) { view.hidden = view.id !== 'module-' + button.dataset.module; });
      document.querySelectorAll('#module-nav button').forEach(function (item) { item.classList.toggle('active', item === button); });
    });
  });
  document.querySelector('#module-nav [data-module="alerts"]').click();
  const form = document.getElementById('alert-form');
  const body = document.getElementById('alerts-body');
  const message = document.getElementById('message');
  const cancel = document.getElementById('cancel-button');
  const idInput = document.getElementById('alert-id');

  function value(id) { return document.getElementById(id).value; }
  function setMessage(text, error) { message.textContent = text; message.className = error ? 'error' : 'success'; }
  function escape(text) { const div = document.createElement('div'); div.textContent = text == null ? '' : text; return div.innerHTML; }

  async function request(url, options) {
    options = options || {};
    options.credentials = 'same-origin';
    const response = await fetch(url, options);
    const data = response.status === 204 ? null : await response.json();
    if (!response.ok) throw new Error(data && (data.errors || [data.error]).join(', '));
    return data;
  }

  function render(data) {
    body.innerHTML = data.data.map(function (alert) {
      const location = alert.latitude == null ? 'Sin ubicación' : alert.latitude + ', ' + alert.longitude;
      return '<tr><td><span class="badge ' + alert.code.toLowerCase() + '">' + escape(codes[alert.code] || alert.code) + '</span></td>' +
        '<td>' + escape(alert.category) + '</td><td>' + escape(alert.description) + '</td>' +
        '<td>' + escape(values[alert.status] || alert.status) + '</td><td>' + escape(location) + '</td>' +
        '<td><button data-edit="' + alert.id + '">Editar</button> <button data-delete="' + alert.id + '">Eliminar</button></td></tr>';
    }).join('') || '<tr><td colspan="6">No hay alertas registradas.</td></tr>';
  }

  async function load() { render(await request('/api/alerts?limit=100')); }
  function reset() { form.reset(); idInput.value = ''; cancel.hidden = true; document.getElementById('save-button').textContent = 'Guardar alerta'; }

  form.addEventListener('submit', async function (event) {
    event.preventDefault();
    const payload = { code: value('code'), category: value('category'), description: value('description'), status: value('status'), latitude: value('latitude') || null, longitude: value('longitude') || null };
    try { await request(idInput.value ? '/api/alerts/' + idInput.value : '/api/alerts', { method: idInput.value ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }); reset(); await load(); setMessage('Alerta guardada correctamente.'); } catch (error) { setMessage(error.message, true); }
  });
  cancel.addEventListener('click', reset);
  body.addEventListener('click', async function (event) {
    const id = event.target.dataset.edit || event.target.dataset.delete;
    if (!id) return;
    try {
      if (event.target.dataset.delete) { if (!confirm('¿Eliminar esta alerta?')) return; await request('/api/alerts/' + id, { method: 'DELETE' }); await load(); setMessage('Alerta eliminada.'); return; }
      const alert = await request('/api/alerts/' + id);
      ['code', 'category', 'description', 'status', 'latitude', 'longitude'].forEach(function (field) { document.getElementById(field).value = alert[field] == null ? '' : alert[field]; });
      idInput.value = id; cancel.hidden = false; document.getElementById('save-button').textContent = 'Actualizar alerta'; window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (error) { setMessage(error.message, true); }
  });
  load().catch(function (error) { setMessage(error.message, true); });

  const resources = {
    neighborhoods: ['name', 'address'], residents: ['name', 'phone', 'email', 'neighborhood_id'],
    authorities: ['name', 'institution', 'phone', 'active'], comments: ['alert_id', 'resident_id', 'content'],
    assignments: ['alert_id', 'authority_id', 'status']
  };
  Object.keys(resources).forEach(function (name) {
    const sectionForm = document.querySelector('.resource-form[data-resource="' + name + '"]');
    const section = sectionForm.parentElement;
    const tableHead = section.querySelector('.resource-head');
    const tableBody = section.querySelector('.resource-body');
    const fields = resources[name];
    fields.filter(function (field) { return relationConfig[field]; }).forEach(function (field) {
      const oldInput = sectionForm.querySelector('[data-field="' + field + '"]');
      const select = document.createElement('select'); select.dataset.field = field; select.required = true; select.innerHTML = '<option value="">Seleccione...</option>'; oldInput.replaceWith(select);
      request('/api/' + relationConfig[field].endpoint).then(function (result) { const rows = Array.isArray(result) ? result : (result.data || []); relationCache[field] = {}; rows.forEach(function (row) { const text = relationConfig[field].label(row); relationCache[field][row.id] = text; const option = document.createElement('option'); option.value = row.id; option.textContent = text; select.appendChild(option); }); refresh(); }).catch(function (e) { setMessage('No se pudieron cargar las relaciones: ' + e.message, true); });
    });
    fields.forEach(function (field) { const th = document.createElement('th'); th.textContent = labels[field] || field; tableHead.appendChild(th); });
    const actionHead = document.createElement('th'); actionHead.textContent = 'Acciones'; tableHead.appendChild(actionHead);
    function displayValue(field, value) { if (relationConfig[field]) return (relationCache[field] && relationCache[field][value]) || 'Registro #' + value; return values[value] || value; }
    async function refresh() { const result = await request('/api/' + name); tableBody.innerHTML = result.map(function (row) { return '<tr>' + fields.map(function (f) { return '<td>' + escape(displayValue(f, row[f])) + '</td>'; }).join('') + '<td><button data-edit-resource="' + row.id + '">Editar</button> <button data-delete-resource="' + row.id + '">Eliminar</button></td></tr>'; }).join('') || '<tr><td colspan="' + (fields.length + 1) + '">Sin registros.</td></tr>'; }
    sectionForm.addEventListener('submit', async function (event) { event.preventDefault(); const id = sectionForm.querySelector('.resource-id').value; const payload = {}; fields.forEach(function (f) { payload[f] = sectionForm.querySelector('[data-field="' + f + '"]').value; }); if (payload.active !== undefined) payload.active = Number(payload.active); try { await request('/api/' + name + (id ? '/' + id : ''), { method: id ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }); sectionForm.reset(); sectionForm.querySelector('.resource-id').value = ''; sectionForm.querySelector('.resource-cancel').hidden = true; await refresh(); setMessage((resourceNames[name] || name) + ' guardados correctamente.'); } catch (e) { setMessage(e.message, true); } });
    sectionForm.querySelector('.resource-cancel').addEventListener('click', function () { sectionForm.reset(); sectionForm.querySelector('.resource-id').value = ''; sectionForm.querySelector('.resource-cancel').hidden = true; });
    tableBody.addEventListener('click', async function (event) { const edit = event.target.dataset.editResource, del = event.target.dataset.deleteResource, key = edit || del; if (!key) return; try { if (del) { if (!confirm('¿Eliminar este registro?')) return; await request('/api/' + name + '/' + key, { method: 'DELETE' }); await refresh(); return; } const row = await request('/api/' + name + '/' + key); fields.forEach(function (f) { sectionForm.querySelector('[data-field="' + f + '"]').value = row[f] == null ? '' : row[f]; }); sectionForm.querySelector('.resource-id').value = key; sectionForm.querySelector('.resource-cancel').hidden = false; } catch (e) { setMessage(e.message, true); } });
    refresh().catch(function (e) { setMessage(e.message, true); });
  });
  document.querySelector('#module-nav [data-module="reports"]').addEventListener('click', async function () {
    document.querySelector('#report-nav [data-report="summary"]').click();
    try {
      const report = await request('/api/reports');
      const labels = { users: 'Usuarios', alerts: 'Alertas', neighborhoods: 'Barrios', residents: 'Vecinos', authorities: 'Autoridades', comments: 'Comentarios', assignments: 'Asignaciones' };
      document.getElementById('report-cards').innerHTML = Object.keys(report.totals).map(function (key) { return '<div class="report-card"><strong>' + labels[key] + '</strong><span>' + report.totals[key] + '</span></div>'; }).join('');
      document.getElementById('report-codes').innerHTML = report.alerts.byCode.map(function (r) { return '<tr><td>' + (codes[r.code] || r.code) + '</td><td>' + r.total + '</td></tr>'; }).join('');
      document.getElementById('report-statuses').innerHTML = report.alerts.byStatus.map(function (r) { return '<tr><td>' + (values[r.status] || r.status) + '</td><td>' + r.total + '</td></tr>'; }).join('');
      const details = await request('/api/reports/alerts'); document.getElementById('report-alerts').innerHTML = details.map(function (r) { return '<tr><td>' + (codes[r.code] || r.code) + '</td><td>' + escape(r.category) + '</td><td>' + (values[r.status] || r.status) + '</td><td>' + r.comments + '</td><td>' + r.assignments + '</td></tr>'; }).join('');
      const relational = await request('/api/reports/relational');
      document.getElementById('report-neighborhoods').innerHTML = relational.neighborhoods.map(function (r) { return '<tr><td>' + escape(r.name) + '</td><td>' + escape(r.address || '') + '</td></tr>'; }).join('');
      document.getElementById('report-residents').innerHTML = relational.residents.map(function (r) { return '<tr><td>' + escape(r.name) + '</td><td>' + escape(r.phone) + '</td><td>' + escape(r.neighborhood) + '</td></tr>'; }).join('');
      document.getElementById('report-authorities').innerHTML = relational.authorities.map(function (r) { return '<tr><td>' + escape(r.name) + '</td><td>' + escape(r.institution) + '</td><td>' + (r.active ? 'Activa' : 'Inactiva') + '</td></tr>'; }).join('');
      document.getElementById('report-comments').innerHTML = relational.comments.map(function (r) { return '<tr><td>' + escape(r.alert) + '</td><td>' + escape(r.resident) + '</td><td>' + escape(r.content) + '</td></tr>'; }).join('');
      document.getElementById('report-assignments').innerHTML = relational.assignments.map(function (r) { return '<tr><td>' + escape(r.alert) + '</td><td>' + escape(r.authority) + '</td><td>' + (values[r.status] || r.status) + '</td></tr>'; }).join('');
    } catch (error) { setMessage(error.message, true); }
  });
  document.querySelectorAll('#report-nav [data-report]').forEach(function (button) { button.addEventListener('click', function () { document.querySelectorAll('#report-nav button').forEach(function (b) { b.classList.toggle('active', b === button); }); const mode = button.dataset.report; document.getElementById('report-cards').hidden = mode !== 'summary'; document.getElementById('report-codes-panel').hidden = mode !== 'codes'; document.getElementById('report-statuses-panel').hidden = mode !== 'statuses'; document.getElementById('report-details-panel').hidden = mode !== 'details'; const summaryTable = document.getElementById('report-alerts').closest('table'); summaryTable.hidden = mode !== 'summary'; summaryTable.previousElementSibling.hidden = mode !== 'summary'; }); });
}());
