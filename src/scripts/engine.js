/* engine.js
   Lógica do Yu-Jo-Ken-Po (tudo em um ficheiro).
   - Organiza estado
   - Funções puras de regras
   - Manipulação do DOM
*/

/* ---------- Estado inicial e store simples ---------- */
const initialState = () => ({
  score: { player: 0, cpu: 0, draws: 0 },
  bestOf: 5,
  round: 0,
  last: { player: null, cpu: null, outcome: null }, // outcome: 'win'|'lose'|'draw'
  history: [] // array de objetos {round, player, cpu, outcome}
});

let store = initialState();

function setState(next) {
  store = Object.freeze({ ...next });
  renderAll();
}

/* ---------- Regras básicas ---------- */
const TYPES = ['monster', 'trap', 'spell'];

function cpuPlay() {
  return TYPES[Math.floor(Math.random() * TYPES.length)];
}

// matrix determina resultado do player vs cpu
// 'win' significa que player ganha
const MATRIX = {
  monster: { trap: 'win', spell: 'lose', monster: 'draw' },
  trap:    { spell: 'win', monster: 'lose', trap: 'draw' },
  spell:   { monster: 'win', trap: 'lose', spell: 'draw' }
};

function decide(player, cpu) {
  return MATRIX[player][cpu];
}

/* ---------- UI helpers ---------- */
function q(id) { return document.getElementById(id); }

function labelOf(type) {
  return type === 'monster' ? 'Monstro'
       : type === 'trap'    ? 'Armadilha'
       : 'Magia';
}

function updateScoreUI() {
  q('score-player').textContent = store.score.player;
  q('score-cpu').textContent = store.score.cpu;
  q('score-draws').textContent = store.score.draws;
}

function paintCards(player, cpu) {
  const p = q('card-player');
  const c = q('card-cpu');

  // limpa classes possíveis
  ['card--monster','card--trap','card--spell','card--idle'].forEach(cls => { p.classList.remove(cls); c.classList.remove(cls); });

  if (player) { p.classList.add(`card--${player}`); p.textContent = labelOf(player); } else { p.classList.add('card--idle'); p.textContent = '?'; }
  if (cpu)    { c.classList.add(`card--${cpu}`);    c.textContent = labelOf(cpu); } else { c.classList.add('card--idle'); c.textContent = '?'; }
}

function paintResult(outcome) {
  const el = q('result');
  el.classList.remove('result--win','result--lose','result--draw');
  if (!outcome) { el.textContent = 'Faça sua jogada!'; return; }
  if (outcome === 'win')  { el.textContent = 'Você venceu a rodada!'; el.classList.add('result--win'); }
  if (outcome === 'lose') { el.textContent = 'CPU venceu a rodada!';   el.classList.add('result--lose'); }
  if (outcome === 'draw') { el.textContent = 'Empate!';                el.classList.add('result--draw'); }
}

function pushHistory({ round, player, cpu, outcome }) {
  const li = document.createElement('li');
  const badge = outcome === 'win' ? '✅' : outcome === 'lose' ? '❌' : '⚖️';
  li.textContent = `R${round} ${badge} — Você: ${labelOf(player)} • CPU: ${labelOf(cpu)}`;
  q('history-list').appendChild(li);
}

function clearHistoryUI() {
  q('history-list').innerHTML = '';
}

/* ---------- Estado / Redutores (puras) ---------- */
function registerRoundReducer(state, { player, cpu, outcome }) {
  const score = { ...state.score };
  if (outcome === 'win') score.player++;
  else if (outcome === 'lose') score.cpu++;
  else score.draws++;

  const round = state.round + 1;
  const history = state.history.concat([{ round, player, cpu, outcome }]);
  return { ...state, score, round, last: { player, cpu, outcome }, history };
}

function resetReducer(state) {
  const best = state.bestOf;
  return { ...initialState(), bestOf: best };
}

function setBestOfReducer(state, bestOf) {
  return { ...state, bestOf };
}

/* ---------- Lógica de jogo ---------- */
function announceIfMatchEnded() {
  const needed = Math.ceil(store.bestOf / 2);
  const { player, cpu } = store.score;
  if (player >= needed || cpu >= needed) {
    const el = q('result');
    const msg = player > cpu ? `🎉 Você venceu a partida! (Melhor de ${store.bestOf})` : `🤖 CPU venceu a partida! (Melhor de ${store.bestOf})`;
    el.textContent = msg;
    return true;
  }
  return false;
}

function playRound(playerChoice) {
  // se já terminou, ignora
  if (announceIfMatchEnded()) return;

  if (!TYPES.includes(playerChoice)) return;

  const cpuChoice = cpuPlay();
  const outcome = decide(playerChoice, cpuChoice); // 'win'|'lose'|'draw'

  // aplicar reducer
  const next = registerRoundReducer(store, { player: playerChoice, cpu: cpuChoice, outcome });
  setState(next);

  // UI history push
  pushHistory(next.history[next.history.length - 1]);

  // Se acabou a partida, anuncia
  announceIfMatchEnded();
}

/* ---------- Eventos UI ---------- */
function attachListeners() {
  document.querySelectorAll('.choice').forEach(btn => {
    btn.addEventListener('click', () => {
      // animação e desativação rápida para acessibilidade
      document.querySelectorAll('.choice').forEach(b => b.setAttribute('aria-pressed','false'));
      btn.setAttribute('aria-pressed','true');
      const type = btn.dataset.type;
      playRound(type);
    });
  });

  q('reset').addEventListener('click', () => {
    setState(resetReducer(store));
    clearHistoryUI();
    paintCards(null, null);
    paintResult(null);
  });

  q('best-of').addEventListener('change', (e) => {
    const best = Number(e.target.value);
    setState(setBestOfReducer(store, best));
    // reinicia a partida ao mudar formato
    setState(resetReducer(store));
    clearHistoryUI();
    paintCards(null, null);
    paintResult(null);
  });
}

/* ---------- Renderização central ---------- */
function renderAll() {
  updateScoreUI();
  const last = store.last;
  if (last.player || last.cpu) paintCards(last.player, last.cpu);
  else paintCards(null, null);
  paintResult(last.outcome);
}

/* ---------- Inicialização ---------- */
function init() {
  setState(initialState());
  attachListeners();
  // initial paint
  updateScoreUI();
  paintCards(null, null);
  paintResult(null);
}

document.addEventListener('DOMContentLoaded', init);
