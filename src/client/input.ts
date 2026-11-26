// Phone-first controls (GAME_PLAN §2): finger down = engine, drag = steer.
import type { Input } from '../sim/index.ts';

const FULL_LOCK_PX = 60;

export class Controls {
  engine: 0 | 1 = 0;
  steer = 0;
  private anchor = 0;
  private pointer: number | null = null;
  private keys = new Set<string>();
  enabled = false;

  constructor(target: HTMLElement) {
    target.addEventListener('pointerdown', e => {
      if (!this.enabled || this.pointer !== null) return;
      this.pointer = e.pointerId;
      target.setPointerCapture(e.pointerId);
      // Keep the current steer so a new touch does not snap the rudder.
      this.anchor = e.clientX - (this.steer * FULL_LOCK_PX) / 8;
      this.engine = 1;
      e.preventDefault();
    });
    target.addEventListener('pointermove', e => {
      if (e.pointerId !== this.pointer) return;
      this.steer = Math.max(-8, Math.min(8, Math.round(((e.clientX - this.anchor) / FULL_LOCK_PX) * 8)));
    });
    const up = (e: PointerEvent) => {
      if (e.pointerId !== this.pointer) return;
      this.pointer = null;
      this.engine = 0;
    };
    target.addEventListener('pointerup', up);
    target.addEventListener('pointercancel', up);
    addEventListener('keydown', e => { this.keys.add(e.key.toLowerCase()); });
    addEventListener('keyup', e => { this.keys.delete(e.key.toLowerCase()); });
    addEventListener('blur', () => { this.keys.clear(); this.pointer = null; this.engine = 0; });
  }

  reset() { this.engine = 0; this.steer = 0; this.pointer = null; }

  sample(): Input {
    const k = this.keys;
    const keyEngine = k.has('arrowup') || k.has('w') || k.has(' ');
    const left = k.has('arrowleft') || k.has('a'), right = k.has('arrowright') || k.has('d');
    if (left || right) this.steer = left && !right ? -8 : right && !left ? 8 : 0;
    else if (this.pointer === null && (k.size || keyEngine)) this.steer = 0;
    return { engine: this.engine || keyEngine ? 1 : 0, steer: this.steer };
  }
}
