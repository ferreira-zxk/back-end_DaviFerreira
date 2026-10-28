const BASE = 'http://localhost:3000';
const LIMPAR_NO_FINAL = true;
const TIMEOUT_MS = 5000;

let aprovados = 0;
let reprovados = 0;

async function pedir(metodo, caminho, dados) {
  const opcoes = {
    method: metodo,
    headers: { 'Content-Type': 'application/json' },
    signal: AbortSignal.timeout(TIMEOUT_MS),
  };
  if (dados !== undefined) opcoes.body = JSON.stringify(dados);

  const resposta = await fetch(BASE + caminho, opcoes);
  if (resposta.status === 204) return { status: 204, corpo: null };

  const texto = await resposta.text();
  let corpo = null;
  if (texto) {
    try { corpo = JSON.parse(texto); }
    catch { corpo = texto; }
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
    if (detalhe !== undefined) console.log('   Detalhe:', detalhe);
  }
}

async function testar(descricao, statusEsperado, metodo, caminho, dados) {
  try {
    const { status, corpo } = await pedir(metodo, caminho, dados);
    conferir(
      `${descricao} (esperado ${statusEsperado}, veio ${status})`,
      status === statusEsperado,
      corpo
    );
    return corpo;
  } catch (erro) {
    conferir(
      `${descricao} (esperado ${statusEsperado}, falhou na requisição)`,
      false,
      erro.cause?.code || erro.cause?.message || erro.message
    );
    return null;
  }
}

async function main() {
  console.log('Testando a API de produtos...\n');

  const lista = await testar('Listar produtos', 200, 'GET', '/produtos');
  if (Array.isArray(lista)) console.log(`   O banco tem ${lista.length} produto(s)\n`);
  else console.log('   ⚠️  Resposta não é array.\n');

  const novo = await testar('Criar produto', 201, 'POST', '/produtos', {
    nome: 'Boné', preco: 39.9,
  });
  conferir('Produto criado tem id', novo && novo.id !== undefined, novo);

  if (!novo || novo.id === undefined) {
    console.log('\n❌ Abortando: produto não foi criado corretamente.');
    return finalizar();
  }

  await testar('Buscar o produto criado', 200, 'GET', `/produtos/${novo.id}`);

  await testar('Atualizar o preço', 200, 'PUT', `/produtos/${novo.id}`, { preco: 59.9 });
  const atualizado = await testar('Buscar após atualizar', 200, 'GET', `/produtos/${novo.id}`);
  if (atualizado) {
    conferir('Preço foi salvo como 59.9', atualizado.preco === 59.9, atualizado);
    conferir('Nome continuou o mesmo', atualizado.nome === 'Boné', atualizado);
  }

  console.log('\nTestando os erros...\n');
  await testar('Criar sem preço', 400, 'POST', '/produtos', { nome: 'Meia' });
  await testar('Criar sem nome',  400, 'POST', '/produtos', { preco: 10 });
  await testar('Buscar inexistente',    404, 'GET',    '/produtos/9999');
  await testar('Atualizar inexistente', 404, 'PUT',    '/produtos/9999', { preco: 1 });
  await testar('Apagar inexistente',    404, 'DELETE', '/produtos/9999');

  if (LIMPAR_NO_FINAL) {
    console.log('\nLimpando...\n');
    await testar('Apagar o produto criado',  204, 'DELETE', `/produtos/${novo.id}`);
    await testar('Buscar o produto apagado', 404, 'GET',    `/produtos/${novo.id}`);
  } else {
    console.log(`\nO produto ${novo.id} foi mantido no banco.`);
  }

  finalizar();
}

function finalizar() {
  console.log(`\nResultado: ${aprovados} aprovado(s), ${reprovados} reprovado(s)`);
  process.exitCode = reprovados === 0 ? 0 : 1;
}

main();