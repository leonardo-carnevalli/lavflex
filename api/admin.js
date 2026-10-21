// /api/admin (com senha): GET lê tudo, PUT salva loja/preços/combos/depoimentos/planos,
// POST {acao:'limpar-exemplos'|'recomecar'|'excluir-conta'}
const { mutate, read, checkToken, stripeLigado, send, body } = require('./_lib');
const { makeDefaults } = require('../seed.js');

const EDITAVEL = ['loja', 'categorias', 'precos', 'combos', 'depoimentos', 'planos'];

module.exports = async (req, res) => {
  if (!checkToken(req)) return send(res, 401, { error: 'entre de novo' });
  try {
    if (req.method === 'GET') {
      const { state } = await read();
      // a senha (já embaralhada) das contas nunca sai do servidor
      const contas = state.contas.map((c) => Object.assign({}, c, { senha: undefined }));
      return send(res, 200, { ok: true, data: Object.assign({}, state, { contas }), stripe: stripeLigado() });
    }
    const b = body(req);
    if (req.method === 'PUT') {
      await mutate((s) => { EDITAVEL.forEach((k) => { if (b[k] !== undefined) s[k] = b[k]; }); });
      return send(res, 200, { ok: true });
    }
    if (req.method === 'POST') {
      await mutate((s) => {
        if (b.acao === 'limpar-exemplos') { s.pedidos = (s.pedidos || []).filter((p) => !p.exemplo); s.demo = false; }
        else if (b.acao === 'recomecar') Object.assign(s, makeDefaults());
        else if (b.acao === 'excluir-conta') s.contas = s.contas.filter((c) => c.id !== b.id);
      });
      return send(res, 200, { ok: true });
    }
    send(res, 405, { error: 'método não aceito' });
  } catch (e) {
    send(res, 500, { error: 'erro no servidor' });
  }
};
