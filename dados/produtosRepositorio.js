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

  const [{ total }] = consultar('SELECT COUNT(*) AS total FROM produtos');
  if (total === 0) {
    db.run('INSERT INTO produtos (nome, preco) VALUES (?, ?)', ['Camiseta', 49.9]);
    db.run('INSERT INTO produtos (nome, preco) VALUES (?, ?)', ['Calça', 129.9]);
    db.run('INSERT INTO produtos (nome, preco) VALUES (?, ?)', ['Tênis', 299.9]);
  }

  salvarArquivo();
}

function listar() {
  return consultar('SELECT * FROM produtos');
}

function buscarPorId(id) {
  return consultar('SELECT * FROM produtos WHERE id = ?', [id])[0];
}

function criar(nome, preco) {
  db.run('INSERT INTO produtos (nome, preco) VALUES (?, ?)', [nome, preco]);
  const [{ id }] = consultar('SELECT last_insert_rowid() AS id');
  salvarArquivo();
  return buscarPorId(id);
}

function atualizar(id, nome, preco) {
  db.run('UPDATE produtos SET nome = ?, preco = ? WHERE id = ?', [nome, preco, id]);
  salvarArquivo();
  return buscarPorId(id);
}

function remover(id) {
  db.run('DELETE FROM produtos WHERE id = ?', [id]);
  const alteradas = db.getRowsModified();
  salvarArquivo();
  return alteradas > 0;
}

module.exports = { iniciar, listar, buscarPorId, criar, atualizar, remover };