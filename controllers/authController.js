const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const usuariosRepo = require('../dados/usuariosRepositorio');

function cadastrar(req, res) {
  const { nome, email, senha } = req.body;

  if (!nome || !email || !senha) {
    return res.status(400).json({ erro: 'Nome, e-mail e senha são obrigatórios' });
  }

  if (senha.length < 6) {
    return res.status(400).json({ erro: 'A senha precisa ter pelo menos 6 caracteres' });
  }

  if (usuariosRepo.buscarPorEmail(email)) {
    return res.status(409).json({ erro: 'Este e-mail já está cadastrado' });
  }

  const senhaHash = bcrypt.hashSync(senha, 10);
  const usuario = usuariosRepo.criar(nome, email, senhaHash);

  res.status(201).json(usuario);
}

function login(req, res) {
  const { email, senha } = req.body;
  const usuario = usuariosRepo.buscarPorEmail(email ?? '');

  if (!usuario || !bcrypt.compareSync(senha ?? '', usuario.senha_hash)) {
    return res.status(401).json({ erro: 'E-mail ou senha incorretos' });
  }

  const token = jwt.sign(
    { id: usuario.id, nome: usuario.nome },
    process.env.JWT_SEGREDO,
    { expiresIn: '2h' }
  );

  res.json({ token, usuario: { id: usuario.id, nome: usuario.nome, email: usuario.email } });
}

module.exports = { cadastrar, login };