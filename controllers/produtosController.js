const repo = require('../dados/produtosRepositorio');

function listar(req, res) {
  res.json(repo.listar());
}

function buscarPorId(req, res) {
  const produto = repo.buscarPorId(Number(req.params.id));

  if (!produto) {
    return res.status(404).json({ erro: 'Produto não encontrado' });
  }

  res.json(produto);
}

function criar(req, res) {
  const { nome, preco } = req.body;

  if (!nome || !preco || preco <= 0) {
    return res.status(400).json({ erro: 'Informe um nome e um preço maior que zero' });
  }

  const novoProduto = repo.criar(nome, preco);
  res.status(201).json(novoProduto);
}

function atualizar(req, res) {
  const id = Number(req.params.id);
  const produto = repo.buscarPorId(id);

  if (!produto) {
    return res.status(404).json({ erro: 'Produto não encontrado' });
  }

  const nome = req.body.nome ?? produto.nome;
  const preco = req.body.preco ?? produto.preco;

  if (!nome || !preco || preco <= 0) {
    return res.status(400).json({ erro: 'Informe um nome e um preço maior que zero' });
  }

  res.json(repo.atualizar(id, nome, preco));
}

function remover(req, res) {
  const removido = repo.remover(Number(req.params.id));

  if (!removido) {
    return res.status(404).json({ erro: 'Produto não encontrado' });
  }

  res.status(204).send();
}

module.exports = { listar, buscarPorId, criar, atualizar, remover };