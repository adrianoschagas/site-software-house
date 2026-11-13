import './style.css';
import { initForest } from './forest.js';
import { initServices } from './services.js';
import { initTheme, initOwl } from './theme.js';
import { initPortfolio, initContact } from './ui.js';

const hero = document.getElementById('inicio');
let forest = null;
try {
  forest = initForest(hero, document.getElementById('mata'), document.getElementById('ipes'));
} catch (e) {
  hero.classList.add('no3d');          // sem WebGL o topo vira só o céu com o texto
  console.error(e);
}

initTheme((dark) => { if (forest) forest.setNight(dark); });
initOwl();
initServices();
initPortfolio();
initContact();
