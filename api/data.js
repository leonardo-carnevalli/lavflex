// GET /api/data: loja, preços, combos e depoimentos para o site público
const { read, publicView, send } = require('./_lib');

module.exports = async (req, res) => {
  try {
    const { state } = await read();
    send(res, 200, { ok: true, data: publicView(state) });
  } catch (e) {
    send(res, 500, { error: 'não consegui ler os dados' });
  }
};
