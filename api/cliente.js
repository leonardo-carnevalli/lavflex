// POST /api/cliente {cliente, senha}: área do cliente cadastrado no sistema da loja.
// Login = número do cliente (sai impresso na nota); senha = 4 últimos números do telefone.
// Versão simples, combinada com o Leonardo em 18/11/2026; endurecer depois.
const { read, num, clean, send, body } = require('./_lib');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return send(res, 405, { error: 'use POST' });
  const b = body(req);
  await new Promise((r) => setTimeout(r, 300)); // freia quem tenta adivinhar em série
  const id = Math.round(num(b.cliente, 1e9));
  const senha = clean(b.senha, 12).replace(/\D/g, '');
  if (!id || senha.length !== 4) return send(res, 400, { error: 'Digite o número do cliente e os 4 últimos números do seu telefone.' });
  try {
    const { state } = await read();
    const sis = state.sistema;
    const c = sis && sis.clientes && sis.clientes[id];
    if (!c || !c.tel4 || c.tel4 !== senha) return send(res, 401, { error: 'Número do cliente ou senha não conferem. Confira na sua nota ou chame a Lav-Flex no WhatsApp.' });
    // tudo que está na loja ou falta pagar vai sempre; do resto (entregue e pago), os 30 mais novos
    const doCliente = (sis.ordens || []).filter((o) => o.cliente === id).sort((x, y) => y.rol - x.rol);
    const pendentes = doCliente.filter((o) => o.producao !== 'entregue' || o.pagamento !== 'pago');
    const ordens = pendentes.concat(doCliente.filter((o) => o.producao === 'entregue' && o.pagamento === 'pago').slice(0, 30))
      .sort((x, y) => y.rol - x.rol);
    send(res, 200, {
      ok: true,
      cliente: {
        numero: id, nome: String(c.nome || '').split(' ')[0],
        pedidos: c.pedidos || 0, gasto: c.gasto || 0, aPagar: c.aPagar || 0, credito: c.credito || 0, creditos: c.creditos || []
      },
      ordens, atualizado: sis.visto
    });
  } catch (e) {
    send(res, 500, { error: 'Não consegui consultar agora. Tente de novo em instantes.' });
  }
};
