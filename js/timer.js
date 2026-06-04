/**
 * timer.js — 计时器引擎（倒计时/秒表，可暂停）
 */
const Timer = {
  mode: 'countdown',   // 'countdown' | 'stopwatch'
  duration: 60,         // 倒计时总秒数
  remaining: 60,        // 剩余秒数
  elapsed: 0,           // 已过秒数（秒表模式）
  running: false,
  paused: false,
  intervalId: null,
  onTick: null,         // callback(seconds, formatted)
  onEnd: null,          // callback()
  _startTime: 0,
  _pausedRemaining: 0,
  _pausedElapsed: 0
};

Timer.init = function(opts = {}) {
  this.mode = opts.mode || 'countdown';
  this.duration = opts.duration || 60;
  this.remaining = this.duration;
  this.elapsed = 0;
  this.running = false;
  this.paused = false;
  this.onTick = opts.onTick || null;
  this.onEnd = opts.onEnd || null;
  this._pausedRemaining = 0;
  this._pausedElapsed = 0;
};

Timer.start = function() {
  if (this.running) return;
  this.running = true;
  this.paused = false;

  if (this.mode === 'countdown') {
    if (this.remaining <= 0) this.remaining = this.duration;
    this._startTime = Date.now() - (this.duration - this.remaining) * 1000;
  } else {
    this._startTime = Date.now() - this.elapsed * 1000;
  }

  this.intervalId = setInterval(() => this._tick(), 100);
  this._tick();
};

Timer.pause = function() {
  if (!this.running || this.paused) return;
  this.paused = true;
  clearInterval(this.intervalId);
  if (this.mode === 'countdown') {
    this._pausedRemaining = this.remaining;
  } else {
    this._pausedElapsed = this.elapsed;
  }
};

Timer.resume = function() {
  if (!this.running || !this.paused) return;
  this.paused = false;
  if (this.mode === 'countdown') {
    this._startTime = Date.now() - (this.duration - this.remaining) * 1000;
  } else {
    this._startTime = Date.now() - this.elapsed * 1000;
  }
  this.intervalId = setInterval(() => this._tick(), 100);
};

Timer.stop = function() {
  clearInterval(this.intervalId);
  this.running = false;
  this.paused = false;
  this.intervalId = null;
};

Timer.reset = function() {
  this.stop();
  this.remaining = this.duration;
  this.elapsed = 0;
  this._pausedRemaining = 0;
  this._pausedElapsed = 0;
  if (this.onTick) this.onTick(this.mode === 'countdown' ? this.remaining : this.elapsed, this.format());
};

Timer._tick = function() {
  if (this.mode === 'countdown') {
    this.remaining = Math.max(0, this.duration - Math.floor((Date.now() - this._startTime) / 1000));
    if (this.onTick) this.onTick(this.remaining, this.format());
    if (this.remaining <= 0) {
      this.stop();
      if (this.onEnd) this.onEnd();
    }
  } else {
    this.elapsed = Math.floor((Date.now() - this._startTime) / 1000);
    if (this.onTick) this.onTick(this.elapsed, this.format());
  }
};

Timer.togglePause = function() {
  if (!this.running) return;
  if (this.paused) this.resume();
  else this.pause();
};

Timer.setDuration = function(seconds) {
  this.duration = Math.max(1, seconds);
  if (!this.running) {
    this.remaining = this.duration;
    if (this.onTick) this.onTick(this.remaining, this.format());
  }
};

Timer.format = function(seconds) {
  if (seconds == null) seconds = this.mode === 'countdown' ? this.remaining : this.elapsed;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
};

Timer.getSeconds = function() {
  return this.mode === 'countdown' ? this.remaining : this.elapsed;
};

Timer.getTotalElapsed = function() {
  // 从开始到现在的总经过秒数（含暂停时间）
  if (!this.running) return this.elapsed;
  return Math.floor((Date.now() - this._startTime) / 1000);
};

// 播放提示音
Timer.playEndSound = function() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = 800;
    osc.type = 'sine';
    gain.gain.value = 0.3;
    osc.start();
    osc.stop(ctx.currentTime + 0.5);
  } catch (_) {}
};

// 振动
Timer.vibrate = function(pattern = 'short') {
  if (!navigator.vibrate) return;
  if (pattern === 'short') navigator.vibrate(100);
  else if (pattern === 'long') navigator.vibrate([200, 100, 200]);
};

if (typeof window !== 'undefined') {
  window.Timer = Timer;
}
