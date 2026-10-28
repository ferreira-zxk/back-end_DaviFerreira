const fs = require('fs/promises');
const path = require('path');

const CAMINHO = path.join(__dirname, 'banco.json');

async function lerBanco() {
  const conteudo = await fs.readFile(CAMINHO, 'utf-8');
  return JSON.parse(conteudo);
}

async function salvarBanco(banco) {
  await fs.writeFile(CAMINHO, JSON.stringify(banco, null, 2));
}

module.exports = { lerBanco, salvarBanco };