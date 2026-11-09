const { consultar, executar } = require('./banco');

function buscarPorEmail(email) {
  return consultar('SELECT * FROM usuarios WHERE email = ?', [email])[0];
}

function criar(nome, email, senhaHash) {
  const { ultimoId } = executar(
    'INSERT INTO usuarios (nome, email, senha_hash) VALUES (?, ?, ?)',
    [nome, email, senhaHash]
  );
  return { id: ultimoId, nome, email };
}

module.exports = { buscarPorEmail, criar };