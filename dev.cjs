// Servidor local para testar sem a Vercel: node dev.cjs (porta 5180, senha do painel "teste").
// Serve os arquivos da pasta e roda api/*.js; os dados ficam em .dados-local.json.
const http = require('http');
const fs = require('fs');
const path = require('path');

process.env.PAINEL_SENHA = process.env.PAINEL_SENHA || 'teste';
delete process.env.BLOB_READ_WRITE_TOKEN;
const ROOT = __dirname;
const PORT = Number(process.env.PORT) || 5180;
// HOST=0.0.0.0 abre para a rede local (celular no mesmo Wi-Fi); o padrão é só este computador
const HOST = process.env.HOST || '127.0.0.1';
const TIPOS = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.css': 'text/css' };

http.createServer((req, res) => {
  const url = new URL(req.url, 'http://x');
  const api = url.pathname.match(/^\/api\/([a-z-]+)$/);
  if (api) {
    let raw = '';
    req.on('data', (c) => (raw += c));
    req.on('end', () => {
      req.rawBody = raw; // o webhook do Stripe confere a assinatura no corpo cru
      try { req.body = raw ? JSON.parse(raw) : {}; } catch (e) { req.body = {}; }
      const file = path.join(ROOT, 'api', api[1] + '.js');
      if (!fs.existsSync(file)) { res.statusCode = 404; return res.end(); }
      delete require.cache[require.resolve(file)];
      Promise.resolve(require(file)(req, res)).catch((e) => { console.error(e); res.statusCode = 500; res.end(); });
    });
    return;
  }
  // mesmas regras do vercel.json: /r/CODIGO e /painel
  let p = url.pathname;
  if (/^\/r\/[^/]+$/.test(p) || p === '/') p = '/index.html';
  else if (p === '/painel') p = '/painel.html';
  else if (p === '/conta') p = '/conta.html';
  // só os arquivos do site (os mesmos que o build.cjs publica); nada de .dados-local.json, api/ ou integracao-sistema/
  const PUBLICOS = ['/index.html', '/painel.html', '/conta.html', '/seed.js', '/og.png'];
  if (!PUBLICOS.includes(p) && !/^\/img\/[\w.\-\/]+$/.test(p)) { res.statusCode = 404; return res.end('404'); }
  const file = path.join(ROOT, path.normalize(p));
  if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.statusCode = 404; return res.end('404'); }
  res.setHeader('content-type', TIPOS[path.extname(file)] || 'application/octet-stream');
  fs.createReadStream(file).pipe(res);
}).listen(PORT, HOST, () => console.log('http://' + (HOST === '0.0.0.0' ? 'localhost' : HOST) + ':' + PORT));
