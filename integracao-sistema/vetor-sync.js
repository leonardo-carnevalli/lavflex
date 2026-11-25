// Integração do sistema Lav-Flex com o site (Vetor Agência).
// Ligada por UMA linha no server.js: require('./vetor-sync.js')(app, db);
// O programa só ENVIA dados para o site; não abre porta nem muda as tabelas do sistema.
// Configuração em %APPDATA%\lavflex-sistema\vetor-sync.json:
//   {"site": "https://lavflex-marilia.vercel.app", "chave": "<a mesma SISTEMA_CHAVE da Vercel>"}
// Sem esse arquivo, nada é enviado e o sistema funciona como antes.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

module.exports = function vetorSync(app, db) {
  let pasta = '';
  try { pasta = require('electron').app.getPath('userData'); } catch (e) {}
  if (!pasta) pasta = path.join(process.env.APPDATA || '.', 'lavflex-sistema');
  const arqConfig = path.join(pasta, 'vetor-sync.json');
  const estado = { ultimoEnvio: 0, ultimoErro: null, hash: '' };

  const lerConfig = () => { try { return JSON.parse(fs.readFileSync(arqConfig, 'utf8')); } catch (e) { return null; } };
  const all = (sql, p = []) => new Promise((ok, no) => db.all(sql, p, (e, r) => (e ? no(e) : ok(r))));
  const run = (sql, p = []) => new Promise((ok, no) => db.run(sql, p, function (e) { return e ? no(e) : ok(this); }));

  // tabela própria da Vetor: guarda quais ordens estão prontas, sem mexer nas tabelas do sistema
  db.run('CREATE TABLE IF NOT EXISTS vetor_pronto (os_id INTEGER PRIMARY KEY, pronto_em TEXT)');
  // índice para juntar ordens e clientes pelo nome (sem ele, a aba Clientes e este envio ficam lentos
  // com milhares de ordens); índice não muda dado nem resultado de nenhuma consulta do sistema
  db.run('CREATE INDEX IF NOT EXISTS vetor_idx_os_cliente ON ordens_servico (LOWER(TRIM(cliente_nome)))');

  const PAGOS = ['pago', 'entregue', 'pago/produção', 'pagou/produção'];
  function pagamento(o) {
    const s = String(o.status_pagamento || '').trim().toLowerCase();
    if (PAGOS.includes(s)) return 'pago';
    if (s === 'pago parcial') return 'parcial';
    return 'pendente';
  }
  const tel4 = (t) => String(t || '').replace(/\D/g, '').slice(-4);
  const chaveNome = (n) => String(n || '').trim().toLowerCase();

  // consulta que não derruba o envio se o banco for de uma versão antiga (sem coluna ou tabela)
  const tentar = async (sql, reserva) => { try { return await all(sql); } catch (e) { return reserva ? all(reserva) : []; } };
  const TIPO_CREDITO = { ENTRADA_CREDITO: 'entrada', CONSUMO_OS: 'uso', ESTORNO: 'estorno' };

  async function montar() {
    // gasto e nº de pedidos contados do mesmo jeito que a aba Clientes do sistema (soma de valor_total por nome)
    // a_pagar: soma do que falta pagar em todos os pedidos (Pendente = total; Pago Parcial = restante)
    const sqlClientes = (credito) => `SELECT c.id, c.nome, c.telefone, ${credito} AS credito, COUNT(o.id) AS pedidos, COALESCE(SUM(o.valor_total), 0) AS gasto,
      COALESCE(SUM(CASE WHEN o.id IS NULL THEN 0
        WHEN LOWER(TRIM(o.status_pagamento)) IN ('pago', 'entregue', 'pago/produção', 'pagou/produção') THEN 0
        WHEN LOWER(TRIM(o.status_pagamento)) = 'pago parcial' THEN COALESCE(o.valor_restante, o.valor_total - COALESCE(o.valor_pago, 0))
        ELSE COALESCE(o.valor_total, 0) END), 0) AS a_pagar
      FROM clientes c LEFT JOIN ordens_servico o ON LOWER(TRIM(c.nome)) = LOWER(TRIM(o.cliente_nome)) GROUP BY c.id`;
    const clientes = await tentar(sqlClientes('COALESCE(c.saldo_credito, 0)'), sqlClientes('0'));
    const porNome = new Map(clientes.map((c) => [chaveNome(c.nome), c.id]));
    const movs = new Map();
    (await tentar(`SELECT id, cliente_id, tipo, valor, saldo_novo, ordem_servico_id, observacao, data_hora FROM
      (SELECT h.*, ROW_NUMBER() OVER (PARTITION BY cliente_id ORDER BY id DESC) AS vetor_n FROM historico_creditos h) WHERE vetor_n <= 10 ORDER BY id DESC`))
      .forEach((m) => {
        if (!movs.has(m.cliente_id)) movs.set(m.cliente_id, []);
        movs.get(m.cliente_id).push({ data: m.data_hora || '', tipo: TIPO_CREDITO[m.tipo] || 'entrada', valor: Number(m.valor) || 0, saldo: Number(m.saldo_novo) || 0, rol: m.ordem_servico_id || null, obs: String(m.observacao || '').slice(0, 60) });
      });
    const prontos = new Map((await all('SELECT os_id, pronto_em FROM vetor_pronto')).map((r) => [r.os_id, r.pronto_em]));
    // tudo que está na loja + tudo que falta pagar + os últimos 30 pedidos de cada cliente (histórico)
    const ordens = await all(`SELECT * FROM (SELECT o.*, ROW_NUMBER() OVER (PARTITION BY LOWER(TRIM(o.cliente_nome)) ORDER BY o.id DESC) AS vetor_n FROM ordens_servico o)
      WHERE vetor_n <= 30 OR COALESCE(status_entrega, '') <> 'Entregue'
        OR LOWER(TRIM(COALESCE(status_pagamento, ''))) NOT IN ('pago', 'entregue', 'pago/produção', 'pagou/produção')
      ORDER BY id DESC LIMIT 20000`);
    return {
      clientes: clientes.map((c) => ({
        id: c.id, nome: String(c.nome || '').trim().split(/\s+/)[0], tel4: tel4(c.telefone),
        pedidos: Number(c.pedidos) || 0, gasto: Number(c.gasto) || 0, aPagar: Math.max(0, Number(c.a_pagar) || 0),
        credito: Number(c.credito) || 0, creditos: movs.get(c.id) || []
      })),
      ordens: ordens.map((o) => {
        const entregue = String(o.status_entrega || '').trim().toLowerCase() === 'entregue';
        const pg = pagamento(o);
        return {
          rol: o.id,
          cliente: porNome.get(chaveNome(o.cliente_nome)) || null,
          producao: entregue ? 'entregue' : prontos.has(o.id) ? 'pronto' : 'producao',
          prontoEm: prontos.get(o.id) || '',
          pagamento: pg,
          total: Number(o.valor_total) || 0,
          restante: pg === 'parcial' ? Number(o.valor_restante) || 0 : 0,
          pago: pg === 'parcial' ? Number(o.valor_pago) || 0 : 0,
          pecas: Number(o.qtd_pecas) || 0,
          descricao: String(o.descricao || ''),
          entrada: o.data_entrada || '',
          previsao: o.data_entrega || '',
          entrega: /deliv|entreg/i.test(o.tipo_entrega || '') ? 'entrega' : 'retirada'
        };
      })
    };
  }

  function postar(url, chave, corpo) {
    return new Promise((ok, no) => {
      const u = new URL(url);
      const lib = u.protocol === 'https:' ? require('https') : require('http');
      const dados = Buffer.from(JSON.stringify(corpo));
      const req = lib.request(u, {
        method: 'POST', timeout: 20000,
        headers: { 'content-type': 'application/json', 'content-length': dados.length, 'x-lavflex-chave': chave }
      }, (res) => {
        let txt = '';
        res.on('data', (c) => (txt += c));
        res.on('end', () => (res.statusCode >= 200 && res.statusCode < 300 ? ok(txt) : no(new Error('site respondeu ' + res.statusCode))));
      });
      req.on('timeout', () => req.destroy(new Error('site não respondeu')));
      req.on('error', no);
      req.end(dados);
    });
  }

  let enviando = false;
  async function sincronizar(forcar) {
    const cfg = lerConfig();
    if (!cfg || !cfg.site || !cfg.chave || enviando) return;
    enviando = true;
    try {
      const corpo = await montar();
      const h = crypto.createHash('sha1').update(JSON.stringify(corpo)).digest('hex');
      // sem mudança, reenvia só a cada 10 minutos (o site mostra a hora da última atualização)
      if (!forcar && h === estado.hash && Date.now() - estado.ultimoEnvio < 10 * 60e3) return;
      await postar(cfg.site.replace(/\/+$/, '') + '/api/sistema', cfg.chave, corpo);
      Object.assign(estado, { hash: h, ultimoEnvio: Date.now(), ultimoErro: null });
    } catch (e) {
      estado.ultimoErro = String((e && e.message) || e);
    } finally {
      enviando = false;
    }
  }
  setTimeout(() => sincronizar(true), 5000);
  setInterval(() => sincronizar(false), 30000);

  // usado pelo botão "Pronto" da tela (vetor-sync-ui.js)
  app.get('/api/vetor/status', async (req, res) => {
    try {
      const p = await all('SELECT os_id FROM vetor_pronto');
      res.json({ prontos: p.map((r) => r.os_id), configurado: !!lerConfig(), ultimoEnvio: estado.ultimoEnvio || null, ultimoErro: estado.ultimoErro });
    } catch (e) { res.status(500).json({ error: e.message }); }
  });
  app.post('/api/vetor/pronto/:id', async (req, res) => {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ error: 'ordem inválida' });
    try {
      if (req.body && req.body.pronto === false) await run('DELETE FROM vetor_pronto WHERE os_id = ?', [id]);
      else await run("INSERT OR REPLACE INTO vetor_pronto (os_id, pronto_em) VALUES (?, datetime('now', 'localtime'))", [id]);
      res.json({ ok: true });
      sincronizar(true);
    } catch (e) { res.status(500).json({ error: e.message }); }
  });
  // usado na nota impressa: número do cliente (login do site) a partir do nome
  // compara sem acento e sem diferença de maiúscula (a etiqueta imprime o nome em MAIÚSCULAS)
  const semAcento = (n) => String(n || '').normalize('NFD').replace(/[̀-ͯ]/g, '').trim().toLowerCase().replace(/\s+/g, ' ');
  app.get('/api/vetor/login', async (req, res) => {
    try {
      const alvo = semAcento(req.query.nome);
      const rows = alvo ? await all('SELECT id, nome FROM clientes') : [];
      const achado = rows.find((r) => semAcento(r.nome) === alvo);
      const cfg = lerConfig() || {};
      // siteImpresso: endereço que sai no papel (pode ser o domínio próprio mesmo antes do DNS apontar)
      const site = String(cfg.siteImpresso || cfg.site || '').replace(/^https?:\/\//, '').replace(/\/+$/, '');
      res.json({ cliente: achado ? achado.id : null, site });
    } catch (e) { res.status(500).json({ error: e.message }); }
  });
};
