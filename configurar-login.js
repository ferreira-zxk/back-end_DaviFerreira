const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const destino = path.join(__dirname, '.env.login');

try {
  const configuracao = [
    `JWT_SECRET=${crypto.randomBytes(48).toString('hex')}`,
    'APP_ORIGIN=http://localhost:3000',
    'COOKIE_SECURE=false',
    'ADMIN_IDS=',
    ''
  ].join('\n');

  fs.writeFileSync(destino, configuracao, {
    flag: 'wx',
    mode: 0o600
  });

  console.log('Configuração criada. Não envie .env.login ao GitHub.');
} catch (erro) {
  if (erro.code === 'EEXIST') {
    console.log('Configuração já existe; segredo preservado.');
  } else {
    throw erro;
  }
}