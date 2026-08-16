import { CONFIG, createGame, startGame, stepGame } from './game-core.js';

const LOGICAL_WIDTH = 390;
const LOGICAL_HEIGHT = 700;
const canvas = document.querySelector('#game');
const ctx = canvas.getContext('2d', { alpha: false });
const shell = document.querySelector('#gameShell');
const startScreen = document.querySelector('#startScreen');
const endScreen = document.querySelector('#endScreen');
const hud = document.querySelector('#hud');
const progress = document.querySelector('#progress');
const tip = document.querySelector('#tip');
const scoreNode = document.querySelector('#score');
const timeNode = document.querySelector('#time');
const livesNode = document.querySelector('#lives');
const progressFill = document.querySelector('#progressFill');
const endTitle = document.querySelector('#endTitle');
const endEyebrow = document.querySelector('#endEyebrow');
const endScore = document.querySelector('#endScore');
const replayButton = document.querySelector('#replayButton');

let game = createGame(LOGICAL_WIDTH, LOGICAL_HEIGHT);
let desiredX = game.player.x;
let previousTime = performance.now();
let particles = [];
let shake = 0;
let eventToken = null;
let ctaClicks = 0;

function resizeBackingStore() {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.round(LOGICAL_WIDTH * dpr);
  canvas.height = Math.round(LOGICAL_HEIGHT * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

function begin() {
  game = startGame(createGame(LOGICAL_WIDTH, LOGICAL_HEIGHT, Date.now() >>> 0));
  desiredX = game.player.x;
  particles = [];
  shake = 0;
  eventToken = null;
  startScreen.hidden = true;
  endScreen.hidden = true;
  hud.hidden = false;
  progress.hidden = false;
  tip.hidden = false;
  previousTime = performance.now();
  updateHud();
}

function finish() {
  if (!endScreen.hidden) return;
  const won = game.phase === 'won';
  endEyebrow.textContent = won ? 'Mission complete' : 'Transmission interrupted';
  endTitle.textContent = won ? 'CORE SECURED' : 'SIGNAL LOST';
  endScore.textContent = String(game.score);
  replayButton.textContent = won ? 'Replay' : 'Try again';
  endScreen.hidden = false;
  tip.hidden = true;
}

function pointerToGameX(event) {
  const rect = canvas.getBoundingClientRect();
  return ((event.clientX - rect.left) / rect.width) * LOGICAL_WIDTH;
}

function handlePointer(event) {
  if (game.phase !== 'playing') return;
  desiredX = pointerToGameX(event);
  tip.hidden = true;
  if (event.cancelable) event.preventDefault();
}

canvas.addEventListener('pointerdown', event => {
  canvas.setPointerCapture?.(event.pointerId);
  handlePointer(event);
});
canvas.addEventListener('pointermove', event => {
  if (event.buttons || event.pointerType === 'touch') handlePointer(event);
});
canvas.addEventListener('pointerup', handlePointer);

document.querySelector('#startButton').addEventListener('click', begin);
replayButton.addEventListener('click', begin);
document.querySelector('#ctaButton').addEventListener('click', () => {
  ctaClicks += 1;
  document.querySelector('#ctaButton').textContent = 'WISHLISTED ✓';
});

function frame(now) {
  const delta = Math.min(50, now - previousTime);
  previousTime = now;

  if (game.phase === 'playing') {
    stepGame(game, delta, desiredX);
    consumeEvent();
    updateHud();
    if (game.phase !== 'playing') finish();
  }
  updateParticles(delta);
  render(now);
  requestAnimationFrame(frame);
}

function consumeEvent() {
  if (!game.lastEvent || game.lastEvent === eventToken) return;
  eventToken = game.lastEvent;
  const good = game.lastEvent.type === 'core';
  burst(game.lastEvent.x, game.lastEvent.y, good ? '#57f6ff' : '#ff3d92', good ? 18 : 30);
  if (!good) shake = 12;
}

function burst(x, y, color, count) {
  for (let index = 0; index < count; index += 1) {
    const angle = (Math.PI * 2 * index) / count + Math.random() * .35;
    const speed = 45 + Math.random() * 145;
    particles.push({
      x, y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 420 + Math.random() * 380,
      maxLife: 800,
      color,
      size: 1.5 + Math.random() * 3.5,
    });
  }
}

function updateParticles(delta) {
  for (const particle of particles) {
    particle.life -= delta;
    particle.x += particle.vx * delta / 1000;
    particle.y += particle.vy * delta / 1000;
    particle.vx *= .985;
    particle.vy = particle.vy * .985 + 12 * delta / 1000;
  }
  particles = particles.filter(particle => particle.life > 0);
  shake *= .84;
}

function updateHud() {
  scoreNode.textContent = `${game.score}/${CONFIG.targetScore}`;
  timeNode.textContent = String(Math.ceil(game.timeLeftMs / 1000));
  livesNode.textContent = '◆'.repeat(game.lives) + '◇'.repeat(CONFIG.startLives - game.lives);
  progressFill.style.width = `${Math.min(100, game.score / CONFIG.targetScore * 100)}%`;
}

function render(now) {
  ctx.save();
  if (shake > .2) ctx.translate((Math.random() - .5) * shake, (Math.random() - .5) * shake);
  drawBackground(now);
  drawField(now);
  for (const item of game.items) drawItem(item, now);
  drawParticles();
  drawPlayer(now);
  drawVignette();
  ctx.restore();
}

function drawBackground(now) {
  const gradient = ctx.createLinearGradient(0, 0, 0, LOGICAL_HEIGHT);
  gradient.addColorStop(0, '#0d1231');
  gradient.addColorStop(.48, '#080b20');
  gradient.addColorStop(1, '#03040d');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, LOGICAL_WIDTH, LOGICAL_HEIGHT);

  const glow = ctx.createRadialGradient(195, 170, 0, 195, 170, 270);
  glow.addColorStop(0, 'rgba(91,56,220,.21)');
  glow.addColorStop(1, 'rgba(91,56,220,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, LOGICAL_WIDTH, 500);

  ctx.save();
  ctx.globalAlpha = .15;
  ctx.strokeStyle = '#6be8ff';
  ctx.lineWidth = .6;
  const offset = (now * .015) % 34;
  for (let y = -34 + offset; y < LOGICAL_HEIGHT; y += 34) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(LOGICAL_WIDTH, y); ctx.stroke();
  }
  for (let x = 0; x <= LOGICAL_WIDTH; x += 39) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, LOGICAL_HEIGHT); ctx.stroke();
  }
  ctx.restore();

  for (let index = 0; index < 42; index += 1) {
    const x = (index * 83.13) % LOGICAL_WIDTH;
    const y = (index * 151.7 + now * (.004 + (index % 4) * .002)) % LOGICAL_HEIGHT;
    ctx.globalAlpha = .18 + (index % 5) * .08;
    ctx.fillStyle = index % 7 === 0 ? '#ad8cff' : '#92f8ff';
    ctx.fillRect(x, y, index % 3 === 0 ? 1.5 : 1, index % 3 === 0 ? 1.5 : 1);
  }
  ctx.globalAlpha = 1;
}

function drawField(now) {
  if (game.phase === 'ready') return;
  const player = game.player;
  ctx.save();
  ctx.translate(player.x, player.y);
  ctx.rotate(Math.sin(now * .0014) * .05);
  for (let ring = 0; ring < 4; ring += 1) {
    ctx.beginPath();
    ctx.strokeStyle = `rgba(87,246,255,${.17 - ring * .025})`;
    ctx.lineWidth = 1;
    ctx.ellipse(0, 0, 48 + ring * 22, 18 + ring * 11, 0, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();
}

function drawPlayer(now) {
  const { x, y, radius } = game.player;
  ctx.save();
  ctx.translate(x, y);
  const pulse = 1 + Math.sin(now * .006) * .035;
  ctx.scale(pulse, pulse);
  ctx.shadowBlur = 28;
  ctx.shadowColor = '#57f6ff';
  ctx.strokeStyle = '#a9fbff';
  ctx.lineWidth = 7;
  ctx.beginPath();
  ctx.arc(0, 0, radius - 5, .15 * Math.PI, .85 * Math.PI);
  ctx.stroke();
  ctx.strokeStyle = '#8b5cff';
  ctx.beginPath();
  ctx.arc(0, 0, radius - 5, 1.15 * Math.PI, 1.85 * Math.PI);
  ctx.stroke();
  ctx.shadowBlur = 12;
  ctx.fillStyle = '#eaffff';
  ctx.beginPath(); ctx.arc(0, 0, 8, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#57f6ff';
  ctx.beginPath(); ctx.arc(0, 0, 3.5, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

function drawItem(item, now) {
  ctx.save();
  ctx.translate(item.x, item.y);
  ctx.rotate(item.rotation);
  const pulse = 1 + Math.sin(now * .009 + item.id) * .09;
  ctx.scale(pulse, pulse);
  if (item.type === 'core') drawCore(item.radius);
  else drawMine(item.radius);
  ctx.restore();
}

function drawCore(radius) {
  ctx.shadowBlur = 24;
  ctx.shadowColor = '#57f6ff';
  ctx.fillStyle = 'rgba(87,246,255,.17)';
  polygon(6, radius + 7, Math.PI / 6); ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = '#8effff';
  ctx.fillStyle = '#163f55';
  polygon(6, radius, Math.PI / 6); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#d9ffff';
  polygon(6, radius * .43, Math.PI / 6); ctx.fill();
}

function drawMine(radius) {
  ctx.shadowBlur = 25;
  ctx.shadowColor = '#ff3d92';
  ctx.fillStyle = 'rgba(255,61,146,.18)';
  polygon(4, radius + 8, Math.PI / 4); ctx.fill();
  ctx.strokeStyle = '#ff74ae';
  ctx.lineWidth = 2;
  ctx.fillStyle = '#541433';
  polygon(4, radius, Math.PI / 4); ctx.fill(); ctx.stroke();
  ctx.strokeStyle = '#ffd0e3';
  ctx.beginPath(); ctx.moveTo(-6, -6); ctx.lineTo(6, 6); ctx.moveTo(6, -6); ctx.lineTo(-6, 6); ctx.stroke();
}

function polygon(sides, radius, rotation = 0) {
  ctx.beginPath();
  for (let index = 0; index < sides; index += 1) {
    const angle = rotation + index / sides * Math.PI * 2;
    const x = Math.cos(angle) * radius;
    const y = Math.sin(angle) * radius;
    if (index === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  }
  ctx.closePath();
}

function drawParticles() {
  for (const particle of particles) {
    ctx.globalAlpha = Math.max(0, particle.life / particle.maxLife);
    ctx.fillStyle = particle.color;
    ctx.shadowBlur = 10;
    ctx.shadowColor = particle.color;
    ctx.beginPath(); ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2); ctx.fill();
  }
  ctx.globalAlpha = 1;
  ctx.shadowBlur = 0;
}

function drawVignette() {
  const vignette = ctx.createRadialGradient(195, 340, 130, 195, 340, 430);
  vignette.addColorStop(0, 'rgba(0,0,0,0)');
  vignette.addColorStop(1, 'rgba(0,0,8,.62)');
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, LOGICAL_WIDTH, LOGICAL_HEIGHT);
}

resizeBackingStore();
window.addEventListener('resize', resizeBackingStore);
window.__playableDebug = {
  phase: () => game.phase,
  playerX: () => game.player.x,
  score: () => game.score,
  ctaClicks: () => ctaClicks,
  forceWin: () => { game.score = CONFIG.targetScore; game.phase = 'won'; game.endReason = 'target'; updateHud(); finish(); },
  forceLose: () => { game.phase = 'lost'; game.endReason = 'lives'; game.lives = 0; updateHud(); finish(); },
};
requestAnimationFrame(frame);
