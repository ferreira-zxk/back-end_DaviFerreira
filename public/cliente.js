'use strict';
const aviso = document.getElementById('aviso');
const formularioCliente = document.getElementById('autenticacao');
async function enviar(acao, dados) {
  const resposta = await fetch('/clientes/' + acao, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Loja-Cliente': '1' }, body: JSON.stringify(dados) });
  const corpo = resposta.status === 204 ? {} : await resposta.json();
  if (!resposta.ok) throw new Error(corpo.erro || 'Não foi possível continuar.');
  return corpo;
}
if (formularioCliente) formularioCliente.addEventListener('submit', async evento => {
  evento.preventDefault();
  aviso.textContent = '';
  const dados = Object.fromEntries(new FormData(formularioCliente));
  const confirmacao = document.getElementById('confirmacao');
  if (confirmacao && confirmacao.value !== dados.senha) { aviso.textContent = 'As senhas não coincidem.'; confirmacao.focus(); return; }
  const botao = formularioCliente.querySelector('button');
  botao.disabled = true;
  try { await enviar(formularioCliente.dataset.acao, dados); location.replace('/conta.html'); }
  catch (erro) { aviso.textContent = erro instanceof TypeError ? 'Falha de conexão. Tente novamente.' : erro.message; }
  finally { botao.disabled = false; }
});
async function carregarConta() {
  try {
    const resposta = await fetch('/clientes/me', { cache: 'no-store' });
    if (resposta.status === 401) { location.replace('/login.html'); return; }
    if (!resposta.ok) throw new Error('Não foi possível carregar sua conta.');
    const { cliente } = await resposta.json();
    document.getElementById('cliente-nome').textContent = cliente.nome;
    document.getElementById('cliente-email').textContent = cliente.email;
    document.getElementById('carregando').hidden = true;
    document.getElementById('conta').hidden = false;
  } catch { aviso.textContent = 'Não foi possível carregar sua conta. Atualize a página.'; }
}
const sair = document.getElementById('sair');
if (sair) {
  window.addEventListener('pageshow', carregarConta);
  sair.addEventListener('click', async () => {
    sair.disabled = true;
    try { await enviar('logout', {}); location.replace('/login.html'); }
    catch { aviso.textContent = 'Não foi possível sair. Tente novamente.'; sair.disabled = false; }
  });
}

// O segredo do link fica no fragmento, não nos logs HTTP nem no Referer.
if(location.hash.startsWith('#redefinir=')) {
 const resetToken=location.hash.slice(11);
 history.replaceState(null,'',location.pathname);
 if(formularioCliente){
  const novo=document.createElement('form');
  const campo=document.createElement('input');campo.type='password';campo.autocomplete='new-password';campo.minLength=8;campo.required=true;campo.placeholder='Nova senha';campo.setAttribute('aria-label','Nova senha');
  const botao=document.createElement('button');botao.textContent='Redefinir senha';
  novo.append(campo,botao);formularioCliente.replaceWith(novo);
  novo.addEventListener('submit',async e=>{e.preventDefault();botao.disabled=true;try{await enviar('redefinir',{token:resetToken,senha:campo.value});location.replace('/login.html');}catch(err){aviso.textContent=err.message;botao.disabled=false;}});
 }
}