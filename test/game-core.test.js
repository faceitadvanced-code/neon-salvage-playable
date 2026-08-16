import test from 'node:test';
import assert from 'node:assert/strict';

import {
  CONFIG,
  addItem,
  createGame,
  movePlayer,
  startGame,
  stepGame,
} from '../src/game-core.js';

test('movePlayer clamps the magnet inside the arena', () => {
  const game = createGame(390, 700);

  movePlayer(game, -100);
  assert.equal(game.player.x, game.player.radius);

  movePlayer(game, 1000);
  assert.equal(game.player.x, 390 - game.player.radius);
});

test('collecting a core increases score and combo', () => {
  const game = startGame(createGame(390, 700));
  addItem(game, { type: 'core', x: game.player.x, y: game.player.y, radius: 15, speed: 0 });

  stepGame(game, 16, game.player.x);

  assert.equal(game.score, 1);
  assert.equal(game.combo, 1);
  assert.equal(game.items.length, 0);
  assert.equal(game.lastEvent.type, 'core');
});

test('hitting a mine removes a life and resets combo', () => {
  const game = startGame(createGame(390, 700));
  game.combo = 4;
  addItem(game, { type: 'mine', x: game.player.x, y: game.player.y, radius: 15, speed: 0 });

  stepGame(game, 16, game.player.x);

  assert.equal(game.lives, CONFIG.startLives - 1);
  assert.equal(game.combo, 0);
  assert.equal(game.lastEvent.type, 'mine');
});

test('reaching target score wins immediately', () => {
  const game = startGame(createGame(390, 700));
  game.score = CONFIG.targetScore - 1;
  addItem(game, { type: 'core', x: game.player.x, y: game.player.y, radius: 15, speed: 0 });

  stepGame(game, 16, game.player.x);

  assert.equal(game.phase, 'won');
  assert.equal(game.score, CONFIG.targetScore);
});

test('running out of lives loses immediately', () => {
  const game = startGame(createGame(390, 700));
  game.lives = 1;
  addItem(game, { type: 'mine', x: game.player.x, y: game.player.y, radius: 15, speed: 0 });

  stepGame(game, 16, game.player.x);

  assert.equal(game.phase, 'lost');
  assert.equal(game.endReason, 'lives');
});

test('timer expiry loses if target was not reached', () => {
  const game = startGame(createGame(390, 700));
  game.timeLeftMs = 10;

  stepGame(game, 20, game.player.x);

  assert.equal(game.phase, 'lost');
  assert.equal(game.endReason, 'time');
  assert.equal(game.timeLeftMs, 0);
});

test('same seed produces the same spawned sequence', () => {
  const first = startGame(createGame(390, 700, 12345));
  const second = startGame(createGame(390, 700, 12345));

  stepGame(first, CONFIG.spawnEveryMs, first.player.x);
  stepGame(second, CONFIG.spawnEveryMs, second.player.x);

  assert.deepEqual(first.items, second.items);
});
