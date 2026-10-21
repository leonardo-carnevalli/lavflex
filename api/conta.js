// /api/conta: conta simples do cliente para os planos (nome, e-mail, WhatsApp e senha).
// GET (com a sessão do cliente) devolve a conta. POST {acao}: criar, entrar, assinar, gerenciar.
// Sem valor ou sem Stripe ligado, "assinar" só guarda o plano escolhido para a loja chamar o cliente.
const { read, mutate, checkContaToken, makeContaToken, hashSenha, confereSenha, pagavel, stripe, clean, uid, send, body } = require('./_lib');

const MAX_CONTAS = 5000;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

// o que o próprio cliente vê da conta dele
function contaView(c, s) {
  const nomePlano = (id) => ((s.planos || []).find((p) => p.id === id) || {}).nome || '';
  const a = c.assinatura;
  return {
    nome: c.nome, email: c.email, tel: c.tel, criado: c.criado,
    plano: c.plano ? { id: c.plano.id, nome: nomePlano(c.plano.id), desde: c.plano.desde } : null,
    assinatura: a ? { plano: a.plano, nome: nomePlano(a.plano), status: a.status, fim: a.fim || null, cancelando: !!a.cancelando } : null
  };
}
const origem = (req) => (req.headers['x-forwarded-proto'] || (/^localhost|^127\./.test(req.headers.host || '') ? 'http' : 'https')) + '://' + (req.headers['x-forwarded-host'] || req.headers.host);

module.exports = async (req, res) => {
  try {
    if (req.method === 'GET') {
      const id = checkContaToken(req);
      if (!id) return send(res, 401, { error: 'entre de novo' });
      const { state } = await read();
      const c = state.contas.find((x) => x.id === id);
      if (!c) return send(res, 401, { error: 'conta não encontrada' });
      return send(res, 200, { ok: true, conta: contaView(c, state) });
    }
    if (req.method !== 'POST') return send(res, 405, { error: 'use POST' });
    const b = body(req);

    if (b.acao === 'criar') {
      const nome = clean(b.nome, 80), email = clean(b.email, 120).toLowerCase(), tel = clean(b.tel, 20).replace(/\D/g, '');
      const senha = String(b.senha || '');
      if (!nome) return send(res, 400, { error: 'Escreva seu nome.' });
      if (!EMAIL.test(email)) return send(res, 400, { error: 'Confira o e-mail.' });
      if (tel.length < 10) return send(res, 400, { error: 'Escreva o WhatsApp com DDD.' });
      if (senha.length < 6) return send(res, 400, { error: 'A senha precisa de pelo menos 6 caracteres.' });
      const hash = hashSenha(senha);
      const out = await mutate((s) => {
        if (s.contas.some((x) => x.email === email)) return { erro: 'Já existe uma conta com esse e-mail. Use "Entrar".' };
        if (s.contas.length >= MAX_CONTAS) return { erro: 'Não foi possível criar a conta agora. Fale com a loja no WhatsApp.' };
        const c = { id: uid('c'), nome, email, tel, senha: hash, criado: Date.now(), plano: null, assinatura: null };
        if ((s.planos || []).some((p) => p.id === b.plano)) c.plano = { id: b.plano, desde: Date.now() };
        s.contas.push(c);
        return { conta: contaView(c, s), token: makeContaToken(c.id) };
      });
      if (out.erro) return send(res, 400, { error: out.erro });
      return send(res, 200, Object.assign({ ok: true }, out));
    }

    if (b.acao === 'entrar') {
      await new Promise((r) => setTimeout(r, 400)); // freia tentativas em série
      const { state } = await read();
      const c = state.contas.find((x) => x.email === clean(b.email, 120).toLowerCase());
      if (!c || !confereSenha(b.senha, c.senha)) return send(res, 401, { error: 'E-mail ou senha não conferem.' });
      return send(res, 200, { ok: true, conta: contaView(c, state), token: makeContaToken(c.id) });
    }

    const id = checkContaToken(req);
    if (!id) return send(res, 401, { error: 'entre de novo' });

    if (b.acao === 'assinar') {
      const out = await mutate((s) => {
        const c = s.contas.find((x) => x.id === id);
        const pl = (s.planos || []).find((p) => p.id === b.plano);
        if (!c) return { erro: 'Conta não encontrada.' };
        if (!pl) return { erro: 'Plano não encontrado.' };
        c.plano = { id: pl.id, desde: Date.now() };
        return { conta: contaView(c, s), plano: pl, c: { id: c.id, email: c.email, cliente: c.assinatura && c.assinatura.cliente } };
      });
      if (out.erro) return send(res, 400, { error: out.erro });
      if (!pagavel(out.plano)) return send(res, 200, { ok: true, conta: out.conta, interesse: true });
      const meta = { app: 'lavflex', conta: out.c.id, plano: out.plano.id };
      const sessao = await stripe('checkout/sessions', {
        mode: 'subscription', locale: 'pt-BR',
        line_items: [{ price: out.plano.stripePrice, quantity: 1 }],
        client_reference_id: out.c.id,
        customer: out.c.cliente || undefined, customer_email: out.c.cliente ? undefined : out.c.email,
        metadata: meta, subscription_data: { metadata: meta },
        success_url: origem(req) + '/conta?pago=1', cancel_url: origem(req) + '/conta'
      });
      return send(res, 200, { ok: true, url: sessao.url });
    }

    if (b.acao === 'gerenciar') {
      const { state } = await read();
      const c = state.contas.find((x) => x.id === id);
      if (!c || !c.assinatura || !c.assinatura.cliente) return send(res, 400, { error: 'Você ainda não tem assinatura paga.' });
      const portal = await stripe('billing_portal/sessions', { customer: c.assinatura.cliente, return_url: origem(req) + '/conta' });
      return send(res, 200, { ok: true, url: portal.url });
    }

    send(res, 400, { error: 'ação desconhecida' });
  } catch (e) {
    console.error(e);
    send(res, 500, { error: 'Erro no servidor. Tente de novo.' });
  }
};
