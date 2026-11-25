# Integração do sistema Lav-Flex com o site

Combinado com o Leonardo em 18/11/2026. Testado no PC dele com uma cópia do sistema (v1.0.5) e o site local.
Domínio do site: **lavflexmarilia.com.br** (o Renato registrou em 18/11/2026; DNS ainda não aponta para a Vercel).

## Como funciona

- O sistema da loja (Electron, roda só no PC do balcão) ganha um módulo, `vetor-sync.js`. A cada 30 s ele lê o banco local (`%APPDATA%\lavflex-sistema\lavflex.db`) e envia ao site:
  - clientes: primeiro nome, 4 últimos números do telefone, nº de pedidos, total em pedidos, quanto falta pagar, saldo de crédito e os últimos 10 movimentos do crédito (com a observação, ex.: "Devolução de 50 cabides");
  - ordens: tudo que está na loja, tudo que falta pagar e os últimos 30 pedidos de cada cliente (rol, produção, pagamento, valores, peças, previsão).
- O programa só envia; não abre porta nova. Sem o arquivo de configuração, não envia nada e o sistema funciona como antes.
- No sistema aparece o botão "Marcar pronto" nas ações de cada ordem da lista do Atendimento (não nos Finalizados). Ele grava numa tabela nova, `vetor_pronto`; as tabelas do sistema não mudam. Ao marcar, o site muda na hora.
- A nota impressa ganha um bloco abaixo do ROL: "ACOMPANHE NO SITE", o endereço, "Nº do cliente: X" e "Senha: 4 últimos números do seu telefone".
- As etiquetas: as de peça não mudam (40x25 mm já está cheia). No fim de cada impressão sai **uma etiqueta a mais** com o acesso ao site (endereço, nº do cliente, senha).
- Cabides: não existe função separada. Devolver cabide gera crédito no sistema de crédito que já existe; o site mostra o saldo e o motivo.
- No site, "Já é cliente cadastrado?" abre a área do cliente: número do cliente + 4 últimos números do telefone. Mostra:
  - resumo: "Falta pagar R$ X" (laranja) ou "Pagamentos: Tudo pago" (verde), crédito na loja, pedidos feitos, total em pedidos;
  - "Na loja agora": Em produção / Pronto para retirada ou entrega, com pagamento (Pago / Pago em parte · falta R$ / A pagar R$);
  - "Entregues sem pagamento" (só aparece se houver), para o cliente ver de onde vem o "Falta pagar";
  - histórico dos últimos 30 pedidos pagos e entregues;
  - movimento do crédito.
- Pagamento: Pago, Entregue, Pago/Produção e Pagou/Produção contam como pago; Pago Parcial mostra o que falta; o resto é pendente.
- Segurança simples de propósito (pedido do Leonardo); endurecer depois.

## Mudanças no código do sistema (todas feitas por `aplicar.cjs`)

1. Copia `vetor-sync.js` e `vetor-sync-ui.js` para a pasta do app.
2. `server.js`: uma linha depois de `global.db = db;`.
3. `index.html`: `<script src="/vetor-sync-ui.js"></script>` antes do `</body>`.
4. `index.html`, função `emitirReciboOS`: busca o número do cliente e imprime o bloco do site abaixo de "ROL No".

A etiqueta de acesso e o botão "Marcar pronto" ficam em `vetor-sync-ui.js`; não mexem no código das etiquetas.

`aplicar.cjs` pode rodar duas vezes sem duplicar nada. Conferido em 18/11 numa cópia limpa do `app.asar` original: o resultado fica igual à cópia de teste.

## No site (`vetor/clientes/lavflex/site`)

- `api/sistema.js`: recebe o envio do programa; exige o cabeçalho `x-lavflex-chave` igual à variável `SISTEMA_CHAVE`.
- `api/cliente.js`: login do cliente.
- `index.html`: formulário "Minhas roupas" e a área do cliente.
- Falta: criar `SISTEMA_CHAVE` na Vercel, publicar e apontar o domínio (tudo com ok do Leonardo).

## Teste

- `gerar-banco-teste.py <lavflex.db> <casos.json>`: banco FALSO com 100 clientes e 411 pedidos (nomes e telefones inventados, prefixo 149000). Usuário do sistema de teste: `admin` / `senha-de-teste`.
- `teste-ponta-a-ponta.cjs <pasta-prints> <casos.json>`: 22 conferências (site, área do cliente, pronto, pago, entregue, nota, etiquetas, chave errada, erros de JavaScript) e os prints. Precisa do sistema de teste aberto (porta 3000) e do site local (`node dev.cjs`, porta 5180).
- Última rodada: 18/11/2026, 22 de 22.

## No PC do Renato

1. Fechar o sistema Lav-Flex.
2. Achar a pasta do programa instalado (atalho do Lav-Flex, "Abrir local do arquivo"), entrar em `resources`.
3. Guardar cópia de `app.asar` e `app.asar.unpacked`.
4. `npx @electron/asar extract app.asar app-novo` e copiar o conteúdo de `app.asar.unpacked` para dentro de `app-novo`.
5. `node <esta pasta>\aplicar.cjs app-novo`.
6. `npx @electron/asar pack app-novo app.asar --unpack-dir "node_modules/sqlite3"`.
7. Criar `%APPDATA%\lavflex-sistema\vetor-sync.json`:
   `{"site": "https://<endereço da Vercel ou lavflexmarilia.com.br>", "chave": "<SISTEMA_CHAVE>", "siteImpresso": "lavflexmarilia.com.br"}`
   `siteImpresso` é o endereço que sai na nota e na etiqueta; pode ser o domínio próprio mesmo antes do DNS apontar.
8. Abrir o sistema, marcar uma ordem como pronta e conferir no site. Imprimir uma nota e as etiquetas de teste.

Para desfazer: fechar o sistema e voltar o `app.asar` guardado.
