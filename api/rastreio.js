// GET /api/rastreio?c=CODIGO: status de um pedido pelo código impresso na etiqueta
const { read, trackView, normCodigo, send } = require('./_lib');

module.exports = async (req, res) => {
  const url = new URL(req.url, 'http://x');
  const c = normCodigo(url.searchParams.get('c'));
  await new Promise((r) => setTimeout(r, 250)); // freia quem tenta adivinhar códigos em série
  if (c.length !== 6) return send(res, 400, { error: 'O código tem 6 letras e números, como LF-7K3M9P.' });
  try {
    const { state } = await read();
    const p = (state.pedidos || []).find((x) => x.codigo === c);
    if (!p) return send(res, 404, { error: 'Não achamos esse código. Confira na etiqueta ou chame a Lav-Flex no WhatsApp.' });
    send(res, 200, { ok: true, pedido: trackView(p) });
  } catch (e) {
    send(res, 500, { error: 'Não consegui consultar agora. Tente de novo em instantes.' });
  }
};
