export const CONFIG = Object.freeze({
  durationMs: 30_000,
  targetScore: 14,
  startLives: 3,
  spawnEveryMs: 520,
  playerRadius: 31,
  coreChance: 0.76,
});

export function createGame(width = 390, height = 700, seed = 0x5eed1234) {
  return {
    width,
    height,
    seed: seed >>> 0,
    phase: 'ready',
    score: 0,
    combo: 0,
    lives: CONFIG.startLives,
    timeLeftMs: CONFIG.durationMs,
    spawnAccumulatorMs: 0,
    nextItemId: 1,
    endReason: null,
    lastEvent: null,
    player: {
      x: width / 2,
      y: height - 88,
      radius: CONFIG.playerRadius,
    },
    items: [],
  };
}

export function startGame(game) {
  game.phase = 'playing';
  game.endReason = null;
  game.lastEvent = null;
  return game;
}

export function movePlayer(game, x) {
  const radius = game.player.radius;
  game.player.x = clamp(x, radius, game.width - radius);
  return game.player.x;
}

export function addItem(game, item) {
  game.items.push({
    id: item.id ?? game.nextItemId++,
    type: item.type,
    x: item.x,
    y: item.y,
    radius: item.radius ?? 15,
    speed: item.speed ?? 190,
    rotation: item.rotation ?? 0,
  });
}

export function stepGame(game, deltaMs, inputX = game.player.x) {
  if (game.phase !== 'playing') return game;

  const safeDelta = clamp(Number.isFinite(deltaMs) ? deltaMs : 0, 0, 100);
  movePlayer(game, inputX);
  game.lastEvent = null;
  game.timeLeftMs = Math.max(0, game.timeLeftMs - safeDelta);
  game.spawnAccumulatorMs += safeDelta;

  while (game.spawnAccumulatorMs >= CONFIG.spawnEveryMs) {
    game.spawnAccumulatorMs -= CONFIG.spawnEveryMs;
    spawnItem(game);
  }

  for (const item of game.items) {
    item.y += item.speed * (safeDelta / 1000);
    item.rotation += safeDelta * 0.003;
  }

  const remaining = [];
  for (const item of game.items) {
    if (collides(game.player, item)) {
      resolveCollision(game, item);
      if (game.phase !== 'playing') break;
    } else if (item.y <= game.height + item.radius * 2) {
      remaining.push(item);
    }
  }
  game.items = game.phase === 'playing' ? remaining : [];

  if (game.phase === 'playing' && game.timeLeftMs <= 0) {
    game.phase = game.score >= CONFIG.targetScore ? 'won' : 'lost';
    game.endReason = game.phase === 'won' ? 'target' : 'time';
    game.items = [];
  }
  return game;
}

function spawnItem(game) {
  const typeRoll = random(game);
  const xRoll = random(game);
  const speedRoll = random(game);
  const radius = typeRoll < CONFIG.coreChance ? 14 : 17;
  addItem(game, {
    type: typeRoll < CONFIG.coreChance ? 'core' : 'mine',
    x: radius + 12 + xRoll * (game.width - (radius + 12) * 2),
    y: -radius - 8,
    radius,
    speed: 175 + speedRoll * 105,
    rotation: xRoll * Math.PI * 2,
  });
}

function resolveCollision(game, item) {
  if (item.type === 'core') {
    game.score += 1;
    game.combo += 1;
    game.lastEvent = { type: 'core', x: item.x, y: item.y, combo: game.combo };
    if (game.score >= CONFIG.targetScore) {
      game.phase = 'won';
      game.endReason = 'target';
    }
    return;
  }

  game.lives -= 1;
  game.combo = 0;
  game.lastEvent = { type: 'mine', x: item.x, y: item.y, lives: game.lives };
  if (game.lives <= 0) {
    game.phase = 'lost';
    game.endReason = 'lives';
  }
}

function collides(player, item) {
  const dx = player.x - item.x;
  const dy = player.y - item.y;
  const radius = player.radius + item.radius;
  return dx * dx + dy * dy <= radius * radius;
}

function random(game) {
  game.seed = (Math.imul(1664525, game.seed) + 1013904223) >>> 0;
  return game.seed / 0x1_0000_0000;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}
