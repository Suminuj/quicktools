import { Chess } from 'chess.js';
import './style.css';

const app = document.querySelector('#app');
const glyph = { wk:'♔', wq:'♕', wr:'♖', wb:'♗', wn:'♘', wp:'♙', bk:'♚', bq:'♛', br:'♜', bb:'♝', bn:'♞', bp:'♟' };
let game = new Chess();
let mode = 'local';
let selected = null;
let busy = false;
let promotion = null;

app.innerHTML = `
  <main class="app">
    <header class="top">
      <div class="brand"><div class="logo">♞</div><div><h1>Checkmate</h1><small>THINK. PLAY. IMPROVE.</small></div></div>
      <span class="pill">BETA · v0.1</span>
    </header>
    <section class="panel">
      <div class="mode"><button id="localMode" class="active">♟ Two players</button><button id="aiMode">✦ vs Computer</button></div>
      <div class="player"><div><span class="avatar">♚</span><span class="name" id="topName">Black</span><div class="sub" id="topSub">Plays second</div></div><span class="pill" id="topTurn">BLACK</span></div>
      <div id="board" class="board" aria-label="Chessboard"></div>
      <div class="player"><div><span class="avatar">♔</span><span class="name" id="bottomName">White</span><div class="sub" id="bottomSub">Plays first</div></div><span class="pill" id="bottomTurn">WHITE TO MOVE</span></div>
      <div class="status"><span class="dot" id="statusDot"></span><span id="status">White to move</span></div>
      <div class="actions"><button id="undo">↶ Undo</button><button id="restart" class="primary">⟲ New game</button></div>
    </section>
    <div class="bottom">
      <section class="info"><h3>Move history</h3><div class="moves" id="moves">No moves yet</div></section>
      <section class="info"><h3>Game settings</h3><div class="moves">Mode: <b id="modeLabel">Local two-player</b><br>Computer: <b>Easy · depth 2</b><br>Rules: <b>Standard chess</b></div></section>
    </div>
    <p class="hint">Tap a piece, then tap a highlighted square. Supports legal moves, check/checkmate, castling, en passant, promotion and undo. Computer play uses a built-in search. Stronger engine levels are planned.</p>
  </main>
  <div class="modal" id="promotion"><div class="dialog"><h3>Promote your pawn</h3><div class="promos" id="promoChoices"></div></div></div>
`;

const $ = id => document.getElementById(id);
const files = 'abcdefgh';
const vals = { p:100, n:320, b:330, r:500, q:900, k:20000 };
const colorName = c => c === 'w' ? 'White' : 'Black';

function statusText() {
  const turn = game.turn();
  if (game.isCheckmate()) return `Checkmate — ${colorName(turn === 'w' ? 'b' : 'w')} wins!`;
  if (game.isStalemate()) return 'Draw — stalemate';
  if (game.isThreefoldRepetition()) return 'Draw — repetition';
  if (game.isInsufficientMaterial()) return 'Draw — insufficient material';
  if (game.isDraw()) return 'Draw';
  return `${colorName(turn)} to move${game.isCheck() ? ' · Check' : ''}`;
}

function render() {
  const board = $('board');
  board.innerHTML = '';
  const legal = selected ? game.moves({ square: selected, verbose: true }) : [];
  const targets = new Map(legal.map(m => [m.to, m]));
  const last = game.history({ verbose: true }).at(-1);
  for (let r = 0; r < 8; r++) for (let f = 0; f < 8; f++) {
    const sq = files[f] + (8-r);
    const piece = game.get(sq);
    const button = document.createElement('button');
    button.className = 'sq ' + ((r+f)%2 ? 'dark' : 'light');
    if (selected === sq) button.classList.add('selected');
    if (last && (last.from === sq || last.to === sq)) button.classList.add('last');
    if (targets.has(sq)) button.classList.add(piece ? 'capture' : 'target');
    button.setAttribute('aria-label', sq + (piece ? ` ${colorName(piece.color)} ${piece.type}` : ''));
    if (piece) {
      const span = document.createElement('span');
      span.className = 'piece ' + (piece.color === 'w' ? 'white' : 'black');
      span.textContent = glyph[piece.color + piece.type];
      button.append(span);
    }
    if (f === 0) { const c=document.createElement('span'); c.className='coords'; c.textContent=8-r; button.append(c); }
    if (r === 7) { const c=document.createElement('span'); c.className='coords file'; c.textContent=files[f]; button.append(c); }
    button.addEventListener('click', () => tap(sq));
    board.append(button);
  }
  updateInfo();
}

function updateInfo() {
  const turn = game.turn();
  const over = game.isGameOver();
  $('status').textContent = statusText();
  $('statusDot').className = 'dot' + (game.isCheck() || over ? ' warn' : '');
  $('topTurn').textContent = turn === 'b' ? 'BLACK TO MOVE' : 'BLACK';
  $('bottomTurn').textContent = turn === 'w' ? 'WHITE TO MOVE' : 'WHITE';
  $('topName').textContent = mode === 'ai' ? 'Computer' : 'Black';
  $('topSub').textContent = mode === 'ai' ? 'Easy · playing Black' : 'Plays second';
  $('bottomName').textContent = 'White';
  $('bottomSub').textContent = mode === 'ai' ? 'You · playing White' : 'Plays first';
  $('modeLabel').textContent = mode === 'ai' ? 'Vs Computer' : 'Local two-player';
  const history = game.history();
  let out = '';
  for (let i=0; i<history.length; i+=2) out += `${i/2+1}. ${history[i]}${history[i+1] ? '  '+history[i+1] : ''}<br>`;
  $('moves').innerHTML = out || 'No moves yet';
  $('moves').scrollTop = $('moves').scrollHeight;
  $('undo').disabled = history.length === 0 || busy;
}

function tap(sq) {
  if (busy || game.isGameOver() || (mode === 'ai' && game.turn() === 'b')) return;
  const piece = game.get(sq);
  if (selected) {
    const moves = game.moves({ square: selected, verbose: true }).filter(m => m.to === sq);
    if (moves.length) {
      if (moves.some(m => m.flags.includes('p'))) { showPromotion(selected, sq); return; }
      makeMove({ from:selected, to:sq });
      return;
    }
  }
  selected = piece && piece.color === game.turn() ? sq : null;
  render();
}

function showPromotion(from, to) {
  promotion = { from, to };
  const wrap = $('promoChoices');
  wrap.innerHTML = '';
  for (const [type, symbol] of [['q','♕'],['r','♖'],['b','♗'],['n','♘']]) {
    const b = document.createElement('button');
    b.textContent = symbol;
    b.setAttribute('aria-label', type);
    b.onclick = () => {
      makeMove({ ...promotion, promotion:type });
      $('promotion').classList.remove('show');
      promotion = null;
    };
    wrap.append(b);
  }
  $('promotion').classList.add('show');
}

function makeMove(move) {
  try {
    const made = game.move(move);
    if (!made) return;
    selected = null;
    render();
    if (mode === 'ai' && game.turn() === 'b' && !game.isGameOver()) setTimeout(computerMove, 160);
  } catch { selected = null; render(); }
}

function evaluate(g) {
  if (g.isCheckmate()) return g.turn() === 'w' ? -100000 : 100000;
  if (g.isDraw()) return 0;
  let score = 0;
  for (const row of g.board()) for (const p of row) if (p) score += (p.color === 'w' ? 1 : -1) * vals[p.type];
  return score;
}

function minimax(g, depth, alpha, beta, maximizing) {
  if (depth === 0 || g.isGameOver()) return evaluate(g);
  const moves = g.moves({ verbose:true });
  moves.sort((a,b) => (b.captured ? vals[b.captured] : 0) - (a.captured ? vals[a.captured] : 0));
  if (maximizing) {
    let best = -Infinity;
    for (const m of moves) {
      g.move(m); best = Math.max(best, minimax(g,depth-1,alpha,beta,false)); g.undo();
      alpha = Math.max(alpha,best); if (beta <= alpha) break;
    }
    return best;
  }
  let best = Infinity;
  for (const m of moves) {
    g.move(m); best = Math.min(best, minimax(g,depth-1,alpha,beta,true)); g.undo();
    beta = Math.min(beta,best); if (beta <= alpha) break;
  }
  return best;
}

function computerMove() {
  if (mode !== 'ai' || game.turn() !== 'b' || game.isGameOver()) return;
  busy = true; updateInfo();
  const moves = game.moves({ verbose:true });
  let best = Infinity, chosen = moves[0];
  for (const m of moves) {
    game.move(m);
    const score = minimax(game,1,-Infinity,Infinity,true);
    game.undo();
    if (score < best) { best=score; chosen=m; }
  }
  game.move({ from:chosen.from, to:chosen.to, promotion:chosen.promotion });
  busy = false; selected = null; render();
}

function newGame() {
  game = new Chess(); selected = null; promotion = null; busy = false;
  $('promotion').classList.remove('show'); render();
}
$('localMode').onclick = () => { mode='local'; $('localMode').classList.add('active'); $('aiMode').classList.remove('active'); newGame(); };
$('aiMode').onclick = () => { mode='ai'; $('aiMode').classList.add('active'); $('localMode').classList.remove('active'); newGame(); };
$('restart').onclick = newGame;
$('undo').onclick = () => {
  if (busy) return;
  game.undo();
  if (mode === 'ai' && game.turn() === 'b') game.undo();
  selected = null; render();
};
render();