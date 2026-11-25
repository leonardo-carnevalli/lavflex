# Gera um banco FALSO e amplo para testar a integração Lav-Flex (nada de dado real).
# Uso: python -I gerar-banco-teste.py <lavflex.db de teste> <saida casos.json>
# Mantém usuários, serviços (tabela de preços) e contador de notas; troca clientes, ordens e créditos.
# 100 clientes; os 5 primeiros com muitos pedidos; crédito vindo de devolução de cabides.
import json
import random
import sqlite3
import sys
from datetime import datetime, timedelta

random.seed(42)
db = sqlite3.connect(sys.argv[1], timeout=10)
saida = sys.argv[2]
agora = datetime.now().replace(microsecond=0)

NOMES = ['Ana', 'Beatriz', 'Camila', 'Daniela', 'Eduarda', 'Fernanda', 'Gabriela', 'Helena', 'Isabela', 'Juliana',
         'Larissa', 'Mariana', 'Natália', 'Patrícia', 'Renata', 'Sofia', 'Tatiane', 'Vanessa', 'Aline', 'Bruna',
         'André', 'Bruno', 'Carlos', 'Diego', 'Eduardo', 'Felipe', 'Gustavo', 'Henrique', 'Igor', 'João',
         'Leonardo', 'Marcelo', 'Nicolas', 'Otávio', 'Paulo', 'Rafael', 'Sérgio', 'Thiago', 'Vinícius', 'Wagner']
SOBRENOMES = ['Silva', 'Souza', 'Oliveira', 'Santos', 'Pereira', 'Lima', 'Carvalho', 'Ferreira', 'Rodrigues', 'Almeida',
              'Costa', 'Gomes', 'Martins', 'Araújo', 'Melo', 'Barbosa', 'Ribeiro', 'Rocha', 'Dias', 'Teixeira',
              'Moreira', 'Cardoso', 'Nunes', 'Mendes', 'Freitas', 'Vieira', 'Castro', 'Pinto', 'Moraes', 'Campos']
BAIRROS = ['Centro', 'Fragata', 'Palmital', 'Cascata', 'Jardim Maria Izabel', 'Somenzari', 'Polon', 'Banzato']
FORMAS = ['PIX', 'PIX', 'PIX', 'Dinheiro', 'Cartão de Crédito', 'Cartão de Débito']

servicos = [(n.strip(), float(p), int(q or 1)) for n, p, q in
            db.execute('SELECT nome, preco, qtd_pecas_fisicas FROM servicos WHERE preco > 0')]
if not servicos:
    sys.exit('tabela de serviços vazia')

db.execute('CREATE TABLE IF NOT EXISTS vetor_pronto (os_id INTEGER PRIMARY KEY, pronto_em TEXT)')
for t in ['clientes', 'ordens_servico', 'historico_creditos', 'vetor_pronto']:
    db.execute(f'DELETE FROM {t}')
db.execute("DELETE FROM sqlite_sequence WHERE name IN ('clientes', 'ordens_servico', 'historico_creditos')")

# ---- clientes
usados, clientes = set(), []
while len(clientes) < 100:
    nome = f'{random.choice(NOMES)} {random.choice(SOBRENOMES)}'
    if nome in usados:
        nome += ' ' + random.choice(SOBRENOMES)
    if nome in usados:
        continue
    usados.add(nome)
    tel = '149000' + f'{random.randint(0, 99999):05d}'  # prefixo 14 9000x: número falso
    clientes.append({'nome': nome, 'tel': tel})
for i, c in enumerate(clientes, start=1):
    c['id'] = i
    db.execute('INSERT INTO clientes (id, nome, telefone, endereco, logradouro, numero, bairro, cidade, uf, saldo_credito) '
               'VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0)',
               (i, c['nome'], c['tel'], f'Rua de Teste, {random.randint(10, 999)}', 'Rua de Teste',
                str(random.randint(10, 999)), random.choice(BAIRROS), 'Marília', 'SP'))

# ---- ordens (datas sorteadas nos últimos 14 meses; id cresce com a data, como no sistema)
ordens = []
for c in clientes:
    n = random.randint(20, 35) if c['id'] <= 5 else random.choice([0, 1, 1, 2, 2, 3, 3, 4, 5, 6])
    datas = sorted(agora - timedelta(days=random.uniform(9, 420), minutes=random.randint(0, 600)) for _ in range(n))
    # o pedido mais novo fica "na loja" em ~55% dos clientes (sempre nos 5 grandes)
    if n and (c['id'] <= 5 or random.random() < 0.55):
        datas[-1] = agora - timedelta(days=random.uniform(0, 6), minutes=random.randint(0, 600))
        ativo_idx = n - 1
    else:
        ativo_idx = None
    for k, d in enumerate(datas):
        ordens.append({'c': c, 'data': d, 'ativo': k == ativo_idx})
ordens.sort(key=lambda o: o['data'])

prontos = []
for os_id, o in enumerate(ordens, start=1):
    o['id'] = os_id
    linhas, total, pecas = [], 0.0, 0
    for nome, preco, qf in random.sample(servicos, random.randint(1, 4)):
        q = random.choice([1, 1, 1, 2, 2, 3, 4, 6, 8])
        linhas.append(f'{q}x {nome}')
        total += q * preco
        pecas += q * qf
    delivery = random.random() < 0.3
    taxa = 8.0 if delivery else 0.0
    desconto = round(total * 0.1, 2) if random.random() < 0.1 else 0.0
    total = round(total + taxa - desconto, 2)
    entrada = o['data'].strftime('%Y-%m-%d %H:%M:%S')
    previsao = (o['data'] + timedelta(days=random.randint(2, 5))).strftime('%Y-%m-%d')
    pago, restante, data_pg = 0.0, total, None
    if o['ativo']:
        status_entrega = 'PENDENTE'
        status = random.choices(['Pendente', 'Pago/Produção', 'Pago Parcial'], [45, 35, 20])[0]
        if random.random() < 0.4:
            prontos.append(os_id)
    else:
        status_entrega = 'Entregue'
        status = random.choices(['Entregue', 'Pago', 'Entregou/Pendente'], [85, 5, 10])[0]
    if status in ('Entregue', 'Pago', 'Pago/Produção'):
        pago, restante, data_pg = total, 0.0, entrada
    elif status == 'Pago Parcial':
        pago = round(total * random.choice([0.3, 0.4, 0.5, 0.6]), 2)
        restante = round(total - pago, 2)
        data_pg = entrada
    o.update(total=total, status=status)
    # o sistema separa as peças por linha (extrairListaDePecas faz split('\n'))
    db.execute('INSERT INTO ordens_servico (id, cliente_nome, telefone, descricao, qtd_pecas, valor_total, forma_pagamento, '
               'status_pagamento, data_entrada, data_entrega, status_entrega, tipo_entrega, taxa_entrega, data_pagamento, '
               'valor_pago, valor_restante, itens_json, desconto_valor, motivo_desconto) '
               'VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
               (os_id, o['c']['nome'], o['c']['tel'], '\n'.join(linhas), pecas, total, random.choice(FORMAS), status,
                entrada, previsao, status_entrega, 'Delivery Próprio' if delivery else 'Retirada na Loja', taxa, data_pg,
                pago, restante, '[]', desconto, 'Cliente fiel' if desconto else ''))
for os_id in prontos:
    db.execute("INSERT INTO vetor_pronto (os_id, pronto_em) VALUES (?, datetime('now', 'localtime'))", (os_id,))

# ---- crédito: devolução de cabides vira crédito; às vezes usado num pedido ou estornado
com_credito = [c for c in clientes if c['id'] <= 5 or random.random() < 0.35]
por_cliente = {}
for o in ordens:
    por_cliente.setdefault(o['c']['id'], []).append(o)
for c in com_credito:
    saldo, eventos = 0.0, []
    for _ in range(random.randint(1, 6)):
        eventos.append(('ENTRADA', agora - timedelta(days=random.uniform(1, 400))))
    eventos.sort(key=lambda e: e[1])
    for _, quando in eventos:
        cab = random.choice([10, 15, 20, 25, 30, 40, 50, 60])
        valor = round(cab * 0.5, 2)  # R$ 0,50 por cabide (valor de teste)
        db.execute('INSERT INTO historico_creditos (cliente_id, tipo, valor, saldo_anterior, saldo_novo, observacao, data_hora) '
                   'VALUES (?, ?, ?, ?, ?, ?, ?)',
                   (c['id'], 'ENTRADA_CREDITO', valor, saldo, saldo + valor, f'Devolução de {cab} cabides', quando.strftime('%Y-%m-%d %H:%M:%S')))
        saldo = round(saldo + valor, 2)
        if saldo >= 10 and random.random() < 0.5:
            depois = [o for o in por_cliente.get(c['id'], []) if o['data'] > quando]
            alvo = depois[0] if depois else None
            uso = round(min(saldo, random.choice([5, 8, 10, 12.5, 15])), 2)
            q2 = (alvo['data'] if alvo else quando + timedelta(days=3)).strftime('%Y-%m-%d %H:%M:%S')
            db.execute('INSERT INTO historico_creditos (cliente_id, tipo, valor, saldo_anterior, saldo_novo, ordem_servico_id, observacao, data_hora) '
                       'VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
                       (c['id'], 'CONSUMO_OS', uso, saldo, saldo - uso, alvo['id'] if alvo else None, 'Usado no pagamento', q2))
            saldo = round(saldo - uso, 2)
        if random.random() < 0.08:
            db.execute('INSERT INTO historico_creditos (cliente_id, tipo, valor, saldo_anterior, saldo_novo, observacao, data_hora) '
                       'VALUES (?, ?, ?, ?, ?, ?, ?)',
                       (c['id'], 'ESTORNO', 5.0, saldo, saldo + 5, 'Estorno de pagamento', (quando + timedelta(days=5)).strftime('%Y-%m-%d %H:%M:%S')))
            saldo = round(saldo + 5, 2)
    db.execute('UPDATE clientes SET saldo_credito = ? WHERE id = ?', (saldo, c['id']))
db.commit()

# ---- casos para o teste automático
def tel4(c): return c['tel'][-4:]
grande = max(clientes, key=lambda c: len(por_cliente.get(c['id'], [])))
ativo_grande = [o for o in por_cliente[grande['id']] if o['ativo']][0]
fluxo = next(o for o in ordens if o['ativo'] and o['status'] == 'Pendente' and o['id'] not in prontos and o['c']['id'] > 5)
parcial = next((o for o in ordens if o['ativo'] and o['status'] == 'Pago Parcial'), None)
sem_pedido = next((c for c in clientes if not por_cliente.get(c['id'])), None)
casos = {
    'grande': {'cliente': grande['id'], 'senha': tel4(grande), 'nome': grande['nome'].split()[0], 'os_ativa': ativo_grande['id'],
               'pedidos': len(por_cliente[grande['id']])},
    'fluxo': {'cliente': fluxo['c']['id'], 'senha': tel4(fluxo['c']), 'os': fluxo['id']},
    'parcial': {'cliente': parcial['c']['id'], 'senha': tel4(parcial['c']), 'os': parcial['id']} if parcial else None,
    'sem_pedido': {'cliente': sem_pedido['id'], 'senha': tel4(sem_pedido)} if sem_pedido else None,
}
json.dump(casos, open(saida, 'w', encoding='utf-8'), ensure_ascii=False, indent=2)
cnt = lambda sql: db.execute(sql).fetchone()[0]
print('clientes', cnt('SELECT COUNT(*) FROM clientes'), '| ordens', cnt('SELECT COUNT(*) FROM ordens_servico'),
      '| na loja', cnt("SELECT COUNT(*) FROM ordens_servico WHERE status_entrega <> 'Entregue'"),
      '| prontas', cnt('SELECT COUNT(*) FROM vetor_pronto'),
      '| movimentos de crédito', cnt('SELECT COUNT(*) FROM historico_creditos'),
      '| clientes com crédito', cnt('SELECT COUNT(*) FROM clientes WHERE saldo_credito > 0'))
print(json.dumps(casos, ensure_ascii=False))
