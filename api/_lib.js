// Banco do site: um arquivo JSON privado no Vercel Blob.
// Toda escrita usa a ETag (ifMatch) para não perder dados quando duas pessoas salvam juntas.
// Sem BLOB_READ_WRITE_TOKEN (rodando local com dev.cjs) usa o arquivo .dados-local.json.
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { makeDefaults, ETAPAS } = require('../seed.js');

const PATH = 'dados/estado.json';
const LOCAL = path.join(__dirname, '..', '.dados-local.json');
const local = () => !process.env.BLOB_READ_WRITE_TOKEN && process.env.ARMAZEM !== 'disco'; // na VPS o armazém é o disco (vetor-funcs)

async function read() {
  const { state, etag } = await lerArquivo();
  // dados salvos antes dos planos não têm essas chaves
  if (!state.planos) state.planos = makeDefaults().planos;
  if (!state.contas) state.contas = [];
  return { state, etag };
}
async function lerArquivo() {
  if (local()) {
    if (!fs.existsSync(LOCAL)) return { state: makeDefaults(), etag: null };
    return { state: JSON.parse(fs.readFileSync(LOCAL, 'utf8')), etag: null };
  }
  const { get } = require('@vercel/blob');
  const r = await get(PATH, { access: 'private', useCache: false });
  if (!r || r.statusCode !== 200) return { state: makeDefaults(), etag: null };
  const text = await new Response(r.stream).text();
  const etag = r.blob && r.blob.etag ? String(r.blob.etag).replace(/^W\//, '') : null; // a leitura devolve ETag fraca (W/)
  return { state: JSON.parse(text), etag };
}

async function write(state, etag) {
  if (local()) return fs.writeFileSync(LOCAL, JSON.stringify(state, null, 1));
  const { put } = require('@vercel/blob');
  const opts = { access: 'private', contentType: 'application/json', addRandomSuffix: false };
  if (etag) opts.ifMatch = etag; else opts.allowOverwrite = true;
  await put(PATH, JSON.stringify(state), opts);
}

// lê, altera e grava; se outra pessoa gravou no meio, tenta de novo
async function mutate(fn) {
  for (let i = 0; i < 5; i++) {
    const { state, etag } = await read();
    const out = await fn(state);
    try { await write(state, etag); return out; } catch (e) {
      if (!/precondition/i.test(String(e && (e.name + e.message)))) throw e;
      await new Promise((r) => setTimeout(r, 80 + Math.random() * 200));
    }
  }
  throw new Error('banco ocupado, tente de novo');
}

// o que o site público pode ver: nada de pedidos nem contas
function publicView(s) {
  return { loja: s.loja, categorias: s.categorias, precos: s.precos, combos: s.combos, depoimentos: s.depoimentos, planos: (s.planos || []).map(planoView) };
}

// plano só vira pagamento de verdade com valor, preço criado no Stripe e a chave na Vercel
const stripeLigado = () => !!process.env.STRIPE_SECRET_KEY;
const pagavel = (pl) => !!(pl && pl.preco > 0 && /^price_/.test(pl.stripePrice || '') && stripeLigado());
function planoView(pl) {
  return { id: pl.id, nome: pl.nome, resumo: pl.resumo, preco: pl.preco > 0 ? pl.preco : null, itens: pl.itens || [], destaque: !!pl.destaque, pagavel: pagavel(pl) };
}

// o que a pessoa vê ao rastrear: só o primeiro nome, sem telefone nem observação interna
function trackView(p) {
  return {
    codigo: p.codigo, nome: String(p.nome || '').split(' ')[0], itens: p.itens, desconto: p.desconto || 0, total: p.total,
    pago: !!p.pago, status: p.status, hist: p.hist, previsao: p.previsao, entrega: p.entrega, criado: p.criado,
    rapido: !!p.rapido
  };
}

// código do pedido: 6 letras/números sem os que confundem (0/O, 1/I/L)
const ALFA = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';
function novoCodigo(existentes) {
  for (;;) {
    let c = '';
    const b = crypto.randomBytes(6);
    for (let i = 0; i < 6; i++) c += ALFA[b[i] % ALFA.length];
    if (!existentes.has(c)) return c;
  }
}
// aceita "lf-7k3m9p", "LF 7K3M9P" ou "7k3m9p" e devolve "7K3M9P"
const normCodigo = (v) => String(v || '').toUpperCase().replace(/[^A-Z0-9]/g, '').replace(/^LF(?=[A-Z0-9]{6}$)/, '').slice(0, 6);

// --- login do painel: senha na variável PAINEL_SENHA, sessão assinada por 7 dias (uso no balcão) ---
const secret = () => process.env.PAINEL_SEGREDO || process.env.PAINEL_SENHA || '';
function sign(exp) { return crypto.createHmac('sha256', secret()).update(String(exp)).digest('base64url'); }
function makeToken() { const exp = Date.now() + 7 * 24 * 36e5; return exp + '.' + sign(exp); }
function checkToken(req) {
  const t = (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  const [exp, sig, resto] = t.split('.');
  if (resto !== undefined || !/^\d+$/.test(exp || '') || !sig || Number(exp) < Date.now() || !secret()) return false; // sessão de cliente não abre o painel
  const a = Buffer.from(sig), b = Buffer.from(sign(exp));
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}
function samePassword(given) {
  const real = process.env.PAINEL_SENHA || '';
  if (!real) return false;
  const a = crypto.createHash('sha256').update(String(given || '')).digest();
  const b = crypto.createHash('sha256').update(real).digest();
  return crypto.timingSafeEqual(a, b);
}

// --- conta do cliente (planos): sessão de 30 dias, assinada de um jeito diferente da do painel ---
function makeContaToken(id) { const exp = Date.now() + 30 * 24 * 36e5; return 'c.' + id + '.' + exp + '.' + sign('conta.' + id + '.' + exp); }
function checkContaToken(req) {
  const t = (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  const [c, id, exp, sig] = t.split('.');
  if (c !== 'c' || !id || !/^\d+$/.test(exp || '') || !sig || Number(exp) < Date.now() || !secret()) return null;
  const a = Buffer.from(sig), b = Buffer.from(sign('conta.' + id + '.' + exp));
  return a.length === b.length && crypto.timingSafeEqual(a, b) ? id : null;
}
function hashSenha(senha) {
  const sal = crypto.randomBytes(16).toString('base64url');
  return sal + ':' + crypto.scryptSync(String(senha), sal, 32).toString('base64url');
}
function confereSenha(senha, guardado) {
  const [sal, h] = String(guardado || '').split(':');
  if (!sal || !h) return false;
  const a = Buffer.from(h), b = Buffer.from(crypto.scryptSync(String(senha || ''), sal, 32).toString('base64url'));
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

// chamada direta à API do Stripe, sem SDK (parâmetros no formato a[b][0]=c)
async function stripe(rota, params) {
  const form = new URLSearchParams();
  const achata = (v, k) => {
    if (v == null) return;
    if (typeof v === 'object') Object.keys(v).forEach((c) => achata(v[c], k ? k + '[' + c + ']' : c));
    else form.append(k, String(v));
  };
  achata(params, '');
  const r = await fetch('https://api.stripe.com/v1/' + rota, {
    method: 'POST', body: form,
    headers: { authorization: 'Bearer ' + process.env.STRIPE_SECRET_KEY, 'content-type': 'application/x-www-form-urlencoded' }
  });
  const j = await r.json();
  if (!r.ok) throw new Error((j.error && j.error.message) || 'stripe ' + r.status);
  return j;
}

const clean = (v, max) => String(v == null ? '' : v).replace(/[\u0000-\u001f]/g, ' ').trim().slice(0, max || 300);
const num = (v, max) => { const n = Number(v); return Number.isFinite(n) ? Math.min(Math.max(n, 0), max || 1e6) : 0; };
const uid = (p) => p + crypto.randomBytes(6).toString('base64url');
const cents = (n) => Math.round(n * 100) / 100;

function send(res, code, obj) {
  res.statusCode = code;
  res.setHeader('content-type', 'application/json; charset=utf-8');
  res.setHeader('cache-control', 'no-store');
  res.end(JSON.stringify(obj));
}
function body(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  try { return JSON.parse(req.body || '{}'); } catch (e) { return {}; }
}

module.exports = {
  read, mutate, publicView, trackView, novoCodigo, normCodigo, ETAPAS,
  makeToken, checkToken, samePassword, clean, num, uid, cents, send, body,
  planoView, pagavel, stripeLigado, makeContaToken, checkContaToken, hashSenha, confereSenha, stripe
};
