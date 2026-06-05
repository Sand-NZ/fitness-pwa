/**
 * timer.js — 秒表计时器（训练用时统计）
 * 精简版：只有秒表，无倒计时、无声音提示
 */
const Timer = {
  elapsed: 0,
  running: false,
  paused: false,
  intervalId: null,
  onTick: null,
  _startTime: 0,
  _pausedElapsed: 0
};

Timer.init = function(opts = {}) {
  this.elapsed = 0;
  this.running = false;
  this.paused = false;
  this.onTick = opts.onTick || function(s, fmt) {
    const el = document.getElementById('timer-display');
    if (el) el.textContent = fmt;
  };
  this._pausedElapsed = 0;
};

Timer.start = function() {
  if (this.running) return;
  this.running = true;
  this.paused = false;
  this._startTime = Date.now() - this.elapsed * 1000;
  this.intervalId = setInterval(() => this._tick(), 200);
  this._tick();
};

Timer.pause = function() {
  if (!this.running || this.paused) return;
  this.paused = true;
  clearInterval(this.intervalId);
  this._pausedElapsed = this.elapsed;
};

Timer.resume = function() {
  if (!this.running || !this.paused) return;
  this.paused = false;
  this._startTime = Date.now() - this.elapsed * 1000;
  this.intervalId = setInterval(() => this._tick(), 200);
};

Timer.stop = function() {
  clearInterval(this.intervalId);
  this.running = false;
  this.paused = false;
  this.intervalId = null;
};

Timer.reset = function() {
  this.stop();
  this.elapsed = 0;
  this._pausedElapsed = 0;
  if (this.onTick) this.onTick(0, this.format(0));
};

Timer._tick = function() {
  this.elapsed = Math.floor((Date.now() - this._startTime) / 1000);
  if (this.onTick) this.onTick(this.elapsed, this.format(this.elapsed));
};

Timer.togglePause = function() {
  if (!this.running) return;
  if (this.paused) this.resume();
  else this.pause();
};

Timer.format = function(s) {
  if (s == null) s = this.elapsed;
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
};

Timer.getSeconds = function() { return this.elapsed; };

if (typeof window !== 'undefined') { window.Timer = Timer; }
