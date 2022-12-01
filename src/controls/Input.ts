import { vec2 } from 'gl-matrix';
import { Audio } from '../core/Audio';

enum KeyState {
  Up,
  Hit,
  Down,
  Release
}

/**
 * Input handling
 */
export class Input {
  /**
   * Flag that mouse can be locked on click
   * @type {boolean}
   * @private
   */
  private static canLock: boolean = false;

  /**
   * Shared canvas element
   * @type {HTMLCanvasElement}
   * @private
   */
  private static canvas: HTMLCanvasElement;

  /**
   * List of all pressed keys
   * @type {{[p: string]: boolean}}
   * @private
   */
  private static keys: { [key: string]: KeyState } = {};

  /**
   * Mouse movement speed
   * @type {vec2}
   * @private
   */
  private static mouseSpeed: vec2 = [0, 0];

  /**
   * Lock pointer
   */
  public static lock() {
    this.canLock = true;
    this.handleClick();
  }

  /**
   * Reset controls state
   */
  public static reset() {
    this.mouseSpeed = [0, 0];
    for (const key in this.keys) {
      switch (this.keys[key]) {
        case KeyState.Hit:
          this.keys[key] = KeyState.Down;
          break;
        case KeyState.Release:
          this.keys[key] = KeyState.Up;
          break;
      }
    }
  }

  /**
   * Get mouse movement speed
   * @returns {vec2}
   */
  public static getMouseSpeed(): vec2 {
    if (document.pointerLockElement === this.canvas && this.canLock) {
      return [this.mouseSpeed[0], this.mouseSpeed[1]];
    }
    return [0, 0];
  }

  /**
   * Get "movement" vector based on pressed keys
   * @returns {vec2}
   */
  public static getMovement(): vec2 {
    let mx = 0;
    let my = 0;
    if (this.canLock) {
      if (this.keyDown('W') || this.keyDown('ArrowUp')) {
        my = -1;
      } else if (this.keyDown('S') || this.keyDown('ArrowDown')) {
        my = 1;
      }
      if (this.keyDown('D') || this.keyDown('ArrowRight')) {
        mx = 1;
      } else if (this.keyDown('A') || this.keyDown('ArrowLeft')) {
        mx = -1;
      }
    }
    return [mx, my];
  }

  /**
   * Is key down
   * @param {string} key
   * @returns {boolean}
   */
  public static keyDown(key: string) {
    const code = this.keyCode(key);
    if (code in this.keys) {
      return [
        KeyState.Hit, //
        KeyState.Down
      ].includes(this.keys[code]);
    }
    return false;
  }

  /**
   * Is key hit
   * @param {string} key
   * @returns {boolean}
   */
  public static keyHit(key: string) {
    const code = this.keyCode(key);
    if (code in this.keys) {
      return this.keys[code] === KeyState.Hit;
    }
    return false;
  }

  /**
   * Is key released
   * @param {string} key
   * @returns {boolean}
   */
  public static keyReleased(key: string) {
    const code = this.keyCode(key);
    if (code in this.keys) {
      return this.keys[code] === KeyState.Release;
    }
    return false;
  }

  /**
   * Bind handlers on window and canvas
   * @param {HTMLCanvasElement} canvas
   */
  public static bind(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.handleClick = this.handleClick.bind(this);
    this.handleMouseMove = this.handleMouseMove.bind(this);
    this.handleKeyDown = this.handleKeyDown.bind(this);
    this.handleKeyUp = this.handleKeyUp.bind(this);
    this.canvas.addEventListener('click', this.handleClick);
    window.addEventListener('mousemove', this.handleMouseMove);
    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('keyup', this.handleKeyUp);
  }

  /**
   * Detach handlers
   */
  public static release() {
    this.canvas.removeEventListener('click', this.handleClick);
    window.removeEventListener('mousemove', this.handleMouseMove);
    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('keyup', this.handleKeyUp);
  }

  /**
   * Mouse click handler
   * @private
   */
  private static handleClick() {
    Audio.init();
    try {
      this.canvas.requestPointerLock();
    } catch (ex) {
      //
    }
  }

  /**
   * Keypress handler
   * @param {KeyboardEvent} e
   * @private
   */
  private static handleKeyDown(e: KeyboardEvent) {
    const code = this.keyCode(e.code);
    if (code in this.keys) {
      const state = this.keys[code];
      if (state === KeyState.Release || state === KeyState.Up) {
        this.keys[code] = KeyState.Hit;
      }
    } else {
      this.keys[code] = KeyState.Hit;
    }
  }

  /**
   * Key release handler
   * @param {KeyboardEvent} e
   * @private
   */
  private static handleKeyUp(e: KeyboardEvent) {
    const code = this.keyCode(e.code);
    if (code in this.keys) {
      this.keys[code] = KeyState.Release;
    }
  }

  /**
   * Get key code
   * @param {string} code
   * @returns {string}
   * @private
   */
  private static keyCode(code: string) {
    return code.replace('Key', '').toLowerCase();
  }

  /**
   * Mouse move event handler
   * @param {MouseEvent} ev
   * @private
   */
  private static handleMouseMove(ev: MouseEvent) {
    this.mouseSpeed = [ev.movementX, ev.movementY];
  }
}
