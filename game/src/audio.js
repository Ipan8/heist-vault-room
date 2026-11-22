// audio.js — every sound is synthesised with WebAudio; the game ships no audio
// files. The context is created lazily on the first user gesture (browsers block
// audio before that) and every method is a safe no-op until it exists or while
// muted, so the game never crashes on a silent machine.

export class SoundBank {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.muted = false;
    this.beepTimer = 0;
    this.lowTickTimer = 0;
  }

  // Call from a keydown / click handler. Safe to call repeatedly.
  unlock() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});
      return;
    }
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.5;
      this.master.connect(this.ctx.destination);
    } catch {
      this.ctx = null;
    }
  }

  setMuted(muted) {
    this.muted = muted;
    if (this.master) this.master.gain.value = muted ? 0 : 0.5;
  }

  // One short tone: oscillator + gain envelope, no files.
  tone(freq, dur, type = 'sine', vol = 0.15, slideTo = null, delay = 0) {
    if (!this.ctx || this.muted || !this.master) return;
    try {
      const t0 = this.ctx.currentTime + delay;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, t0);
      if (slideTo !== null) osc.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), t0 + dur);
      gain.gain.setValueAtTime(0, t0);
      gain.gain.linearRampToValueAtTime(vol, t0 + 0.008);
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      osc.connect(gain);
      gain.connect(this.master);
      osc.start(t0);
      osc.stop(t0 + dur + 0.05);
    } catch {
      // Audio is decoration; never let it break the game.
    }
  }

  // A soft footstep: low thud, quieter while sneaking.
  step(sneaking) {
    this.tone(sneaking ? 120 : 150, 0.07, 'triangle', sneaking ? 0.04 : 0.07, 70);
  }

  // Alarm beep; the interval quickens as the meter fills:
  // max(0.25, 1.1 - alarm/100) seconds between beeps.
  alarmBeep(alarm) {
    this.tone(880, 0.09, 'square', 0.06);
  }

  // Crack tick while E is held on the vault.
  crackTick() {
    this.tone(1200, 0.04, 'square', 0.05);
  }

  // Coin clink when a coin is tossed.
  clink() {
    this.tone(1900, 0.08, 'sine', 0.12, 1400);
    this.tone(2500, 0.12, 'sine', 0.08, null, 0.05);
  }

  // Gem chime on pickup.
  chime() {
    this.tone(1320, 0.12, 'sine', 0.12);
    this.tone(1760, 0.18, 'sine', 0.1, null, 0.07);
  }

  // Vault fanfare when the crack finishes.
  fanfare() {
    const notes = [523, 659, 784, 1047];
    notes.forEach((f, i) => this.tone(f, 0.22, 'triangle', 0.12, null, i * 0.09));
  }

  // Busted sting.
  sting() {
    this.tone(220, 0.5, 'sawtooth', 0.12, 55);
    this.tone(110, 0.6, 'square', 0.08, 55, 0.05);
  }

  // Stage-clear arpeggio.
  arpeggio() {
    const notes = [523, 659, 784, 1047, 1319];
    notes.forEach((f, i) => this.tone(f, 0.2, 'triangle', 0.11, null, i * 0.08));
  }

  // Low tick when under 10 seconds are left on the clock.
  lowTick() {
    this.tone(440, 0.05, 'square', 0.05);
  }

  // Called every frame with the live alarm + clock. Schedules the beeps and
  // the low-time tick so the main loop never thinks about sound timing.
  tick(dt, alarm, timeLeft) {
    if (!this.ctx || this.muted) return;
    if (alarm > 5) {
      this.beepTimer -= dt;
      if (this.beepTimer <= 0) {
        this.alarmBeep(alarm);
        this.beepTimer = Math.max(0.25, 1.1 - alarm / 100);
      }
    } else {
      this.beepTimer = 0;
    }
    if (timeLeft > 0 && timeLeft < 10) {
      this.lowTickTimer -= dt;
      if (this.lowTickTimer <= 0) {
        this.lowTick();
        this.lowTickTimer = 1;
      }
    } else {
      this.lowTickTimer = 0;
    }
  }
}
