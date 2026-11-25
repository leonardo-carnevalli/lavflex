// Teste ponta a ponta da integração Lav-Flex: site local + cópia de teste do sistema, só com banco FALSO.
// Uso: node teste-ponta-a-ponta.cjs <pasta-dos-prints> <casos.json gerado por gerar-banco-teste.py>
// Precisa: site em http://localhost:5180 (node dev.cjs com SISTEMA_CHAVE) e sistema de teste em 127.0.0.1:3000.
const { chromium } = require('C:/Users/Leonardo/node_modules/playwright');
const fs = require('fs');
const path = require('path');

const SITE = 'http://localhost:5180', SYS = 'http://127.0.0.1:3000';
const OUT = process.argv[2];
const CASOS = JSON.parse(fs.readFileSync(process.argv[3], 'utf8'));
fs.mkdirSync(OUT, { recursive: true });
const resultados = [];
const ok = (passo, cond, det = '') => { resultados.push({ passo, ok: !!cond, det }); console.log((cond ? 'PASS  ' : 'FALHA ') + passo + (det ? ' | ' + det : '')); };
const espera = (ms) => new Promise((r) => setTimeout(r, ms));
const png = (nome) => path.join(OUT, nome);
const plano = (t) => String(t || '').replace(/[\s\u00a0]+/g, ' ');

async function cliente(n, s) {
  const r = await fetch(SITE + '/api/cliente', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ cliente: n, senha: s }) });
  return r.json();
}
async function ateQue(n, s, cond, ms = 80000) {
  const fim = Date.now() + ms;
  while (Date.now() < fim) { const j = await cliente(n, s).catch(() => ({})); if (j.ok && cond(j)) return j; await espera(2000); }
  return null;
}
const sys = (metodo, p, corpo) => fetch(SYS + p, { method: metodo, headers: { 'content-type': 'application/json' }, body: corpo ? JSON.stringify(corpo) : undefined }).then((r) => r.json());
const ordem = (j, rol) => (j.ordens || []).find((o) => o.rol === rol);
const semRolagem = (page) => page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth);
// cabeçalho e botão flutuante fixos aparecem no meio de print comprido; só para o print, some com eles
const soltarFixos = (page) => page.evaluate(() => document.querySelectorAll('body *').forEach((el) => {
  const pos = getComputedStyle(el).position;
  if (pos === 'fixed' || pos === 'sticky') el.style.setProperty('display', 'none', 'important');
}));

async function entrarCliente(page, n, s) {
  await page.goto(SITE + '/?t=' + Date.now() + '#rastrear');
  await page.waitForTimeout(700);
  if (await page.locator('#form-cliente').isHidden()) await page.click('[data-trocar="cliente"]');
  await page.fill('#cli-numero', String(n));
  await page.fill('#cli-senha', s);
  await page.click('#btn-cliente');
}
async function printCliente(page, n, s, nome) {
  await entrarCliente(page, n, s);
  await page.waitForSelector('#resultado:not([hidden])', { timeout: 8000 });
  await page.waitForTimeout(700);
  await soltarFixos(page);
  await page.locator('#resultado').screenshot({ path: png(nome) });
  return plano(await page.textContent('#resultado'));
}
// pega o que o sistema mandou imprimir. Ele abre uma janela com o documento (no Electron, o main.js
// manda essa janela direto para a impressora); aqui o teste lê a janela e fecha.
async function capturarImpressao(s, osId, rotulo) {
  const janela = s.context().waitForEvent('page', { timeout: 15000 }).catch(() => null);
  await s.evaluate(async ({ osId, rotulo }) => {
    const linha = document.querySelector('#tabelaOS button[data-vetor-pronto="' + osId + '"]').closest('tr');
    [...linha.querySelectorAll('button')].find((b) => b.textContent.includes(rotulo)).click();
    await new Promise((r) => setTimeout(r, 1500));
    // se o sistema abrir a escolha de peças das etiquetas, confirma com todas marcadas
    const imp = [...document.querySelectorAll('button')].find((b) => (b.getAttribute('onclick') || '').includes('confirmarImpressaoEtiquetasSelecionadas') && b.offsetParent !== null);
    if (imp) imp.click();
  }, { osId, rotulo });
  const j = await janela;
  if (!j) return '';
  let html = '';
  for (let i = 0; i < 30; i++) {
    html = await j.content().catch(() => '');
    if (/<body[^>]*>[\s\S]{50,}/.test(html)) break;
    await espera(250);
  }
  await j.close().catch(() => {});
  return html;
}

(async () => {
  const G = CASOS.grande, F = CASOS.fluxo, P = CASOS.parcial, V = CASOS.sem_pedido;
  const sincronizou = await ateQue(G.cliente, G.senha, (j) => j.ordens.length > 5, 90000);
  ok('Sistema enviou o banco amplo para o site', !!sincronizou, sincronizou ? sincronizou.ordens.length + ' pedidos do cliente ' + G.cliente : 'não chegou');

  const browser = await chromium.launch({ channel: 'chrome' });
  const cel = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, reducedMotion: 'reduce' });
  const p = await cel.newPage();
  const errosSite = [];
  p.on('pageerror', (e) => errosSite.push(e.message));

  // site: início e rastreio por código (o que já existia)
  await p.goto(SITE + '/');
  await p.waitForTimeout(1500);
  await p.screenshot({ path: png('01-inicio.png') });
  ok('Site abre no celular sem rolagem para o lado', await semRolagem(p));
  await p.goto(SITE + '/r/7K3M9P');
  await p.waitForSelector('#resultado:not([hidden])', { timeout: 8000 });
  ok('Rastreio por código LF-7K3M9P continua funcionando', (await p.textContent('#resultado')).includes('7K3M9P'));

  // área do cliente: login, senha errada
  await p.goto(SITE + '/?t=1#rastrear');
  await p.waitForTimeout(700);
  await p.click('[data-trocar="cliente"]');
  await p.waitForTimeout(300);
  await p.locator('#form-cliente').screenshot({ path: png('02-entrar-cliente.png') });
  await p.fill('#cli-numero', String(G.cliente));
  await p.fill('#cli-senha', '0001');
  await p.click('#btn-cliente');
  await p.waitForFunction(() => document.querySelector('#cli-erro').textContent.length > 0, null, { timeout: 8000 });
  ok('Senha errada é recusada', (await p.textContent('#cli-erro')).includes('não conferem'));

  // cliente com muitos pedidos e crédito de cabides
  const txtG = await printCliente(p, G.cliente, G.senha, '03-cliente-com-muitos-pedidos.png');
  const faltamG = ['Crédito na loja', 'Pedidos feitos', 'Total em pedidos', 'Na loja agora', 'Histórico', 'Movimento do crédito', 'cabides']
    .filter((t) => !txtG.includes(t));
  ok('Cliente grande vê resumo, histórico e crédito de cabides', !faltamG.length, faltamG.length ? 'faltou: ' + faltamG.join(', ') : G.pedidos + ' pedidos no banco');
  ok('Resumo diz se está tudo pago ou quanto falta', /Falta pagar\s*R\$|Tudo pago/.test(txtG), (txtG.match(/Falta pagar\s*R\$\s*[\d.,]+|Tudo pago/) || [''])[0]);
  ok('Área do cliente sem rolagem para o lado', await semRolagem(p));

  // pagamento parcial
  if (P) {
    const txtP = await printCliente(p, P.cliente, P.senha, '04-cliente-pagou-parte.png');
    ok('Pagamento parcial aparece como "Pago em parte · falta R$"', txtP.includes('Pago em parte') && txtP.includes('Falta pagar'));
  }
  // cliente sem nenhum pedido
  if (V) {
    const txtV = await printCliente(p, V.cliente, V.senha, '05-cliente-sem-pedido.png');
    ok('Cliente sem pedido vê tela vazia sem erro', txtV.includes('Nenhuma roupa na loja agora') && txtV.includes('Tudo pago'));
  }
  await p.click('[data-sair]');
  await p.waitForTimeout(400);
  ok('Botão Sair esconde os dados do cliente', await p.locator('#resultado').isHidden());

  // sistema da loja
  const pc = await browser.newContext({ viewport: { width: 1366, height: 768 } });
  const s = await pc.newPage();
  const errosSis = [];
  s.on('pageerror', (e) => errosSis.push(e.message));
  s.on('dialog', (d) => d.accept());
  await s.goto(SYS + '/');
  await s.getByPlaceholder('Ex: admin').fill('admin');
  await s.locator('#login_senha').fill('senha-de-teste');
  await s.locator('#login_senha').press('Enter');
  await s.waitForSelector('button[data-vetor-pronto="' + F.os + '"]', { timeout: 15000 });
  await s.waitForTimeout(800);
  await s.screenshot({ path: png('06-sistema-lista-com-botao-pronto.png') });
  ok('Sistema mostra "Marcar pronto" nas ordens da loja', (await s.locator('button[data-vetor-pronto]').count()) >= 20, (await s.locator('button[data-vetor-pronto]').count()) + ' botões');

  // fluxo: pronto -> pago -> entregue
  const btn = s.locator('button[data-vetor-pronto="' + F.os + '"]').first();
  ok('Rol ' + F.os + ' começa "Em produção"', !!(await ateQue(F.cliente, F.senha, (j) => ordem(j, F.os) && ordem(j, F.os).producao === 'producao', 30000)));
  await btn.click();
  await s.waitForFunction((id) => document.querySelector('button[data-vetor-pronto="' + id + '"]').textContent.includes('✓'), F.os, { timeout: 8000 });
  await s.locator('tr', { has: s.locator('button[data-vetor-pronto="' + F.os + '"]') }).first().screenshot({ path: png('07-sistema-ordem-marcada-pronta.png') });
  let t0 = Date.now();
  ok('Marcou pronto no sistema e o site mostrou "Pronto"', !!(await ateQue(F.cliente, F.senha, (j) => ordem(j, F.os).producao === 'pronto')), Math.round((Date.now() - t0) / 1000) + ' s');
  await printCliente(p, F.cliente, F.senha, '08-site-roupa-pronta.png');
  await sys('PUT', '/api/os/' + F.os + '/pagamento', { status_pagamento: 'Pago/Produção' });
  t0 = Date.now();
  ok('Pagou no sistema e o site mostrou "Pago"', !!(await ateQue(F.cliente, F.senha, (j) => ordem(j, F.os).pagamento === 'pago')), Math.round((Date.now() - t0) / 1000) + ' s');
  await printCliente(p, F.cliente, F.senha, '09-site-pago.png');
  await s.reload();
  await s.waitForSelector('button[data-vetor-pronto="' + F.os + '"]', { timeout: 15000 });
  await s.locator('tr', { has: s.locator('button[data-vetor-pronto="' + F.os + '"]') }).first().locator('button[title="Marcar OS como Entregue"]').click();
  await s.waitForTimeout(800);
  await s.locator('button', { hasText: /^Confirmar$/ }).last().click().catch(() => {});
  t0 = Date.now();
  ok('Entregou pelo botão do sistema e foi para o histórico do site', !!(await ateQue(F.cliente, F.senha, (j) => ordem(j, F.os).producao === 'entregue')), Math.round((Date.now() - t0) / 1000) + ' s');
  await printCliente(p, F.cliente, F.senha, '10-site-entregue-vai-pro-historico.png');
  await sys('PUT', '/api/os/' + F.os + '/pagamento', { status_pagamento: 'Pendente' });
  await sys('POST', '/api/vetor/pronto/' + F.os, { pronto: false });
  ok('Rol ' + F.os + ' voltou ao estado inicial', !!(await ateQue(F.cliente, F.senha, (j) => ordem(j, F.os).producao === 'producao' && ordem(j, F.os).pagamento === 'pendente')));

  // nota e etiquetas da ordem do cliente grande
  await s.reload();
  await s.waitForSelector('button[data-vetor-pronto="' + G.os_ativa + '"]', { timeout: 15000 });
  const nota = await capturarImpressao(s, G.os_ativa, 'Recibo');
  ok('Nota sai com "ACOMPANHE NO SITE", domínio e nº do cliente', !!nota && nota.includes('ACOMPANHE NO SITE') && nota.includes('lavflexmarilia.com.br') && nota.includes('>' + G.cliente + '<'));
  await s.reload();
  await s.waitForSelector('button[data-vetor-pronto="' + G.os_ativa + '"]', { timeout: 15000 });
  const etq = await capturarImpressao(s, G.os_ativa, 'Etiquetas');
  const pecas = (etq.match(/class="nome-peca"/g) || []).length;
  ok('Etiquetas: uma por peça + 1 etiqueta de acesso ao site', etq.includes('data-vetor-acesso') && etq.includes('Nº DO CLIENTE'), pecas + ' etiquetas de peça + acesso');

  const folha = await cel.newPage();
  // nota "saindo da impressora"
  await folha.setViewportSize({ width: 520, height: 900 });
  await folha.setContent(`<!doctype html><html><body style="margin:0;background:radial-gradient(circle at 50% 0,#f4f7fb,#cdd7e3);font-family:Arial">
    <div id="cena" style="width:520px;padding:36px 0 50px;display:flex;flex-direction:column;align-items:center">
      <div style="position:relative;z-index:2;width:400px;height:110px;border-radius:22px 22px 14px 14px;background:linear-gradient(#3a3f47,#1f2329);box-shadow:0 18px 30px -12px #0008,inset 0 1px 0 #ffffff22">
        <div style="position:absolute;left:24px;top:22px;width:10px;height:10px;border-radius:50%;background:#3ddc84;box-shadow:0 0 8px #3ddc84"></div>
        <div style="position:absolute;left:44px;top:19px;color:#aab3bf;font-size:12px;letter-spacing:.12em">LAV-FLEX · BALCÃO</div>
        <div style="position:absolute;left:40px;right:40px;bottom:16px;height:8px;border-radius:4px;background:#0b0d10;box-shadow:inset 0 2px 3px #000"></div>
      </div>
      <div style="position:relative;z-index:1;margin-top:-22px;padding-top:18px;width:302px;background:#fff;box-shadow:0 14px 24px -8px #0005;clip-path:polygon(0 0,100% 0,100% calc(100% - 8px),95% 100%,90% calc(100% - 8px),85% 100%,80% calc(100% - 8px),75% 100%,70% calc(100% - 8px),65% 100%,60% calc(100% - 8px),55% 100%,50% calc(100% - 8px),45% 100%,40% calc(100% - 8px),35% 100%,30% calc(100% - 8px),25% 100%,20% calc(100% - 8px),15% 100%,10% calc(100% - 8px),5% 100%,0 calc(100% - 8px))">
        <iframe id="nota" style="width:302px;height:700px;border:0;display:block"></iframe>
      </div>
    </div></body></html>`);
  await folha.evaluate((h) => { const f = document.getElementById('nota'); f.srcdoc = h; }, nota || '<p>sem nota</p>');
  await folha.waitForTimeout(800);
  await folha.evaluate(() => { const f = document.getElementById('nota'); f.style.height = (f.contentDocument.documentElement.scrollHeight + 10) + 'px'; });
  await folha.waitForTimeout(300);
  await folha.locator('#cena').screenshot({ path: png('11-nota-saindo-da-impressora.png') });
  // etiquetas como saem no rolo (40 mm de largura), cada uma com borda tracejada
  fs.writeFileSync(png('nota.html'), nota || '');
  fs.writeFileSync(png('etiquetas.html'), etq || '');
  await folha.setViewportSize({ width: 190, height: 900 });
  await folha.setContent(etq || '<p>sem etiqueta</p>');
  await folha.addStyleTag({ content: 'html body{background:#d9dee5 !important;padding:14px 12px !important;margin:0 !important;height:auto !important;width:auto !important;max-width:none !important}' +
    'html body .bloco-etiqueta{background:#fff !important;outline:1px dashed #8a96a3 !important;margin:0 0 12px !important;padding:4px !important;box-shadow:0 2px 6px #0003 !important}' +
    'html body .bloco-etiqueta[data-vetor-acesso]{outline:2px solid #e0782f !important}' });
  await folha.waitForTimeout(400);
  const caixa = await folha.evaluate(() => {
    const r = [...document.querySelectorAll('.bloco-etiqueta')].map((e) => e.getBoundingClientRect());
    const x = Math.max(0, Math.min(...r.map((a) => a.left)) - 12), y = Math.max(0, Math.min(...r.map((a) => a.top)) - 12);
    return { x, y, width: Math.max(...r.map((a) => a.right)) - x + 12, height: Math.max(...r.map((a) => a.bottom)) - y + 12 };
  });
  await folha.screenshot({ path: png('12-etiquetas-com-acesso-no-fim.png'), clip: caixa, fullPage: true });

  // segurança mínima e erros
  const r401 = await fetch(SITE + '/api/sistema', { method: 'POST', headers: { 'content-type': 'application/json', 'x-lavflex-chave': 'errada' }, body: '{}' });
  ok('Site recusa envio com chave errada', r401.status === 401, 'HTTP ' + r401.status);
  const st = await sys('GET', '/api/vetor/status');
  ok('Sistema sem erro de envio', st.configurado && !st.ultimoErro, st.ultimoErro || 'último envio ' + new Date(st.ultimoEnvio).toLocaleTimeString('pt-BR'));
  ok('Sem erro de JavaScript no site', !errosSite.length, errosSite.join(' / '));
  ok('Sem erro de JavaScript no sistema', !errosSis.length, errosSis.join(' / '));

  await browser.close();
  fs.writeFileSync(png('resultado.json'), JSON.stringify(resultados, null, 2));
  const falhas = resultados.filter((r) => !r.ok).length;
  console.log('\n' + (resultados.length - falhas) + ' de ' + resultados.length + ' passaram');
  process.exit(falhas ? 1 : 0);
})().catch((e) => { console.error('ERRO', e.message); process.exit(2); });
