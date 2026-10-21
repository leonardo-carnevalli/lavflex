// POST /api/stripe-webhook: o Stripe avisa quando a assinatura é paga, muda ou é cancelada.
// A conta Stripe é a da MedVetor, então só eventos com metadata.app = 'lavflex' mexem aqui.
// Precisa de STRIPE_WEBHOOK_SECRET (whsec_...) na Vercel; o endpoint é cadastrado no painel do Stripe.
const crypto = require('crypto');
const { mutate, send } = require('./_lib');

// corpo cru: a assinatura do Stripe é calculada sobre o texto exato que chegou
function corpoCru(req) {
  if (typeof req.rawBody === 'string') return Promise.resolve(req.rawBody);
  return new Promise((ok, erro) => {
    let s = '';
    req.setEncoding('utf8');
    req.on('data', (c) => (s += c));
    req.on('end', () => ok(s));
    req.on('error', erro);
  });
}

function assinaturaOk(cru, cabecalho, segredo) {
  const partes = String(cabecalho || '').split(',').map((p) => p.split('='));
  const t = (partes.find((p) => p[0] === 't') || [])[1];
  const v1 = partes.filter((p) => p[0] === 'v1').map((p) => p[1]);
  if (!t || !v1.length || Math.abs(Date.now() / 1000 - Number(t)) > 300) return false;
  const esperado = Buffer.from(crypto.createHmac('sha256', segredo).update(t + '.' + cru).digest('hex'));
  return v1.some((v) => { const a = Buffer.from(v); return a.length === esperado.length && crypto.timingSafeEqual(a, esperado); });
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') return send(res, 405, { error: 'use POST' });
  const segredo = process.env.STRIPE_WEBHOOK_SECRET;
  if (!segredo) return send(res, 503, { error: 'webhook não configurado' });
  const cru = await corpoCru(req);
  if (!assinaturaOk(cru, req.headers['stripe-signature'], segredo)) return send(res, 400, { error: 'assinatura inválida' });

  const ev = JSON.parse(cru), o = (ev.data && ev.data.object) || {};
  const meta = o.metadata || {};
  if (meta.app !== 'lavflex') return send(res, 200, { ok: true, ignorado: true }); // evento da MedVetor

  try {
    await mutate((s) => {
      const c = (s.contas || []).find((x) => x.id === meta.conta);
      if (!c) return;
      if (ev.type === 'checkout.session.completed') {
        c.assinatura = { plano: meta.plano, status: 'active', cliente: o.customer, id: o.subscription, desde: Date.now() };
      } else if (/^customer\.subscription\.(created|updated|deleted)$/.test(ev.type)) {
        const fim = (o.items && o.items.data && o.items.data[0] && o.items.data[0].current_period_end) || o.current_period_end;
        c.assinatura = Object.assign(c.assinatura || {}, {
          plano: meta.plano, cliente: o.customer, id: o.id,
          status: ev.type.endsWith('deleted') ? 'canceled' : o.status,
          fim: fim ? fim * 1000 : null, cancelando: !!o.cancel_at_period_end
        });
      }
    });
    send(res, 200, { ok: true });
  } catch (e) {
    send(res, 500, { error: 'erro ao salvar' }); // o Stripe tenta de novo sozinho
  }
};
