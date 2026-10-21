# Portão de design: Lav-Flex, repaginada do site (index.html e conta.html)

Revisão de 19/10/2026, feita contra o `REDESIGN.md` e o `casa.md`.

Evidência: servidor local `node dev.cjs` na porta 5180, Playwright com Chromium. Capturei:
- página inteira em 1366 e 390 depois de rolar tudo;
- telas de 390 em sequência e de 1366 em sequência;
- o topo em 960, 1024, 1280, 1366x640, 1440 e 1920;
- 360px em `/`, `/conta?plano=pl2` e `/r/7K3M9P`.

Os prints estão no scratchpad da sessão, em `C:\Users\Leonardo\AppData\Local\Temp\claude\C--Users-Leonardo\ca2ee096-57b3-4a5f-8009-6f12f1a30563\scratchpad\rev\`. No fim, desliguei o servidor. A conta de teste que criei foi apagada: o `.dados-local.json` voltou ao backup e ficou idêntico byte a byte.

## Decisão: HOLD

O design passa. A ideia da etiqueta de cuidado funciona, o contrato foi cumprido e o rastreio está ótimo. O HOLD vem de dois itens da base de qualidade, que a casa diz que "não se negocia": alvos de toque e contraste AA. Os dois se resolvem só com CSS. Depois de corrigidos, basta medir de novo, sem nova rodada de design.

## Obrigatório antes do PASS

1. **Alvos de 44px nos controles soltos (fora de frase).** Meça em 390px, com `getBoundingClientRect`:
   - cabeçalho: "Preços", 48x35, e "Rastrear", 90x41. São justamente as duas tarefas da persona;
   - topo: "Ver a tabela de preços", 177x26, e "Teste com o código de exemplo", 280x30;
   - "Rastrear minha roupa", 19px, e "Pedir orçamento de peça especial", 19px;
   - "@lavflexmarilia", 26px;
   - abas de preço, 43px;
   - rodapé da Vetor: 21 a 22px;
   - na `/conta`: "Ver os planos", 24px, "Trocar de plano", 24px, e "Sair da conta", cerca de 38px.

   Correção: `display:inline-flex; align-items:center; min-height:44px` nesses links e botões. Nos que estão no meio de uma frase, como "Entrar na minha conta" e "Minha conta", não precisa.

   Verificar: em 390, `/` e `/conta?plano=pl2`, nenhum desses abaixo de 44px de altura.
2. **Contraste do selo "A pagar na retirada" no recibo.** Hoje é `#BA5814` sobre `#FDF1E8`, que dá **4,21:1**. O texto tem 17px em negrito, que não conta como texto grande, então reprova no AA. Isso aparece no estado principal da tarefa: o pedido 7K3M9P, em andamento e não pago.

   Correção: escurecer o texto (por exemplo `#9A4710`, que fica acima de 5:1 nesse fundo) ou pôr o selo sobre branco com borda.

   Verificar: em `/r/7K3M9P`, medir 4,5:1 ou mais.

## Pontos que o construtor levantou

1. **A comanda baixa no computador, com a área do alto à direita "vazia".** Não bloqueia. Essa área não está vazia: tem a corda e a água, e é isso que conta a cena da comanda pendurada. O título passa por cima dela de propósito.

   O risco real é a dobra. Em 1366x768, o botão Rastrear termina em y=676. Numa janela real de notebook 1366x768 (com barra de tarefas e barra do Chrome, a área útil fica em torno de 640 a 650px), o campo aparece inteiro e o botão fica cortado. Mesmo assim não bloqueia, por três motivos:
   - a persona está no celular;
   - o caminho principal do rastreio é o QR code, que abre `/r/CODIGO` e já mostra o recibo;
   - o campo fica visível e o Enter envia.

   Sugestão em Opcional.
2. **Textos novos.**
   - "Traga sua roupa. Ela volta como antes." **Aprovado.** Não repete o topo, conversa com o texto de abertura ("a peça volta com a cor e o caimento de antes") e não promete "como nova", que seria exagero. A leitura literal "volta do jeito que deixei" fica desfeita pelo contexto.
   - "O símbolo de Wet Cleaning profissional nas etiquetas de roupa" **está correto.** No padrão de etiquetas de cuidado (ISO 3758/GINETEX), o círculo com W é a limpeza úmida profissional. Pode ficar como está. Há um refino em Opcional.
3. **`stroke-dashoffset` para desenhar o W.** Não bloqueia.
   - A regra "só transform e opacity" existe para evitar layout e engasgo.
   - O dashoffset num SVG de 132px só repinta essa área pequena, não mexe no layout e roda uma vez.
   - A casa aceita "um traço que se desenha" como revelação legítima.
   - Com reduced-motion o W aparece pronto, parado. Verifiquei: opacidade 1 e sem a classe `aguarda`.

## Teste dos 5 segundos (390px, primeira tela)

Passou.
- **O que é:** o cabeçalho diz "Lav-Flex, Lavanderia em Marília" e o texto abre com "Lavanderia de roupas finas e de grife em Marília".
- **É para mim:** fala de Marília.
- **O que fazer:** botão laranja "Pedir orçamento no WhatsApp", "Ver a tabela de preços" logo embaixo e "Rastrear" fixo no cabeçalho.

O formulário de rastreio começa abaixo da dobra, mas o topo da comanda já aparece e puxa a rolagem.

## Passeio da persona (simulação)

Isto é uma simulação, não um teste com cliente real.

Persona derivada: uma cliente de Marília, 30 a 55 anos, que segue o @lavflexmarilia. Ela toca no link da bio num Android comum, com 4G. Hoje quer uma de duas coisas: saber quanto custa lavar um terno ou um vestido de festa, ou ver se a roupa que deixou ontem já está pronta.

**Tela 1, o topo.**
- Persona: "É a lavanderia do Instagram. Wet Cleaning, sem cheiro de química... legal. Tem preço? Tem, 'Ver a tabela de preços'. E 'Rastrear' ali em cima."
- Análise: a confiança sobe. A nota 4,7 com 32 avaliações aparece logo, e o cartão do Google no mapa confirma esse número. As duas tarefas estão à vista. Os links do cabeçalho são pequenos (35 e 41px), e o dedo pode errar.

**Tela 2, a comanda.**
- Persona: "Ah, é igual ao papelzinho que me deram. Código da comanda... vou digitar."
- Análise: é o elemento memorável e ele ensina a tarefa. O exemplo de código e a explicação ("vem impresso na comanda... com QR code") tiram a dúvida.

**Tela 3, o recibo (`/r/7K3M9P` pelo QR).**
- Persona: "Maria, sua roupa está lavando. Retirada amanhã, terça. Três peças, R$ 112, a pagar na retirada."
- Análise: confiança alta. Ela tem a resposta em uma frase, a data por extenso e o valor. "Falar sobre este pedido" fica ao alcance do polegar. No pedido pronto e pago, o carimbo "Pago" e o horário de retirada fecham a dúvida.

**Telas 4 e 5, Wet Cleaning e tabela comparativa.**
- Persona: "Então lavagem a seco usa química e aqui é com água. Faz sentido para o meu terno."
- Análise: o tom é calmo e o W dá um ar técnico de verdade. Para quem veio por preço, são duas telas de leitura antes de chegar lá. O link do cabeçalho resolve.

**Telas 6 e 7, os serviços em etiquetas.**
- Persona: "Lavar e secar, só passar, tênis, manchas... e buscam em casa? Vou perguntar o bairro."
- Análise: as etiquetas se leem como etiquetas, com a dobra e a costura. No celular, as sete em pilha dão cerca de 1100px de rolagem. É o trecho mais longo.

**Telas 8 e 9, etapas e preços.**
- Persona: "Camisa social, R$ 22. Vestido de festa, R$ 74. Tá ok."
- Análise: as abas com rolagem lateral mostram a aba seguinte cortada, o que convida a deslizar. Os preços são grandes e alinhados. A nota sobre peças especiais evita surpresa no balcão.

**Telas 10 a 12, formatura, planos e cabides.**
- Persona: "Plano com valor a definir? Ok, ainda não. Cabide vale crédito, legal."
- Análise: o aviso de "valores sendo definidos" está claro na página. Na `/conta`, o botão "Criar conta e assinar" sem preço pode deixá-la ansiosa ("vão me cobrar quanto?"). Detalhe em Opcional.

**Telas 13 a 15, depoimentos, loja e fechamento.**
- Persona: "Fica na Santo Antônio, abre sábado até 13h. Vou chamar no WhatsApp."
- Análise: o horário em tabela com pontilhado lê bem. O botão flutuante de WhatsApp acompanha a página toda. O fechamento repete endereço e botões que estavam logo acima. Não atrapalha, mas sobra.

## Caça aos tells (casa, item por item)

- **Creme, serifa e terracota:** não tem. O fundo é algodão frio `#F5F8FB` e a letra é Archivo sem serifa.
- **Quase preto com um acento só:** não tem. As seções escuras são azul-tinta da marca.
- **Layout de jornal:** não tem. Os filetes ficam só na tabela comparativa e na lista de preços, onde servem à leitura.
- **Kit de cards SaaS:** fica perto, mas passa. As etiquetas de serviço têm todas o mesmo raio e a mesma sombra. Só que carregam o objeto (dobra no topo, pesponto tracejado, trama) e não há gradiente decorativo. É a repetição de um objeto real, não um kit.
- **Caixa alta espaçada, " · ", "→" e mono:** não tem. A caixa alta só aparece no campo de código, onde é funcional.
- **Uma palavra do título em itálico ou cor:** não tem. O hífen laranja é do logo.
- **Numeração 01/02/03:** só nas 6 etapas, que são uma sequência de verdade.
- **Herói com número grande:** não tem.
- **Fade-up em toda seção, hover em todo card, bolhas e ondas:** não tem. Sobraram uma onda, duas bolhas e revelações só onde mostram algo.
- **Emoji ou ícone de banco:** não tem. Os ícones são de traço próprio, com o detalhe laranja.
- **Mesmo peso em todos os títulos:** corrigido. O display itálico largo fica no h1 e no fechamento. Os h2 são de pé, peso 750, e têm no máximo 2 linhas em 1366 (medi todos).

## Contrato (REDESIGN.md)

Cumprido item por item:
- tokens e onde cada cor aparece;
- tipografia: só Archivo, com as larguras pedidas;
- coluna de 1180px e gutter de 16 e 32px;
- topo com no máximo 2 bolhas e h1 em 2 linhas;
- título curto no Wet Cleaning, W desenhando uma vez e tabela mais limpa;
- serviços em etiquetas, 1 coluna no celular e 3 no computador, com a etiqueta larga de busca e entrega;
- etapas em fundo branco, com a linha que enche;
- preços, formatura, planos e cabides mantidos;
- depoimentos sem a aspa gigante e com o selo;
- frase própria no fechamento;
- uma onda e uma costura só;
- reduced-motion.

O elemento memorável é **um só**: a comanda pendurada no topo. As outras peças penduradas (etiquetas do varal e cabides) são versões quietas da mesma língua e não competem com ela.

Desvios pequenos, nenhum bloqueante:
- "Formaturas e festas" usa itálico largo, um terceiro uso do estilo display;
- os botões de WhatsApp do cabeçalho e do Contato são azuis, mas o token diz que WhatsApp é `--laranja-forte`;
- a linha do tempo do recibo anima `height`, a impressão do recibo anima `clip-path` e o indicador das abas anima `width`;
- a cascata das etapas dura cerca de 1 s, só que ela segue a linha que enche, então se justifica.

## Base de qualidade

**Contraste**, medido em WCAG:

| Par de cores | Razão | Situação |
|---|---|---|
| tinta sobre céu (h1 e texto do topo) | 5,13 | passa |
| branco sobre navy | 7,97 | passa |
| branco sobre laranja-forte | 4,67 | passa |
| suave sobre algodão | 6,67 | passa |
| apagado sobre branco | 4,82 | passa |
| claro sobre tinta | 9,53 | passa |
| `#AFC1DA` sobre tinta (tabela) | 7,61 | passa |
| `#FFC59B` sobre navy ("Valor a definir") | 5,20 | passa |
| claro sobre navy | 5,45 | passa |
| erro sobre branco | 6,54 | passa |
| **"A pagar" sobre `#FDF1E8`** | **4,21** | **reprova** |

O placeholder fica em 2,38:1, mas não entra na exigência.

**Alvos de toque:** ver Obrigatório 1.

**Foco visível:**
- botão: contorno tinta de 3px com afastamento, bem visível;
- rodapé escuro: contorno branco;
- campo: borda navy e halo céu, visível mas discreto (ver Opcional).

A ordem do Tab segue a ordem visual: marca, menu, WhatsApp, botões do topo, campo, Rastrear, exemplo.

**360px:** sem rolagem horizontal em `/`, `/conta?plano=pl2` e `/r/7K3M9P` (scrollWidth = 360). As abas de preço passam da largura dentro do próprio contêiner com rolagem, de propósito.

**Reduced-motion:** o topo aparece com fade curto e o recibo sem impressão. O W, os cabides e o varal ficam parados. O pulso da etapa atual some.

**Console:** nenhum `pageerror`. Os únicos registros de erro são de rede e foram provocados pelos testes:
- 404 do código inexistente;
- requisição abortada no teste sem conexão;
- 401 da senha errada.

**Estados:**
- carregando: "Consultando…";
- sucesso: em andamento e pronto e pago;
- vazio, código curto, código não encontrado e sem conexão: cada um com mensagem própria, e o recibo antigo some;
- `/conta`: erro de campo, carregando, sucesso "Na lista" e senha errada.

**Acentos e fatos:**
- os textos estão com acento certo;
- o endereço com "Polon" e a nota 4,7 com 32 avaliações batem com o cartão do Google no mapa;
- os horários vêm do Google (PLANO.md);
- o símbolo W está correto.

**Rodapé da Vetor:** presente nas duas páginas, com logo `/img/vetor.svg`, "Desenvolvido por Vetor Agência", @vetor_agencia e "Quer um site assim? Fale com a gente".

## Manter (não mexer)

- **A comanda pendurada como formulário de rastreio.** Ela ensina a tarefa com o próprio objeto que a cliente tem na mão: o canhoto "Via do cliente", o ilhós e o picote.
- **O recibo do rastreio.** A frase com o nome ("Maria, sua roupa está lavando."), a previsão por extenso, a linha do tempo que enche, o total que conta e o carimbo "Pago". É a melhor tela do site.
- **Os títulos de pé em 2 linhas e o itálico largo só no h1 e no fechamento.** A hierarquia voltou.
- **A seção Wet Cleaning em tinta, com o W grande e a tabela "o que limpa / produtos / cheiro".** Explica a diferença sem jargão.
- **As etiquetas de serviço com dobra e pesponto, e a etiqueta escura de grife.** Isso é a etiqueta de gola, não um card.
- **A tabela de preços com abas, pílula que desliza, pontilhado e números estreitos.**
- **O fechamento "Traga sua roupa. Ela volta como antes."**
- **A queda da comanda com ease-in no primeiro trecho.** É uma queda com gravidade que assenta com a curva de assentar. É uma exceção consciente à regra "ease-in na entrada é erro", e funciona.
- **As mensagens de erro do rastreio.** São humanas e dizem o que fazer ("Confira na etiqueta ou chame a Lav-Flex no WhatsApp").

## Opcional

- **Topo no computador.** Ligar a corda à altura da tela, por exemplo `--corda: clamp(190px, calc(100svh - 470px), 236px)`, para o botão Rastrear caber em janelas de cerca de 650px. Conferir que "resto." não encosta no topo da comanda.
- **Legenda do W com uma ação.** Por exemplo: "Procure este símbolo na etiqueta da sua roupa: é o Wet Cleaning profissional."
- **Botões de WhatsApp do cabeçalho e do Contato** em `--laranja-forte`, como pede o token. Ou decidir que o laranja fica só para o CTA principal e registrar isso no REDESIGN.
- **"Formaturas e festas"** de pé, com 750, para o itálico largo ficar mesmo só no h1 e no fechamento.
- **Linha do tempo do recibo** com `scaleY` em vez de `height`, como já é feito na linha das etapas.
- **`/conta` sem preço definido.** Trocar "Criar conta e assinar" por "Criar conta e entrar na lista" e pôr uma linha "Nada é cobrado agora." perto do botão.
- **`/conta` carregando.** Hoje o botão só clareia. Trocar o texto para "Criando sua conta…".
- **Foco do campo** com contraste maior, por exemplo o mesmo contorno tinta de 3px dos botões.
- **Fechamento.** Tirar o endereço e o "Como chegar", que repetem a seção Contato logo acima.

## Aviso fora do escopo da repaginada

Os itens dos planos não vieram do Renato. O PLANO.md só diz que os valores estão em aberto, e os itens também não aparecem lá. São eles: "Até 30 peças por mês", "Prazo normal de 3 dias", "Até 40 peças... 2 jogos de cama", "Busca e entrega 1 vez por semana", "Até 20 camisas sociais", "2 costumes" e "Entrega em 48 horas". Isso fere a regra 2 da casa.

Não pus no Obrigatório porque a repaginada não criou nem mudou esses itens, e eles já estão no ar desde a entrega dos planos. Segurar este deploy não tira os itens de produção. Precisam de uma decisão do Leonardo com o Renato: confirmar os itens ou mostrar "a definir" também neles.

## Persona

- **Confiança:** 8 de 10.
- **Clareza:** 8 de 10.
- **Chamaria no WhatsApp?** Sim. O botão laranja do topo e o flutuante estão sempre à mão, e o recibo tem "Falar sobre este pedido".
- **Momento em que quase saiu:** ao rolar procurando preço sem usar o menu. Entre o topo e a tabela de preços há a explicação do Wet Cleaning e sete etiquetas de serviço, cerca de 3 telas no celular. Quem não toca em "Preços" no cabeçalho (35px de altura, fácil de errar) pode desistir antes. Na `/conta`, o segundo momento é "assinar" um plano com "R$ ____".
