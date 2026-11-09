const { consultar, executar } = require('./banco');

function listar() {
  return consultar('SELECT * FROM produtos');
}

function buscarPorId(id) {
  return consultar('SELECT * FROM produtos WHERE id = ?', [id])[0];
}

function criar(nome, preco) {
  const { ultimoId } = executar('INSERT INTO produtos (nome, preco) VALUES (?, ?)', [nome, preco]);
  return buscarPorId(ultimoId);
}

function atualizar(id, nome, preco) {
  executar('UPDATE produtos SET nome = ?, preco = ? WHERE id = ?', [nome, preco, id]);
  return buscarPorId(id);
}

function remover(id) {
  const { alteradas } = executar('DELETE FROM produtos WHERE id = ?', [id]);
  return alteradas > 0;
}

module.exports = { listar, buscarPorId, criar, atualizar, remover };