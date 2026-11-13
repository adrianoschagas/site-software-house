// Filtro do portfólio e montagem da mensagem de contato.
export function initPortfolio() {
  const btns = [...document.querySelectorAll('.filters button')];
  const works = [...document.querySelectorAll('#works .work')];
  for (const b of btns) {
    b.addEventListener('click', () => {
      const f = b.dataset.f;
      btns.forEach((o) => o.setAttribute('aria-pressed', String(o === b)));
      works.forEach((w) => { w.hidden = !(f === 'todos' || w.dataset.c === f); });
    });
  }
}

export function initContact() {
  const form = document.getElementById('msg-form'), out = document.getElementById('msg-text'), copy = document.getElementById('copy');
  if (!form || !out) return;

  function build() {
    const svc = [...form.querySelectorAll('input[name=svc]:checked')].map((i) => i.value);
    const nome = form.elements.negocio.value.trim(), ideia = form.elements.ideia.value.trim();
    const lista = svc.length > 1 ? `${svc.slice(0, -1).join(', ')} e ${svc[svc.length - 1]}` : (svc[0] || 'ajuda com tecnologia');
    out.textContent =
      `Oi! Estou procurando ${lista}.\n\n` +
      `Empresa: ${nome || '(a preencher)'}\n` +
      `O que quero resolver: ${ideia || '(a preencher)'}\n\n` +
      'Podemos conversar?';
  }
  form.addEventListener('input', build);
  form.addEventListener('submit', (e) => e.preventDefault());
  build();

  copy.addEventListener('click', () => {
    const done = (msg) => { copy.textContent = msg; setTimeout(() => { copy.textContent = 'Copiar mensagem'; }, 2200); };
    const select = () => {
      const r = document.createRange(); r.selectNodeContents(out);
      const s = getSelection(); s.removeAllRanges(); s.addRange(r);
      done('Selecionado: Ctrl+C');
    };
    try { navigator.clipboard.writeText(out.textContent).then(() => done('Copiado'), select); } catch (e) { select(); }
  });
}
