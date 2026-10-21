// Conteúdo inicial da Lav-Flex (tirado do Instagram e do Google em 18/10/2026).
// Preços, textos e horários mudam pelo painel; este arquivo é só a carga inicial
// e o mesmo arquivo roda no navegador (site e painel) e no servidor (api/_lib.js).

// Etapas do rastreio, na ordem. O índice é o que fica salvo em pedido.status.
const ETAPAS = [
  { nome: 'Recebida', txt: 'Suas peças chegaram e foram cadastradas.' },
  { nome: 'Triagem', txt: 'Separação por tecido e tratamento de manchas.' },
  { nome: 'Lavando', txt: 'Wet Cleaning com temperatura controlada.' },
  { nome: 'Secando e passando', txt: 'Secagem controlada e passadoria.' },
  { nome: 'Pronta', txt: 'Embalada e esperando por você.' },
  { nome: 'Entregue', txt: 'Peças entregues. Obrigado pela confiança!' }
];

function makeDefaults() {
  let n = 0;
  const p = (cat, nome, preco) => ({ id: 'p' + (++n), cat, nome, preco });
  return {
    loja: {
      nome: 'Lav-Flex Lavanderia',
      whatsapp: '5514998852752',
      telefone: '(14) 99885-2752',
      endereco: 'Av. Santo Antônio, 3220, Polon, Marília/SP, 17507-050',
      mapa: 'https://www.google.com/maps/search/?api=1&query=Lav-Flex+Lavanderia+Av.+Santo+Ant%C3%B4nio+3220+Mar%C3%ADlia',
      instagram: 'lavflexmarilia',
      horarios: [
        { dias: 'Segunda a sexta', horas: '7h30 às 18h' },
        { dias: 'Sábado', horas: '7h às 13h' },
        { dias: 'Domingo', horas: 'Fechado' }
      ],
      prazoDias: 3, // previsão padrão de um pedido novo; o balcão pode mudar em cada pedido
      notaGoogle: '4,7',
      avaliacoesGoogle: 32,
      avaliarGoogle: '', // link "Pedir avaliações" do Perfil da Empresa; vazio usa o link do Maps
      mostrarPlanos: true // seção de planos no site; o painel liga e desliga
    },
    categorias: [
      { id: 'lavar-secar', nome: 'Só lavar e secar', obs: 'Peças selecionadas, sem passar.' },
      { id: 'frequencia', nome: 'Acima de 10 peças', obs: 'Preço para mais de 10 peças ou cliente frequente.' },
      { id: 'individuais', nome: 'Peças individuais', obs: 'Lavar, secar e passar.' },
      { id: 'vestidos', nome: 'Vestidos, jaquetas e outros', obs: '' },
      { id: 'agasalhos', nome: 'Agasalhos e casacos', obs: '' },
      { id: 'cama', nome: 'Cama, banho e tênis', obs: '' }
    ],
    precos: [
      p('lavar-secar', 'Camiseta', 7.5), p('lavar-secar', 'Camisa', 7.5), p('lavar-secar', 'Calça jeans ou social', 7.5),
      p('lavar-secar', 'Bermuda', 7.5), p('lavar-secar', 'Lençol', 7.5), p('lavar-secar', 'Toalha', 7.5),
      p('frequencia', 'Camisa e calça social', 14.8), p('frequencia', 'Kit básico (roupa do dia a dia)', 12.6),
      p('frequencia', 'Lençol solteiro, mesa e banho', 16), p('frequencia', 'Lençol casal ou king', 18),
      p('frequencia', 'Fronha e toalha de rosto', 7.4),
      p('individuais', 'Camisa social', 22), p('individuais', 'Calça social', 22), p('individuais', 'Camiseta', 17),
      p('individuais', 'Calça jeans', 17), p('individuais', 'Camisa polo', 17), p('individuais', 'Vestido curto', 38),
      p('individuais', 'Vestido longo', 44), p('individuais', 'Vestido de festa', 74),
      p('vestidos', 'Vestido de festa com pedraria', 85), p('vestidos', 'Vestido infantil', 28),
      p('vestidos', 'Costume (calça e paletó)', 68), p('vestidos', 'Jaqueta', 36), p('vestidos', 'Jaqueta jeans', 38),
      p('vestidos', 'Jaqueta com forro', 53), p('vestidos', 'Jaqueta motociclista', 60), p('vestidos', 'Casaco', 45),
      p('agasalhos', 'Agasalho (blusa)', 20), p('agasalhos', 'Agasalho (calça)', 22), p('agasalhos', 'Casaco especial', 55),
      p('agasalhos', 'Casaco infantil', 13), p('agasalhos', 'Sobretudo', 57), p('agasalhos', 'Edredom berço', 32),
      p('agasalhos', 'Edredom solteiro', 52.5), p('agasalhos', 'Edredom casal', 60),
      p('cama', 'Edredom queen ou king', 65), p('cama', 'Cobre-leito casal', 53), p('cama', 'Cobre-leito king', 53),
      p('cama', 'Lençol solteiro', 16), p('cama', 'Lençol casal ou king', 24), p('cama', 'Toalha de banho', 24),
      p('cama', 'Toalha de rosto', 10), p('cama', 'Tênis', 44)
    ],
    combos: [
      { id: 'c1', nome: 'Individual', pecas: '1 vestido, 1 costume e 1 camisa', preco: 166, economia: 0, soPassar: 108 },
      { id: 'c2', nome: 'Dupla', pecas: '2 vestidos, 2 costumes e 2 camisas', preco: 300, economia: 32, soPassar: 195.18 },
      { id: 'c3', nome: 'Família', pecas: '3 vestidos, 3 costumes e 3 camisas', preco: 430, economia: 68, soPassar: 279.76 },
      { id: 'c4', nome: 'Grupo', pecas: '4 vestidos, 4 costumes e 4 camisas', preco: 550, economia: 114, soPassar: 357.82 }
    ],
    depoimentos: [
      { nome: 'Giovani Gabriel', txt: 'Qualidade e atendimento top, meu terno ficou muito bom e sempre levo minhas roupas lá!' },
      { nome: 'Tamires Loureiro de Moraes', txt: 'Minhas roupas ficaram impecáveis, bem cuidadas e com um cheirinho maravilhoso. Atendimento atencioso e prazo cumprido certinho.' },
      { nome: 'Alves Engenharia', txt: 'Excelente lavanderia! Roupas limpas, cheirosas e serviço super eficiente. Profissionais muito atenciosos.' }
    ],
    // planos de assinatura: preço vazio aparece como "valor a definir" e o botão só guarda o interesse.
    // Com preço, o ID do preço no Stripe (price_...) e a chave na Vercel, o botão leva ao pagamento.
    planos: [
      { id: 'pl1', nome: 'Dia a dia', resumo: 'A roupa da semana lavada e seca, sem você pensar nisso.', preco: null, destaque: false, stripePrice: '',
        itens: ['Até 30 peças por mês', 'Lavar e secar', 'Prazo normal de 3 dias'] },
      { id: 'pl2', nome: 'Casa em dia', resumo: 'Roupa lavada e passada, e a cama sempre trocada.', preco: null, destaque: true, stripePrice: '',
        itens: ['Até 40 peças por mês, lavadas e passadas', '2 jogos de cama por mês', 'Busca e entrega 1 vez por semana'] },
      { id: 'pl3', nome: 'Executivo', resumo: 'Camisa social e costume prontos para a semana de trabalho.', preco: null, destaque: false, stripePrice: '',
        itens: ['Até 20 camisas sociais por mês', '2 costumes por mês', 'Entrega em 48 horas'] }
    ],
    pedidos: pedidosExemplo(),
    demo: true
  };
}

// três pedidos de exemplo para mostrar o rastreio; o painel tem um botão para apagar
function pedidosExemplo() {
  const h = Date.now(), dia = 864e5;
  const data = (d) => new Date(h + d * dia - 3 * 36e5).toISOString().slice(0, 10);
  const hist = (n, desde) => Array.from({ length: n + 1 }, (_, s) => ({ s, d: h - desde + s * 5 * 36e5 }));
  const ped = (codigo, nome, itens, status, desde, previsao, extra) => {
    const total = Math.round(itens.reduce((t, i) => t + i.qtd * i.preco, 0) * 100) / 100;
    return Object.assign({ id: 'ex' + codigo, codigo, nome, tel: '', itens, desconto: 0, total, pago: false,
      entrega: 'retirada', previsao: data(previsao), obs: '', status, hist: hist(status, desde), criado: h - desde, d: h, exemplo: true }, extra);
  };
  return [
    ped('7K3M9P', 'Maria Exemplo', [{ nome: 'Costume (calça e paletó)', qtd: 1, preco: 68 }, { nome: 'Camisa social', qtd: 2, preco: 22 }], 2, dia, 2),
    ped('QX4T8H', 'João Exemplo', [{ nome: 'Vestido de festa', qtd: 1, preco: 74 }, { nome: 'Edredom casal', qtd: 1, preco: 60 }], 4, 2 * dia, 0, { pago: true }),
    ped('B5RN2W', 'Ana Exemplo', [{ nome: 'Tênis', qtd: 1, preco: 44 }], 0, 2 * 36e5, 3, { entrega: 'entrega' })
  ];
}

if (typeof module === 'object' && module.exports) module.exports = { makeDefaults, ETAPAS };
