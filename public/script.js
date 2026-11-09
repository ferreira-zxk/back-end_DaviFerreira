const API = '/produtos';

const formLogin = document.getElementById('form-login');
const tituloLogin = document.getElementById('titulo-login');
const campoLoginNome = document.getElementById('login-nome');
const campoLoginEmail = document.getElementById('login-email');
const campoLoginSenha = document.getElementById('login-senha');
const botaoEntrar = document.getElementById('botao-entrar');
const botaoAlternar = document.getElementById('botao-alternar');
const mensagemLogin = document.getElementById('mensagem-login');
const areaUsuario = document.getElementById('area-usuario');
const saudacao = document.getElementById('saudacao');
const botaoSair = document.getElementById('botao-sair');

const formulario = document.getElementById('formulario');
const campoNome = document.getElementById('nome');
const campoPreco = document.getElementById('preco');
const tituloForm = document.getElementById('titulo-form');
const botaoSalvar = document.getElementById('botao-salvar');
const botaoCancelar = document.getElementById('botao-cancelar');
const mensagem = document.getElementById('mensagem');
const lista = document.getElementById('lista');

let idEmEdicao = null;
let modoCadastro = false;
let sessao = lerSessao();

// ---------- Sessão (login) ----------

function lerSessao() {
  try {
    return JSON.parse(localStorage.getItem('sessao'));
  } catch {
    return null;
  }
}

function estaLogado() {
  return sessao !== null;
}

function cabecalhos() {
  const cabecalho = { 'Content-Type': 'application/json' };
  if (sessao) cabecalho.Authorization = `Bearer ${sessao.token}`;
  return cabecalho;
}

function mostrar(elemento, texto, tipo) {
  elemento.textContent = texto;
  elemento.className = tipo;
}

function atualizarTela() {
  const logado = estaLogado();
  formLogin.hidden = logado;
  formulario.hidden = !logado;
  areaUsuario.hidden = !logado;
  if (logado) saudacao.textContent = `Olá, ${sessao.usuario.nome}!`;
  carregarProdutos();
}

function sair(texto, tipo) {
  sessao = null;
  localStorage.removeItem('sessao');
  cancelarEdicao();
  mostrar(mensagem, '', '');
  atualizarTela();
  if (texto) mostrar(mensagemLogin, texto, tipo);
}

function alternarModo() {
  modoCadastro = !modoCadastro;
  tituloLogin.textContent = modoCadastro ? 'Criar conta' : 'Entrar';
  botaoEntrar.textContent = modoCadastro ? 'Cadastrar' : 'Entrar';
  botaoAlternar.textContent = modoCadastro ? 'Já tenho conta' : 'Criar conta';
  campoLoginNome.hidden = !modoCadastro;
  mostrar(mensagemLogin, '', '');
}

async function enviarLogin(evento) {
  evento.preventDefault();
  const email = campoLoginEmail.value.trim();
  const senha = campoLoginSenha.value;

  try {
    if (modoCadastro) {
      const respostaCadastro = await fetch('/auth/cadastro', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nome: campoLoginNome.value.trim(), email, senha })
      });
      const corpoCadastro = await respostaCadastro.json();
      if (!respostaCadastro.ok) {
        mostrar(mensagemLogin, corpoCadastro.erro, 'erro');
        return;
      }
    }

    const resposta = await fetch('/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, senha })
    });
    const corpo = await resposta.json();

    if (!resposta.ok) {
      mostrar(mensagemLogin, corpo.erro, 'erro');
      return;
    }

    sessao = corpo;
    localStorage.setItem('sessao', JSON.stringify(sessao));
    formLogin.reset();
    if (modoCadastro) alternarModo();
    mostrar(mensagemLogin, '', '');
    atualizarTela();
  } catch {
    mostrar(mensagemLogin, 'Erro de conexão com o servidor.', 'erro');
  }
}

// ---------- Produtos ----------

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
  item.append(info);

  if (estaLogado()) {
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
    item.append(botoes);
  }

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
      headers: cabecalhos(),
      body: JSON.stringify(dados)
    });
    const corpo = await resposta.json();

    if (resposta.status === 401) {
      sair(corpo.erro, 'erro');
      return;
    }

    if (!resposta.ok) {
      mostrar(mensagem, corpo.erro, 'erro');
      return;
    }

    mostrar(mensagem, idEmEdicao ? 'Produto atualizado!' : 'Produto cadastrado!', 'sucesso');
    cancelarEdicao();
    carregarProdutos();
  } catch {
    mostrar(mensagem, 'Erro de conexão com o servidor.', 'erro');
  }
}

function iniciarEdicao(produto) {
  idEmEdicao = produto.id;
  campoNome.value = produto.nome;
  campoPreco.value = produto.preco;
  tituloForm.textContent = `Editando: ${produto.nome}`;
  botaoSalvar.textContent = 'Salvar alterações';
  botaoCancelar.hidden = false;
  mostrar(mensagem, '', '');
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
    const resposta = await fetch(`${API}/${produto.id}`, {
      method: 'DELETE',
      headers: cabecalhos()
    });

    if (resposta.status === 401) {
      const corpo = await resposta.json();
      sair(corpo.erro, 'erro');
      return;
    }

    if (!resposta.ok) {
      mostrar(mensagem, 'Não foi possível apagar o produto.', 'erro');
      return;
    }

    if (idEmEdicao === produto.id) cancelarEdicao();
    mostrar(mensagem, 'Produto apagado!', 'sucesso');
    carregarProdutos();
  } catch {
    mostrar(mensagem, 'Erro de conexão com o servidor.', 'erro');
  }
}

// ---------- Eventos ----------

formLogin.addEventListener('submit', enviarLogin);
botaoAlternar.addEventListener('click', alternarModo);
botaoSair.addEventListener('click', () => sair('Você saiu da sua conta.', 'sucesso'));

formulario.addEventListener('submit', salvarProduto);
botaoCancelar.addEventListener('click', () => {
  cancelarEdicao();
  mostrar(mensagem, '', '');
});

atualizarTela();