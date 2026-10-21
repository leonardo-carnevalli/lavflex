// POST /api/pedidos (com senha): uma ação por vez em um pedido, para dois aparelhos não se atropelarem.
// acoes: criar, editar, status, pago, excluir. Devolve o pedido como ficou.
const { mutate, checkToken, novoCodigo, ETAPAS, clean, num, uid, cents, send, body } = require('./_lib');

const MAX_PEDIDOS = 4000; // acima disso, os entregues mais antigos saem do arquivo

function lerCampos(b) {
  const itens = (Array.isArray(b.itens) ? b.itens : []).slice(0, 60)
    .map((i) => ({ nome: clean(i.nome, 80), qtd: Math.max(1, Math.round(num(i.qtd, 999))), preco: cents(num(i.preco, 1e5)) }))
    .filter((i) => i.nome);
  const desconto = cents(num(b.desconto, 1e5));
  const bruto = itens.reduce((t, i) => t + i.qtd * i.preco, 0);
  return {
    nome: clean(b.nome, 80), tel: clean(b.tel, 20).replace(/\D/g, ''), itens, desconto,
    total: cents(Math.max(0, bruto - desconto)), entrega: b.entrega === 'entrega' ? 'entrega' : 'retirada',
    previsao: /^\d{4}-\d{2}-\d{2}$/.test(b.previsao) ? b.previsao : '', obs: clean(b.obs, 500)
  };
}

module.exports = async (req, res) => {
  if (!checkToken(req)) return send(res, 401, { error: 'entre de novo' });
  if (req.method !== 'POST') return send(res, 405, { error: 'use POST' });
  const b = body(req);
  try {
    const out = await mutate((s) => {
      s.pedidos = s.pedidos || [];
      const agora = Date.now();
      if (b.acao === 'criar') {
        const f = lerCampos(b);
        if (!f.nome) return { erro: 'Falta o nome do cliente.' };
        // "só o código": pedido só com nome, as peças e o valor podem entrar depois pelo Editar
        if (!f.itens.length && !b.rapido) return { erro: 'Adicione pelo menos uma peça.' };
        const codigo = novoCodigo(new Set(s.pedidos.map((p) => p.codigo)));
        const p = Object.assign(f, { id: uid('p'), codigo, pago: !!b.pago, status: 0, hist: [{ s: 0, d: agora }], criado: agora, d: agora });
        if (b.rapido) { p.rapido = true; if (!f.itens.length) p.total = cents(num(b.valor, 1e5)); } // valor opcional, sem peças
        s.pedidos.unshift(p);
        if (s.pedidos.length > MAX_PEDIDOS) {
          const velhos = s.pedidos.filter((x) => x.status === ETAPAS.length - 1).sort((x, y) => x.d - y.d);
          const sai = new Set(velhos.slice(0, s.pedidos.length - MAX_PEDIDOS).map((x) => x.id));
          s.pedidos = s.pedidos.filter((x) => !sai.has(x.id));
        }
        return { pedido: p };
      }
      const p = s.pedidos.find((x) => x.id === b.id);
      if (!p) return { erro: 'Pedido não encontrado. Atualize a lista.' };
      if (b.acao === 'editar') {
        const f = lerCampos(b);
        if (!f.nome) return { erro: 'Falta o nome do cliente.' };
        if (!f.itens.length && !p.rapido) return { erro: 'Adicione pelo menos uma peça.' };
        // pedido rápido sem peças guarda o valor digitado, não a soma das peças
        if (!f.itens.length) f.total = cents(Math.max(0, num(b.valor != null ? b.valor : p.total, 1e5) - f.desconto));
        Object.assign(p, f);
      } else if (b.acao === 'status') {
        const st = Math.round(num(b.status, ETAPAS.length - 1));
        p.status = st;
        p.hist = (p.hist || []).filter((h) => h.s < st); // voltar uma etapa apaga as datas da frente
        // pular etapas marca as do meio com a mesma hora, para a linha do tempo não ficar com buraco
        for (let k = p.hist.length ? p.hist[p.hist.length - 1].s + 1 : 0; k <= st; k++) p.hist.push({ s: k, d: agora });
      } else if (b.acao === 'pago') {
        p.pago = !!b.pago;
      } else if (b.acao === 'excluir') {
        s.pedidos = s.pedidos.filter((x) => x.id !== p.id);
        return { excluido: true };
      } else return { erro: 'ação desconhecida' };
      p.d = agora;
      return { pedido: p };
    });
    if (out.erro) return send(res, 400, { error: out.erro });
    send(res, 200, Object.assign({ ok: true }, out));
  } catch (e) {
    send(res, 500, { error: 'erro no servidor, tente de novo' });
  }
};
