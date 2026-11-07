const path = require('path');
const sqlite3 = require('sqlite3').verbose();

const database = new sqlite3.Database(path.join(__dirname, 'data', 'seguridad.db'));
const ready = initializeDatabase();

function run(sql, params = []) {
  return new Promise((resolve, reject) => {
    database.run(sql, params, function onRun(error) {
      if (error) return reject(error);
      resolve({ id: this.lastID, changes: this.changes });
    });
  });
}

function all(sql, params = []) {
  return new Promise((resolve, reject) => {
    database.all(sql, params, (error, rows) => error ? reject(error) : resolve(rows));
  });
}

function get(sql, params = []) {
  return new Promise((resolve, reject) => {
    database.get(sql, params, (error, row) => error ? reject(error) : resolve(row));
  });
}

async function initializeDatabase() {
  // DELETE mantiene el esquema visible para clientes SQLite sencillos (incluido el visor de VS Code).
  await run('PRAGMA journal_mode = DELETE');
  await run('PRAGMA foreign_keys = ON');
  await run('PRAGMA busy_timeout = 5000');
  await run(`CREATE TABLE IF NOT EXISTS alerts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code TEXT NOT NULL CHECK (code IN ('RED', 'ORANGE', 'YELLOW')),
    category TEXT NOT NULL,
    description TEXT NOT NULL,
    latitude REAL,
    longitude REAL,
    status TEXT NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'IN_PROGRESS', 'RESOLVED', 'DISMISSED')),
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`);
  await run(`CREATE TABLE IF NOT EXISTS neighborhoods (
    id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL UNIQUE, address TEXT, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`);
  await run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, email TEXT NOT NULL UNIQUE, password_hash TEXT NOT NULL, role TEXT NOT NULL DEFAULT 'RESIDENT' CHECK (role IN ('RESIDENT','MODERATOR','ADMIN')), active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0,1)), created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`);
  await run(`CREATE TABLE IF NOT EXISTS residents (
    id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, phone TEXT NOT NULL UNIQUE, email TEXT UNIQUE, neighborhood_id INTEGER NOT NULL, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (neighborhood_id) REFERENCES neighborhoods(id) ON UPDATE CASCADE ON DELETE RESTRICT
  )`);
  await run(`CREATE TABLE IF NOT EXISTS authorities (
    id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, institution TEXT NOT NULL, phone TEXT, active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0,1)), created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`);
  await run(`CREATE TABLE IF NOT EXISTS alert_comments (
    id INTEGER PRIMARY KEY AUTOINCREMENT, alert_id INTEGER NOT NULL, resident_id INTEGER NOT NULL, content TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (alert_id) REFERENCES alerts(id) ON DELETE CASCADE, FOREIGN KEY (resident_id) REFERENCES residents(id) ON DELETE RESTRICT
  )`);
  await run(`CREATE TABLE IF NOT EXISTS alert_assignments (
    id INTEGER PRIMARY KEY AUTOINCREMENT, alert_id INTEGER NOT NULL, authority_id INTEGER NOT NULL, status TEXT NOT NULL DEFAULT 'ASSIGNED' CHECK (status IN ('ASSIGNED','ACCEPTED','COMPLETED','CANCELLED')), assigned_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(alert_id, authority_id), FOREIGN KEY (alert_id) REFERENCES alerts(id) ON DELETE CASCADE, FOREIGN KEY (authority_id) REFERENCES authorities(id) ON DELETE RESTRICT
  )`);
}

module.exports = { all, get, run, initializeDatabase, ready };
