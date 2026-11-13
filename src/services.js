// Serviços: cada aba toca uma demonstração roteirizada, passo a passo, e passa pra próxima sozinha.
// Marcação: data-s = passo em que o elemento entra; data-u = passo em que sai; data-count = número que sobe;
// data-w / data-wt = largura / texto em % a cada passo.
const STEP = 850, HOLD = 2800;

export function initServices() {
  const root = document.getElementById('svc');
  if (!root) return;
  const tabs = [...root.querySelectorAll('.tab')];
  const stages = tabs.map((t) => document.getElementById(t.getAttribute('aria-controls')));
  const title = document.getElementById('wtitle'), again = document.getElementById('again');
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let cur = 0, auto = true, visible = false, timers = [];

  const lastStep = (st) => Math.max(...[...st.querySelectorAll('[data-s]')].map((e) => Math.max(+e.dataset.s, +(e.dataset.u || 0))));

  function countUp(el) {
    const to = +el.dataset.count, pre = el.dataset.pre || '', t0 = performance.now();
    const tick = (now) => {
      const u = Math.min(1, (now - t0) / 900);
      el.textContent = pre + Math.round(to * (1 - Math.pow(1 - u, 3))).toLocaleString('pt-BR');
      if (u < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }

  function setStep(st, k, animate) {
    st.classList.toggle('still', !animate);
    for (const el of st.querySelectorAll('[data-s]')) {
      const on = k >= +el.dataset.s && (!el.dataset.u || k < +el.dataset.u), was = el.classList.contains('on');
      el.classList.toggle('on', on);
      if (on && !was && animate) (el.hasAttribute('data-count') ? [el] : [...el.querySelectorAll('[data-count]')]).forEach(countUp);
    }
    const at = (list) => { const a = list.split(','); return a[Math.min(k, a.length - 1)] + '%'; };
    for (const el of st.querySelectorAll('[data-w]')) el.style.width = at(el.dataset.w);
    for (const el of st.querySelectorAll('[data-wt]')) el.textContent = at(el.dataset.wt);
  }

  const stop = () => { timers.forEach(clearTimeout); timers = []; };
  function settle(i) { stop(); setStep(stages[i], lastStep(stages[i]), false); }

  function runBar(i, ms) {
    for (const t of tabs) t.querySelector('.bar i').classList.remove('run');
    if (!auto || reduce) return;
    const bar = tabs[i].querySelector('.bar i');
    tabs[i].style.setProperty('--dur', ms + 'ms');
    void bar.offsetWidth;                       // reinicia a animação da barra
    bar.classList.add('run');
  }

  function play(i) {
    stop();
    const st = stages[i], m = lastStep(st);
    if (reduce) { setStep(st, m, false); return; }
    for (const el of st.querySelectorAll('.on')) el.classList.remove('on');
    void st.offsetWidth;
    setStep(st, 0, true);
    for (let k = 1; k <= m; k++) timers.push(setTimeout(() => setStep(st, k, true), k * STEP));
    const total = m * STEP + HOLD;
    runBar(i, total);
    timers.push(setTimeout(() => { if (auto && visible) select((i + 1) % tabs.length); }, total));
  }

  function select(i) {
    settle(cur);
    cur = i;
    tabs.forEach((t, j) => { t.setAttribute('aria-selected', String(j === i)); t.tabIndex = j === i ? 0 : -1; });
    stages.forEach((s, j) => { s.hidden = j !== i; });
    root.dataset.on = tabs[i].dataset.key;
    title.textContent = tabs[i].dataset.title;
    if (visible) play(i); else settle(i);
  }

  tabs.forEach((t, i) => {
    t.addEventListener('click', () => { auto = false; select(i); });
    t.addEventListener('keydown', (e) => {
      const d = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 }[e.key];
      if (!d) return;
      e.preventDefault(); auto = false;
      const n = (i + d + tabs.length) % tabs.length; select(n); tabs[n].focus();
    });
  });
  again.addEventListener('click', () => play(cur));

  // em repouso tudo fica no estado final; a animação só começa quando a seção aparece na tela
  stages.forEach((st) => { st.classList.add('js'); setStep(st, lastStep(st), false); });
  if ('IntersectionObserver' in window) {
    new IntersectionObserver((en) => {
      visible = en[0].isIntersecting;
      if (visible) play(cur); else settle(cur);
    }, { threshold: 0.3 }).observe(root.querySelector('.win'));
  }
}
