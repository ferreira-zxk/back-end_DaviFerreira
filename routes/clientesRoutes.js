const express = require('express');
const crypto = require('node:crypto');
const { promisify } = require('node:util');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { z } = require('zod');
const { rateLimit } = require('express-rate-limit');

const repo = require('../dados/clientesRepositorio');

const scrypt = promisify(crypto.scrypt);
const segredo = process.env.JWT_SECRET;

if (!segredo || Buffer.byteLength(segredo) < 32) {
  throw new Error(
    'JWT_SECRET ausente ou curto. Execute node configurar-login.js.'
  );
}

const verificacao = {
  algorithms: ['HS256'],
  issuer: 'minha-loja',
  audience: 'clientes'
};

const cadastroSchema = z.object({
  nome: z.string().trim().min(2).max(100),

  email: z.string()
    .trim()
    .toLowerCase()
    .max(254)
    .email(),

  senha: z.string()
    .min(8)
    .max(128)
    .refine(senha => Buffer.byteLength(senha, 'utf8') <= 72)
});

const loginSchema = z.object({
  email: z.string()
    .trim()
    .toLowerCase()
    .max(254)
    .email(),

  senha: z.string().min(1).max(128)
});

const hashFicticio = bcrypt.hashSync(
  crypto.randomBytes(32).toString('hex'),
  12
);

const router = express.Router();
const sessoes = new Map();

const duracao = 8 * 60 * 60 * 1000;

const cookieOpcoes = {
  httpOnly: true,
  sameSite: 'strict',
  secure: process.env.COOKIE_SECURE === 'true',
  path: '/'
};

function token(req) {
  return req.cookies?.loja_sessao || '';
}

function validarToken(req) {
  try {
    const payload = jwt.verify(
      token(req),
      segredo,
      verificacao
    );

    if (
      typeof payload !== 'object' ||
      typeof payload.sub !== 'string' ||
      !/^\d+$/.test(payload.sub) ||
      typeof payload.jti !== 'string'
    ) {
      return null;
    }

    const sessao = sessoes.get(payload.jti);

    if (
      !sessao ||
      sessao.clienteId !== Number(payload.sub) ||
      sessao.expira <= Date.now()
    ) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

function cliente(req) {
  const payload = validarToken(req);

  return payload
    ? repo.buscarId(Number(payload.sub))
    : null;
}

function revogar(req) {
  const payload = validarToken(req);

  if (payload) {
    sessoes.delete(payload.jti);
  }
}

function novaSessao(req, res, id) {
  revogar(req);

  const jti = crypto.randomUUID();

  const valor = jwt.sign({}, segredo, {
    algorithm: 'HS256',
    expiresIn: '8h',
    issuer: 'minha-loja',
    audience: 'clientes',
    subject: String(id),
    jwtid: jti
  });

  sessoes.set(jti, {
    clienteId: id,
    expira: Date.now() + duracao
  });

  res.cookie('loja_sessao', valor, {
    ...cookieOpcoes,
    maxAge: duracao
  });
}

function origem(req, res, next) {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return next();
  }

  // Sem CORS: outro domínio não pode enviar este cabeçalho
  // pelo navegador sem uma autorização de preflight.
  if (req.get('X-Loja-Cliente') !== '1') {
    return res.status(403).json({
      erro: 'Requisição não autorizada.'
    });
  }

  const valor = req.get('Origin');

  if (valor) {
    const permitida =
      process.env.APP_ORIGIN || 'http://localhost:3000';

    try {
      if (new URL(valor).origin !== permitida) {
        return res.status(403).json({
          erro: 'Origem não autorizada.'
        });
      }
    } catch {
      return res.status(403).json({
        erro: 'Origem inválida.'
      });
    }
  }

  next();
}

function exigirLogin(req, res, next) {
  const atual = cliente(req);

  if (!atual) {
    return res.status(401).json({
      erro: 'Entre na sua conta para continuar.'
    });
  }

  req.cliente = atual;
  next();
}

setInterval(() => {
  const agora = Date.now();

  for (const [chave, valor] of sessoes) {
    if (valor.expira <= agora) {
      sessoes.delete(chave);
    }
  }
}, 60000).unref();

router.use((req, res, next) => {
  res.set('Cache-Control', 'no-store');
  next();
});

router.use(origem);

router.use(
  ['/login', '/cadastro'],
  rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 30,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    skip: req => req.method !== 'POST',
    message: {
      erro: 'Muitas tentativas. Aguarde 15 minutos.'
    }
  })
);

router.post('/cadastro', async (req, res) => {
  const validacao = cadastroSchema.safeParse(req.body);

  if (!validacao.success) {
    return res.status(400).json({
      erro:
        'Informe nome, e-mail válido e senha de pelo menos ' +
        '8 caracteres, com máximo de 72 bytes UTF-8.'
    });
  }

  const { nome, email, senha } = validacao.data;

  if (repo.buscarEmail(email)) {
    return res.status(409).json({
      erro: 'Este e-mail já está cadastrado.'
    });
  }

  const hash = await bcrypt.hash(senha, 12);

  // Outra requisição pode cadastrar o mesmo e-mail
  // enquanto o hash é calculado.
  if (repo.buscarEmail(email)) {
    return res.status(409).json({
      erro: 'Este e-mail já está cadastrado.'
    });
  }

  const novo = repo.criar(nome, email, hash, 'bcrypt');

  novaSessao(req, res, novo.id);

  res.status(201).json({
    cliente: repo.buscarId(novo.id)
  });
});

router.post('/login', async (req, res) => {
  const validacao = loginSchema.safeParse(req.body);

  if (!validacao.success) {
    return res.status(400).json({
      erro: 'Informe e-mail e senha válidos.'
    });
  }

  const { email, senha } = validacao.data;
  const atual = repo.buscarEmail(email);

  let confere = false;

  if (atual && atual.salt !== 'bcrypt') {
    // Compatibilidade com contas da primeira versão.
    const hash = await scrypt(senha, atual.salt, 64);

    confere = crypto.timingSafeEqual(
      hash,
      Buffer.from(atual.senha_hash, 'hex')
    );
  } else {
    const valido = await bcrypt.compare(
      senha,
      atual ? atual.senha_hash : hashFicticio
    );

    confere = Boolean(
      atual &&
      Buffer.byteLength(senha, 'utf8') <= 72 &&
      valido
    );
  }

  if (!confere) {
    return res.status(401).json({
      erro: 'E-mail ou senha incorretos.'
    });
  }

  novaSessao(req, res, atual.id);

  res.json({
    cliente: repo.buscarId(atual.id)
  });
});

router.get('/me', exigirLogin, (req, res) => {
  res.json({ cliente: req.cliente });
});

router.post('/logout', (req, res) => {
  revogar(req);

  res.clearCookie('loja_sessao', cookieOpcoes);

  res.status(204).end();
});

router.post(
  '/redefinir',
  rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 10,
    message: {
      erro: 'Muitas tentativas. Aguarde 15 minutos.'
    }
  }),
  async (req, res) => {
    const schema = z.object({
      token: z.string().regex(/^[a-f0-9]{64}$/),
      senha: cadastroSchema.shape.senha
    });

    const validacao = schema.safeParse(req.body);

    if (!validacao.success) {
      return res.status(400).json({
        erro: 'Token ou nova senha inválidos.'
      });
    }

    const hash = crypto
      .createHash('sha256')
      .update(validacao.data.token)
      .digest('hex');

    const senhaHash = await bcrypt.hash(
      validacao.data.senha,
      12
    );

    const id = repo.consumirReset(hash, senhaHash);

    if (!id) {
      return res.status(400).json({
        erro: 'Link inválido ou expirado.'
      });
    }

    for (const [jti, sessao] of sessoes) {
      if (sessao.clienteId === id) {
        sessoes.delete(jti);
      }
    }

    res.json({
      mensagem: 'Senha atualizada. Entre novamente.'
    });
  }
);

module.exports = {
  router,
  exigirLogin,
  cliente
};