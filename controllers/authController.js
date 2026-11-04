const crypto = require('crypto');
const repo = require('../dados/usuariosRepositorio');

const sessoes = new Map(); // token -> { id, nome, email }

function gerarHash(senha) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(senha, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

function conferirSenha(senha, armazenado) {
  const [salt, hash] = armazenado.split(':');
  const teste = crypto.scryptSync(senha, salt, 64);
  return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), teste);
}

exports.cadastrar = async (req, res) => {
  const { nome, email, senha } = req.body;
  if (!nome || !email || !senha) {
    return res.status(400).json({ erro: 'Preencha nome, email e senha.' });
  }
  if (senha.length < 6) {
    return res.status(400).json({ erro: 'A senha precisa ter pelo menos 6 caracteres.' });
  }
  if (await repo.buscarPorEmail(email)) {
    return res.status(409).json({ erro: 'Este email já está cadastrado.' });
  }
  await repo.criar(nome, email, gerarHash(senha));
  res.status(201).json({ mensagem: 'Usuário cadastrado com sucesso.' });
};

exports.login = async (req, res) => {
  const { email, senha } = req.body;
  const usuario = email && senha ? await repo.buscarPorEmail(email) : null;

  if (!usuario || !conferirSenha(senha, usuario.senha_hash)) {
    return res.status(401).json({ erro: 'Email ou senha incorretos.' });
  }
  const token = crypto.randomBytes(32).toString('hex');
  sessoes.set(token, { id: usuario.id, nome: usuario.nome, email: usuario.email });
  res.json({ token, nome: usuario.nome });
};

exports.logout = (req, res) => {
  const token = (req.headers.authorization || '').replace('Bearer ', '');
  sessoes.delete(token);
  res.json({ mensagem: 'Sessão encerrada.' });
};

// middleware pronto para uso, mas NÃO aplicado em nenhuma rota existente
exports.autenticar = (req, res, next) => {
  const token = (req.headers.authorization || '').replace('Bearer ', '');
  const usuario = sessoes.get(token);
  if (!usuario) return res.status(401).json({ erro: 'Não autenticado.' });
  req.usuario = usuario;
  next();
};

exports.perfil = (req, res) => res.json(req.usuario);