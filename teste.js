const BASE = 'http://localhost:3000';
const LIMPAR_NO_FINAL = true;

let aprovados = 0;
let reprovados = 0;

async function pedir(metodo, caminho, dados, token) {
  const opcoes = { method: metodo, headers: { 'Content-Type': 'application/json' } };
  if (dados) opcoes.body = JSON.stringify(dados);
  if (token) opcoes.headers.Authorization = `Bearer ${token}`;

  const resposta = await fetch(BASE + caminho, opcoes);
  const texto = await resposta.text();

  let corpo = null;
  if (texto) {
    try {
      corpo = JSON.parse(texto);
    } catch {
      corpo = texto;
    }
  }

  return { status: resposta.status, corpo };
}

function conferir(descricao, passou, detalhe) {
  if (passou) {
    aprovados++;
    console.log(`✅ ${descricao}`);
  } else {
    reprovados++;
    console.log(`❌ ${descricao}`);
    if (detalhe) console.log('   Detalhe:', detalhe);
  }
}

async function testar(descricao, statusEsperado, metodo, caminho, dados, token) {
  const { status, corpo } = await pedir(metodo, caminho, dados, token);
  conferir(`${descricao} (esperado ${statusEsperado}, veio ${status})`, status === statusEsperado, corpo);
  return corpo;
}

async function main() {
  try {
    const email = `teste${Date.now()}@email.com`;
    const senha = 'senha123';

    console.log('Testando autenticação...\n');
    await testar('Cadastrar usuário', 201, 'POST', '/auth/cadastro', { nome: 'Teste', email, senha });
    await testar('Cadastrar o mesmo e-mail', 409, 'POST', '/auth/cadastro', { nome: 'Teste', email, senha });
    await testar('Cadastrar com senha curta', 400, 'POST', '/auth/cadastro', { nome: 'X', email: 'x@x.com', senha: '123' });
    await testar('Login com senha errada', 401, 'POST', '/auth/login', { email, senha: 'errada' });
    const login = await testar('Login correto', 200, 'POST', '/auth/login', { email, senha });
    const token = login.token;
    conferir('Login devolveu um token', typeof token === 'string', login);

    console.log('\nTestando a proteção das rotas...\n');
    await testar('Listar sem login (pode)', 200, 'GET', '/produtos');
    await testar('Criar sem login (não pode)', 401, 'POST', '/produtos', { nome: 'Boné', preco: 39.9 });
    await testar('Criar com token falso', 401, 'POST', '/produtos', { nome: 'Boné', preco: 39.9 }, 'token-falso');

    console.log('\nTestando os produtos com login...\n');
    const novo = await testar('Criar produto', 201, 'POST', '/produtos', { nome: 'Boné', preco: 39.9 }, token);
    await testar('Atualizar o preço', 200, 'PUT', `/produtos/${novo.id}`, { preco: 59.9 }, token);
    const atualizado = await testar('Buscar após atualizar', 200, 'GET', `/produtos/${novo.id}`);
    conferir('Preço foi salvo como 59.9', atualizado.preco === 59.9, atualizado);
    await testar('Criar sem preço', 400, 'POST', '/produtos', { nome: 'Meia' }, token);
    await testar('Apagar inexistente', 404, 'DELETE', '/produtos/9999', null, token);

    if (LIMPAR_NO_FINAL) {
      console.log('\nLimpando...\n');
      await testar('Apagar o produto criado', 204, 'DELETE', `/produtos/${novo.id}`, null, token);
    }

    console.log(`\nResultado: ${aprovados} aprovado(s), ${reprovados} reprovado(s)`);
  } catch (erro) {
    console.log('Motivo do erro:', erro.cause || erro.message);
  }
}

main();