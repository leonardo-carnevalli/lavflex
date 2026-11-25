// POST /api/sistema: o programa da loja (sistema Lav-Flex, no PC do balcão) manda a foto do momento
// dos clientes e das ordens. O site só guarda e mostra; quem manda é o programa.
// Chave na variável SISTEMA_CHAVE, enviada no cabeçalho x-lavflex-chave.
const crypto = require('crypto');
const { mutate, clean, num, cents, send, body } = require('./_lib');

function chaveOk(req) {
  const real = process.env.SISTEMA_CHAVE || '';
  if (!real) return false;
  const a = crypto.createHash('sha256').update(String(req.headers['x-lavflex-chave'] || '')).digest();
  const b = crypto.createHash('sha256').update(real).digest();
  return crypto.timingSafeEqual(a, b);
}

const PRODUCAO = ['producao', 'pronto', 'entregue'];
const PAGAMENTO = ['pago', 'parcial', 'pendente'];
const CREDITO = ['entrada', 'uso', 'estorno'];
const inteiro = (v) => Math.round(num(v, 1e9)) || null;

module.exports = async (req, res) => {
  if (req.method !== 'POST') return send(res, 405, { error: 'use POST' });
  if (!chaveOk(req)) return send(res, 401, { error: 'chave inválida' });
  const b = body(req);

  const clientes = {};
  (Array.isArray(b.clientes) ? b.clientes : []).slice(0, 20000).forEach((c) => {
    const id = inteiro(c.id);
    if (!id) return;
    clientes[id] = {
      nome: clean(c.nome, 40),
      tel4: clean(c.tel4, 8).replace(/\D/g, '').slice(-4),
      pedidos: Math.round(num(c.pedidos, 1e6)),
      gasto: cents(num(c.gasto, 1e8)),
      aPagar: cents(num(c.aPagar, 1e8)),
      credito: cents(num(c.credito, 1e7)),
      creditos: (Array.isArray(c.creditos) ? c.creditos : []).slice(0, 10).map((m) => ({
        data: clean(m.data, 25),
        tipo: CREDITO.includes(m.tipo) ? m.tipo : 'entrada',
        valor: cents(num(m.valor, 1e7)),
        saldo: cents(num(m.saldo, 1e7)),
        rol: inteiro(m.rol),
        obs: clean(m.obs, 60)
      }))
    };
  });

  const ordens = [];
  (Array.isArray(b.ordens) ? b.ordens : []).slice(0, 20000).forEach((o) => {
    const rol = inteiro(o.rol);
    if (!rol) return;
    ordens.push({
      rol,
      cliente: inteiro(o.cliente),
      producao: PRODUCAO.includes(o.producao) ? o.producao : 'producao',
      prontoEm: clean(o.prontoEm, 25),
      pagamento: PAGAMENTO.includes(o.pagamento) ? o.pagamento : 'pendente',
      total: cents(num(o.total, 1e6)),
      restante: cents(num(o.restante, 1e6)),
      pago: cents(num(o.pago, 1e6)),
      pecas: Math.round(num(o.pecas, 9999)),
      // uma peça por linha, como o sistema guarda (clean() trocaria a quebra de linha por espaço)
      descricao: String(o.descricao || '').split(/\r?\n/).map((l) => clean(l, 120)).filter(Boolean).join('\n').slice(0, 400),
      entrada: clean(o.entrada, 25),
      previsao: /^\d{4}-\d{2}-\d{2}/.test(String(o.previsao || '')) ? String(o.previsao).slice(0, 10) : '',
      entrega: o.entrega === 'entrega' ? 'entrega' : 'retirada'
    });
  });

  try {
    await mutate((s) => { s.sistema = { clientes, ordens, visto: Date.now() }; });
    send(res, 200, { ok: true, clientes: Object.keys(clientes).length, ordens: ordens.length });
  } catch (e) {
    send(res, 500, { error: 'erro ao gravar, o programa tenta de novo' });
  }
};
