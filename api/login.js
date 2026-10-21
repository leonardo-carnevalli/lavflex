// POST /api/login: confere a senha do painel e devolve uma sessão de 7 dias
const { samePassword, makeToken, send, body } = require('./_lib');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return send(res, 405, { error: 'use POST' });
  await new Promise((r) => setTimeout(r, 400)); // freia tentativas em série
  if (!samePassword(body(req).senha)) return send(res, 401, { error: 'senha errada' });
  send(res, 200, { ok: true, token: makeToken() });
};
