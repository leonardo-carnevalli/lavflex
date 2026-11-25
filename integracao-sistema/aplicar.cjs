// Aplica a integração com o site numa pasta extraída do app.asar do sistema Lav-Flex.
// Uso: node aplicar.cjs <pasta-do-app-extraido>
// Faz 4 coisas, e só se ainda não foram feitas:
//   1. copia vetor-sync.js e vetor-sync-ui.js para a pasta;
//   2. server.js: uma linha depois de "global.db = db;";
//   3. index.html: o script do botão "Pronto" antes do </body>;
//   4. index.html: número do cliente + endereço do site na nota (emitirReciboOS, abaixo de "ROL No").
const fs = require('fs');
const path = require('path');

const pasta = process.argv[2];
if (!pasta || !fs.existsSync(path.join(pasta, 'server.js'))) {
  console.error('Uso: node aplicar.cjs <pasta com server.js e index.html>');
  process.exit(1);
}
const unico = (txt, ancora, nome) => {
  const i = txt.indexOf(ancora);
  if (i < 0 || txt.indexOf(ancora, i + 1) >= 0) throw new Error('não achei um ponto único para: ' + nome);
  return i + ancora.length;
};

for (const f of ['vetor-sync.js', 'vetor-sync-ui.js']) fs.copyFileSync(path.join(__dirname, f), path.join(pasta, f));

const arqServer = path.join(pasta, 'server.js');
let s = fs.readFileSync(arqServer, 'utf8');
if (!s.includes("require('./vetor-sync.js')")) {
  const i = unico(s, 'global.db = db;\n', 'server.js global.db');
  s = s.slice(0, i) + "require('./vetor-sync.js')(app, db); // integração com o site (Vetor Agência)\n" + s.slice(i);
  fs.writeFileSync(arqServer, s);
}

const arqIndex = path.join(pasta, 'index.html');
let h = fs.readFileSync(arqIndex, 'utf8');
if (!h.includes('vetor-sync-ui.js')) {
  const i = h.lastIndexOf('</body>');
  if (i < 0) throw new Error('index.html sem </body>');
  h = h.slice(0, i) + '<script src="/vetor-sync-ui.js"></script>\n' + h.slice(i);
}
if (!h.includes('vetorLogin')) {
  const a1 = "      if (numeroNota === '------' && os.id) {\n        numeroNota = String(os.id).padStart(6, '0');\n      }\n";
  let i = unico(h, a1, 'nota: número da nota');
  h = h.slice(0, i) +
    '      // Vetor Agência: número do cliente para entrar no site (sai na nota)\n' +
    '      let vetorLogin = null;\n' +
    "      try { vetorLogin = await (await fetch(`${API_BASE}/vetor/login?nome=${encodeURIComponent(os.cliente_nome || '')}`)).json(); } catch (e) {}\n" +
    h.slice(i);
  const a2 = '            <div class="centro grande negrito" style="font-size: 15px; margin: 3px 0;">ROL No ${os.id}</div>\n';
  i = unico(h, a2, 'nota: ROL No');
  h = h.slice(0, i) +
    '            ${vetorLogin && vetorLogin.cliente && vetorLogin.site ? `<div class="centro" style="font-size: 11px; margin: 3px 0 5px; line-height: 1.35;">ACOMPANHE NO SITE<br>${escapeHtml(vetorLogin.site)}<br>Nº do cliente: <b style="font-size: 14px;">${vetorLogin.cliente}</b><br>Senha: 4 últimos números do seu telefone</div>` : \'\'}\n' +
    h.slice(i);
}
fs.writeFileSync(arqIndex, h);
console.log('Integração aplicada em ' + pasta);
