const fs = require('fs');
const path = require('path');
const initSqlJs = require('sql.js');

const arquivo = path.join(__dirname, 'usuarios.db');
let db;

async function iniciar() {
  const SQL = await initSqlJs();
  db = fs.existsSync(arquivo)
    ? new SQL.Database(fs.readFileSync(arquivo))
    : new SQL.Database();

  db.run(`CREATE TABLE IF NOT EXISTS usuarios (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nome TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    senha_hash TEXT NOT NULL
  )`);
  salvar();
}

// já começa a iniciar quando o arquivo é carregado
const pronto = iniciar();

function salvar() {
  fs.writeFileSync(arquivo, Buffer.from(db.export()));
}

async function buscarPorEmail(email) {
  await pronto;
  const stmt = db.prepare('SELECT * FROM usuarios WHERE email = ?');
  stmt.bind([email]);
  const usuario = stmt.step() ? stmt.getAsObject() : null;
  stmt.free();
  return usuario;
}

async function criar(nome, email, senhaHash) {
  await pronto;
  db.run('INSERT INTO usuarios (nome, email, senha_hash) VALUES (?, ?, ?)', [nome, email, senhaHash]);
  salvar();
}

module.exports = { buscarPorEmail, criar };