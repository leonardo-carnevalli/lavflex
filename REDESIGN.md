# Repaginada do site Lav-Flex (19/10/2026)

## Conceito: etiqueta de cuidado

Toda roupa fina tem, costurada por dentro, uma etiqueta de cuidado: tecido branco, borda costurada, símbolos pequenos e precisos (bacia de lavar, ferro, círculo da lavagem profissional). O símbolo de **Wet Cleaning profissional é um círculo com W**. O site passa a falar essa língua: preciso, calmo, de lavanderia fina. O único momento ousado continua sendo o topo: a água azul com a comanda pendurada.

## O que está errado hoje (screenshots em produção)

- Todo título usa o mesmo itálico extra largo 800 e gigante. O do Wet Cleaning ocupa 5 linhas no computador. Cansa e perde hierarquia.
- Há uma onda entre todas as seções. Repetida, fica enfeite.
- Três blocos azul-céu inteiros (topo, etapas e faixa final) mais bolhas: tudo grita igual.
- Serviços são "ícone em círculo + título + linha", um padrão genérico.
- O topo e o fim repetem a mesma frase ("Vai viver. A gente cuida do resto." e "Traga sua roupa. A gente cuida do resto.").

## Tokens

Cor (mantém a marca e reduz onde cada cor aparece):
- `--tinta #0F2A5C`: texto e seções escuras.
- `--navy #1D4E9E`: marca e botão principal.
- `--ceu #1EA7E6`: só a água do topo, links e detalhes pequenos. Sai das faixas inteiras do meio.
- `--laranja-forte #BA5814`: ação de WhatsApp e destaque único. `--laranja #E0782F` só em ilhós e detalhes do logo.
- `--algodao #F5F8FB`: fundo das faixas alternadas, frio e nada de creme. `--linha #D3E1EE`.

Tipo: só Archivo (eixo de largura):
- Display: itálico, largura 125%, peso 850. **Só** no h1 do topo e no fechamento.
- Títulos de seção (h2): de pé, largura 100 a 106%, peso 750, tracking -0,02em, `clamp(1.9rem, 4.2vw, 2.9rem)`, no máximo 2 linhas no computador. Reescreva os títulos longos para caber.
- Números, códigos e preços: largura 62 a 72%, tabular. Isso já existe e fica.
- Texto: 17px, line-height 1,55, peso 400. Rótulos pequenos: largura 85%, peso 600, sem caixa alta.

Layout: alinhado à esquerda, coluna máxima de 1180px, gutter de 16px no celular e 32px no computador.

## Seção por seção

1. **Topo**: mantém a água (caustics) e a comanda que cai e balança. Tira quase todas as bolhas fixas (no máximo 2). O h1 fica em 2 linhas no computador. A comanda pode crescer um pouco.
2. **Wet Cleaning** (fundo tinta): título curto, por exemplo "Lavagem a seco, sem solvente.". O símbolo de wet cleaning (círculo com W) vem grande em SVG e desenha o traço uma vez ao entrar na tela. A tabela comparativa continua, mais limpa.
3. **Serviços**: troca a lista de ícones em círculo por **etiquetas tecidas**. Cada uma é uma tira branca com costura tracejada por dentro e dobra no topo, com o símbolo de cuidado (traço de 2px, a família de ícones já existente adaptada), o nome e uma linha de texto. Uma coluna no celular, 3 no computador. Busca e entrega vira uma etiqueta larga com o botão.
4. **Como funciona**: os 6 passos são sequência de verdade, então os números ficam. Sai do bloco azul-céu e vai para fundo branco ou algodão. A linha que enche ao rolar continua.
5. **Preços**: abas e pontilhado continuam (está bom). Só ajuste o título.
6. **Formatura** (tinta): o convite continua.
7. **Planos**: etiquetas no varal continuam (acabaram de ser feitas), ajustadas aos tokens novos.
8. **Cabides**: continua.
9. **Depoimentos**: mais quieto. Tira a aspa gigante e mantém o selo 4,7.
10. **Contato e fechamento**: tira a frase repetida. O fechamento traz uma frase própria, sem repetir o topo.
11. **Divisórias**: tira todas as ondas, menos a linha d'água no fim do topo. Entre seções, borda reta. No máximo uma "costura" (linha tracejada) onde ajudar.

## Movimento (doutrina)

- Um momento orquestrado só: a entrada do topo (comanda cai e balança, título sobe linha a linha). Total de até cerca de 1,9 s.
- Revelar ao rolar só onde mostra algo: linha das etapas, símbolo W desenhando, etiquetas dos planos balançando, cabides. **Nada** de fade-up em toda seção nem hover animado em todo cartão.
- Movimento de resposta ao usuário continua: pílula das abas de preço, recibo do rastreio imprimindo, total contando, carimbo "Pago", botões afundando.
- Curvas: entrar `cubic-bezier(.16,1,.3,1)`, assentar `cubic-bezier(0,.65,.51,.99)`, mudar de posição `cubic-bezier(.77,0,.175,1)`, sair `cubic-bezier(.7,0,.84,0)`. Sem bounce e sem elastic. Overshoot uma vez só, no elemento em foco.
- Cascata de no máximo 500 ms no total. Saída com cerca de 75% da duração da entrada. Só `transform` e `opacity`.
- `prefers-reduced-motion`: tudo vira um fade curto ou fica parado.
