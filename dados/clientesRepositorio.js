const initSqlJs = require('sql.js');
const fs = require('node:fs');
const path = require('node:path');

const arquivo = path.join(__dirname, 'clientes.db');

let db;

function consultar(sql, parametros = []) {
  const stmt = db.prepare(sql);

  try {
    stmt.bind(parametros);

    const linhas = [];

    while (stmt.step()) {
      linhas.push(stmt.getAsObject());
    }

    return linhas;
  } finally {
    stmt.free();
  }
}

function salvar() {
  fs.writeFileSync(
    arquivo + '.tmp',
    Buffer.from(db.export()),
    { mode: 0o600 }
  );

  fs.renameSync(arquivo + '.tmp', arquivo);
}

async function iniciar() {
  const SQL = await initSqlJs();

  db = fs.existsSync(arquivo)
    ? new SQL.Database(fs.readFileSync(arquivo))
    : new SQL.Database();

  db.run(`
    CREATE TABLE IF NOT EXISTS clientes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nome TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      senha_hash TEXT NOT NULL,
      salt TEXT NOT NULL
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS resets (
      cliente_id INTEGER PRIMARY KEY,
      hash TEXT NOT NULL,
      expira INTEGER NOT NULL
    )
  `);

  salvar();
}

function buscarEmail(email) {
  return consultar(
    'SELECT * FROM clientes WHERE email = ?',
    [email]
  )[0];
}

function buscarId(id) {
  return consultar(
    'SELECT id, nome, email FROM clientes WHERE id = ?',
    [id]
  )[0];
}

function criar(nome, email, hash, salt) {
  db.run(
    `INSERT INTO clientes (nome, email, senha_hash, salt)
     VALUES (?, ?, ?, ?)`,
    [nome, email, hash, salt]
  );

  salvar();

  return buscarEmail(email);
}

function emitirReset(id, hash, expira) {
  db.run(
    'INSERT OR REPLACE INTO resets VALUES (?, ?, ?)',
    [id, hash, expira]
  );

  salvar();
}

function consumirReset(hash, senhaHash) {
  const item = consultar(
    'SELECT * FROM resets WHERE hash = ? AND expira > ?',
    [hash, Date.now()]
  )[0];

  if (!item) return null;

  db.run(
    'UPDATE clientes SET senha_hash = ?, salt = ? WHERE id = ?',
    [senhaHash, 'bcrypt', item.cliente_id]
  );

  db.run(
    'DELETE FROM resets WHERE cliente_id = ?',
    [item.cliente_id]
  );

  salvar();

  return item.cliente_id;
}

module.exports = {
  iniciar,
  buscarEmail,
  buscarId,
  criar,
  emitirReset,
  consumirReset
};