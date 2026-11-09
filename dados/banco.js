const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

const CAMINHO = path.join(__dirname, 'loja.db');
let db;

function salvarArquivo() {
  fs.writeFileSync(CAMINHO, Buffer.from(db.export()));
}

function consultar(sql, params = []) {
  const comando = db.prepare(sql);
  comando.bind(params);
  const linhas = [];
  while (comando.step()) {
    linhas.push(comando.getAsObject());
  }
  comando.free();
  return linhas;
}

function executar(sql, params = []) {
  db.run(sql, params);
  const alteradas = db.getRowsModified();
  const [{ id }] = consultar('SELECT last_insert_rowid() AS id');
  salvarArquivo();
  return { alteradas, ultimoId: id };
}

async function iniciar() {
  const SQL = await initSqlJs();
  db = fs.existsSync(CAMINHO)
    ? new SQL.Database(fs.readFileSync(CAMINHO))
    : new SQL.Database();

  db.run(`
    CREATE TABLE IF NOT EXISTS produtos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nome TEXT NOT NULL,
      preco REAL NOT NULL
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS usuarios (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nome TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      senha_hash TEXT NOT NULL
    )
  `);

  const [{ total }] = consultar('SELECT COUNT(*) AS total FROM produtos');
  if (total === 0) {
    db.run('INSERT INTO produtos (nome, preco) VALUES (?, ?)', ['Camiseta', 49.9]);
    db.run('INSERT INTO produtos (nome, preco) VALUES (?, ?)', ['Calça', 129.9]);
    db.run('INSERT INTO produtos (nome, preco) VALUES (?, ?)', ['Tênis', 299.9]);
  }

  salvarArquivo();
}

module.exports = { iniciar, consultar, executar };