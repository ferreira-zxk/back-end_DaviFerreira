const API = '/produtos';

const formulario = document.getElementById('formulario');
const campoNome = document.getElementById('nome');
const campoPreco = document.getElementById('preco');
const tituloForm = document.getElementById('titulo-form');
const botaoSalvar = document.getElementById('botao-salvar');
const botaoCancelar = document.getElementById('botao-cancelar');
const mensagem = document.getElementById('mensagem');
const lista = document.getElementById('lista');

let idEmEdicao = null;

function mostrarMensagem(texto, tipo) {
  mensagem.textContent = texto;
  mensagem.className = tipo;
}

function formatarPreco(valor) {
  return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function criarItem(produto) {
  const item = document.createElement('li');

  const info = document.createElement('div');
  const nome = document.createElement('strong');
  nome.textContent = produto.nome;
  const preco = document.createElement('div');
  preco.className = 'preco';
  preco.textContent = formatarPreco(produto.preco);
  info.append(nome, preco);

  const botaoEditar = document.createElement('button');
  botaoEditar.textContent = 'Editar';
  botaoEditar.className = 'editar';
  botaoEditar.addEventListener('click', () => iniciarEdicao(produto));

  const botaoApagar = document.createElement('button');
  botaoApagar.textContent = 'Apagar';
  botaoApagar.className = 'apagar';
  botaoApagar.addEventListener('click', () => apagarProduto(produto));

  const botoes = document.createElement('div');
  botoes.className = 'botoes';
  botoes.append(botaoEditar, botaoApagar);

  item.append(info, botoes);
  return item;
}

async function carregarProdutos() {
  lista.textContent = 'Carregando...';

  try {
    const resposta = await fetch(API);
    const produtos = await resposta.json();

    lista.textContent = '';
    if (produtos.length === 0) {
      lista.textContent = 'Nenhum produto cadastrado.';
      return;
    }
    produtos.forEach(produto => lista.append(criarItem(produto)));
  } catch {
    lista.textContent = 'Não foi possível carregar os produtos.';
  }
}

async function salvarProduto(evento) {
  evento.preventDefault();

  const dados = { nome: campoNome.value.trim(), preco: Number(campoPreco.value) };
  const url = idEmEdicao ? `${API}/${idEmEdicao}` : API;
  const metodo = idEmEdicao ? 'PUT' : 'POST';

  try {
    const resposta = await fetch(url, {
      method: metodo,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(dados)
    });
    const corpo = await resposta.json();

    if (!resposta.ok) {
      mostrarMensagem(corpo.erro, 'erro');
      return;
    }

    mostrarMensagem(idEmEdicao ? 'Produto atualizado!' : 'Produto cadastrado!', 'sucesso');
    cancelarEdicao();
    carregarProdutos();
  } catch {
    mostrarMensagem('Erro de conexão com o servidor.', 'erro');
  }
}

function iniciarEdicao(produto) {
  idEmEdicao = produto.id;
  campoNome.value = produto.nome;
  campoPreco.value = produto.preco;
  tituloForm.textContent = `Editando: ${produto.nome}`;
  botaoSalvar.textContent = 'Salvar alterações';
  botaoCancelar.hidden = false;
  mostrarMensagem('', '');
  campoNome.focus();
}

function cancelarEdicao() {
  idEmEdicao = null;
  formulario.reset();
  tituloForm.textContent = 'Cadastrar produto';
  botaoSalvar.textContent = 'Cadastrar';
  botaoCancelar.hidden = true;
}

async function apagarProduto(produto) {
  if (!confirm(`Apagar "${produto.nome}"?`)) return;

  try {
    const resposta = await fetch(`${API}/${produto.id}`, { method: 'DELETE' });

    if (!resposta.ok) {
      mostrarMensagem('Não foi possível apagar o produto.', 'erro');
      return;
    }

    if (idEmEdicao === produto.id) cancelarEdicao();
    mostrarMensagem('Produto apagado!', 'sucesso');
    carregarProdutos();
  } catch {
    mostrarMensagem('Erro de conexão com o servidor.', 'erro');
  }
}

formulario.addEventListener('submit', salvarProduto);
botaoCancelar.addEventListener('click', () => {
  cancelarEdicao();
  mostrarMensagem('', '');
});

carregarProdutos();