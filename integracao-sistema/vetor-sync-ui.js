// Integração com o site (Vetor Agência), parte da tela:
// 1. botão "Marcar pronto" nas ações de cada ordem (ao lado de "Ver Peças"); o site passa a mostrar "Pronto";
// 2. etiqueta de acesso ao site no fim das etiquetas de cada ordem.
(function () {
  let prontos = new Set();

  async function carregar() {
    try {
      const r = await fetch('/api/vetor/status');
      const j = await r.json();
      prontos = new Set(j.prontos || []);
      pintar();
    } catch (e) {}
  }

  function pintar() {
    // só na lista do Atendimento/Balcão (nos Finalizados a roupa já foi entregue)
    document.querySelectorAll('#tabelaOS button[data-acao="ver-pecas"][data-id]').forEach((sel) => {
      const id = Number(sel.dataset.id);
      let b = sel.parentElement && sel.parentElement.querySelector('button[data-vetor-pronto="' + id + '"]');
      if (!b) {
        b = document.createElement('button');
        b.type = 'button';
        b.dataset.vetorPronto = String(id);
        b.className = 'btn-acao';
        b.addEventListener('click', async (e) => {
          e.preventDefault();
          e.stopPropagation();
          const novo = !prontos.has(id);
          b.disabled = true;
          try {
            const r = await fetch('/api/vetor/pronto/' + id, {
              method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ pronto: novo })
            });
            if (r.ok) { if (novo) prontos.add(id); else prontos.delete(id); }
          } catch (err) {}
          b.disabled = false;
          pintar();
        });
        sel.insertAdjacentElement('beforebegin', b);
      }
      const pronto = prontos.has(id);
      const txt = pronto ? '✓ Pronto' : 'Marcar pronto';
      if (b.textContent !== txt) b.textContent = txt; // só muda se for diferente, para o observador não girar em falso
      b.title = pronto ? 'O site mostra esta roupa como pronta. Clique para voltar a "em produção".' : 'Avisar no site que esta roupa está pronta.';
      b.style.background = pronto ? '#6f42c1' : '#343a40';
      b.style.color = '#fff';
    });
  }

  let agendado = false;
  new MutationObserver(() => {
    if (agendado) return;
    agendado = true;
    requestAnimationFrame(() => { agendado = false; pintar(); });
  }).observe(document.body, { childList: true, subtree: true });

  carregar();
  setInterval(carregar, 20000);

  // Etiqueta de acesso ao site: quando o sistema imprime as etiquetas de uma ordem, sai UMA etiqueta a mais
  // no fim, com o site, o nº do cliente e a senha. As etiquetas das peças não mudam.
  const imprimirOriginal = window.executarImpressaoDocumento;
  if (typeof imprimirOriginal === 'function') {
    const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
    window.executarImpressaoDocumento = function (html, titulo, opcoes) {
      const h = String(html || '');
      const ehEtiquetaDeOrdem = h.includes('class="nome-peca"') && h.includes('class="nome-cliente"') && !h.includes('CALIBRAGEM');
      if (!ehEtiquetaDeOrdem || h.includes('data-vetor-acesso')) return imprimirOriginal.apply(this, arguments);
      const m = h.match(/class="nome-cliente"[^>]*>([^<]*)</);
      const t = document.createElement('textarea');
      t.innerHTML = m ? m[1] : '';
      fetch('/api/vetor/login?nome=' + encodeURIComponent(t.value.trim()))
        .then((r) => r.json()).catch(() => null)
        .then((j) => {
          let novo = h;
          if (j && j.cliente && j.site) {
            const bloco = '<div class="bloco-etiqueta" data-vetor-acesso style="text-align:center;">' +
              '<div style="font-size:8px;font-weight:900;line-height:1.3;">ACOMPANHE SUA ROUPA NO SITE</div>' +
              '<div style="font-size:9.5px;font-weight:900;margin:1px 0;">' + esc(j.site) + '</div>' +
              '<div style="font-size:9px;font-weight:900;">Nº DO CLIENTE: <span style="font-size:16px;">' + esc(j.cliente) + '</span></div>' +
              '<div style="font-size:7.5px;font-weight:900;line-height:1.2;">SENHA: 4 ÚLTIMOS NÚMEROS DO SEU TELEFONE</div></div>';
            const i = novo.lastIndexOf('</body>');
            novo = i >= 0 ? novo.slice(0, i) + bloco + novo.slice(i) : novo + bloco;
          }
          imprimirOriginal.call(window, novo, titulo, opcoes);
        });
    };
  }
})();
