// input.js — keyboard + mouse. Holds the currently-down keys, the mouse position
// in logical (1280x720) coordinates, and a "tapped" set of keys pressed since
// the last frame so the main loop can catch single presses (Space, P, N, R,
// M, C) without them repeating while held.

export class Input {
  constructor(canvas) {
    this.canvas = canvas;
    this.keys = new Set(); // e.code values currently held
    this.tapped = new Set(); // e.code values pressed since last consume()
    this.mouse = { x: 640, y: 360 }; // logical coords, centre by default
    this.onTap = null; // optional callback(code) for press-time actions
    this.onClick = null; // optional callback() for canvas clicks

    window.addEventListener('keydown', (e) => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) {
        e.preventDefault();
      }
      if (!e.repeat) {
        this.tapped.add(e.code);
        if (this.onTap) this.onTap(e.code);
      }
      this.keys.add(e.code);
    });
    window.addEventListener('keyup', (e) => {
      this.keys.delete(e.code);
    });
    window.addEventListener('blur', () => {
      this.keys.clear();
    });
    canvas.addEventListener('mousemove', (e) => {
      this.mouse = this.toLogical(e.clientX, e.clientY);
    });
    canvas.addEventListener('mousedown', (e) => {
      this.mouse = this.toLogical(e.clientX, e.clientY);
      if (this.onClick) this.onClick();
    });
  }

  // Convert a client pixel to logical field coordinates, honouring the
  // letterbox scale the renderer uses.
  toLogical(clientX, clientY) {
    const rect = this.canvas.getBoundingClientRect();
    const scale = Math.min(rect.width / 1280, rect.height / 720);
    const ox = (rect.width - 1280 * scale) / 2;
    const oy = (rect.height - 720 * scale) / 2;
    return {
      x: (clientX - rect.left - ox) / scale,
      y: (clientY - rect.top - oy) / scale,
    };
  }

  down(code) {
    return this.keys.has(code);
  }

  // True if the key was pressed since the last consume() call.
  wasTapped(code) {
    return this.tapped.has(code);
  }

  consume() {
    this.tapped.clear();
  }

  // Movement vector from WASD / arrows, normalised; {x, y} in [-1, 1].
  moveVector() {
    let x = 0;
    let y = 0;
    if (this.down('KeyA') || this.down('ArrowLeft')) x -= 1;
    if (this.down('KeyD') || this.down('ArrowRight')) x += 1;
    if (this.down('KeyW') || this.down('ArrowUp')) y -= 1;
    if (this.down('KeyS') || this.down('ArrowDown')) y += 1;
    if (x !== 0 && y !== 0) {
      const inv = 1 / Math.hypot(x, y);
      x *= inv;
      y *= inv;
    }
    return { x, y };
  }

  get sneaking() {
    return this.down('ShiftLeft') || this.down('ShiftRight');
  }

  get cracking() {
    return this.down('KeyE');
  }
}
