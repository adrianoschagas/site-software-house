// Tema claro/escuro: o botão grava a escolha em <html data-theme>, e quem depende do tema é avisado.
export function initTheme(onChange) {
  const root = document.documentElement, btn = document.getElementById('theme');
  const mq = window.matchMedia('(prefers-color-scheme: dark)');
  const isDark = () => (root.dataset.theme ? root.dataset.theme === 'dark' : mq.matches);

  function sync() {
    const dark = isDark();
    if (btn) {
      btn.setAttribute('aria-pressed', String(dark));
      btn.setAttribute('aria-label', dark ? 'Ativar modo claro' : 'Ativar modo escuro');
    }
    onChange(dark);
  }
  if (btn) btn.addEventListener('click', () => {
    const next = isDark() ? 'light' : 'dark';
    root.dataset.theme = next;
    try { localStorage.setItem('tema', next); } catch (e) { /* sem armazenamento: vale só nesta visita */ }
  });
  new MutationObserver(sync).observe(root, { attributes: true, attributeFilter: ['data-theme'] });
  mq.addEventListener('change', sync);
  sync();
}

// A coruja acompanha o cursor com as pupilas.
export function initOwl() {
  const owl = document.getElementById('owl');
  if (!owl) return;
  const pupils = [...owl.querySelectorAll('.pupil')];
  const svg = owl.querySelector('svg');
  window.addEventListener('pointermove', (e) => {
    const r = svg.getBoundingClientRect();
    if (!r.width) return;
    const k = 120 / r.width;                                   // px da tela → unidades do desenho
    for (const p of pupils) {
      const cx = r.left + (+p.getAttribute('cx')) / k, cy = r.top + (+p.getAttribute('cy')) / k;
      const dx = e.clientX - cx, dy = e.clientY - cy, d = Math.hypot(dx, dy) || 1;
      const reach = Math.min(4.5, d / 40);
      p.style.transform = `translate(${(dx / d * reach).toFixed(2)}px, ${(dy / d * reach).toFixed(2)}px)`;
    }
  }, { passive: true });
}
