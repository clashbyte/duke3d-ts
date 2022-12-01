import { GL } from '../core/Bootstrap';
import { GroupArchive } from './GroupArchive';

interface Color {
  r: number;
  g: number;
  b: number;
  fR: number;
  fG: number;
  fB: number;
}

/**
 * Artwork palette container
 */
export class Palette {
  /**
   * Raw colors lookup
   * @type {Color[]}
   * @private
   */
  private static colors: Color[] = [];

  /**
   * Color shade table
   * @type {number[][]}
   * @private
   */
  private static colorShades: number[][] = [];

  /**
   * Palette swaps
   * @type {number[][]}
   * @private
   */
  private static paletteSwaps: number[][] = [];

  /**
   * WebGL texture list with color on X and shade on Y
   * @type {WebGLTexture}
   * @private
   */
  private static paletteTextures: WebGLTexture[];

  /**
   * Initialize palette lookups
   */
  public static init() {
    // Read palette and shades
    this.readBasePalette();
    this.readPaletteRemaps();

    // Generate texture data
    this.paletteTextures = [];
    const pixels = new Uint8Array(this.colors.length * this.colorShades.length * 4);
    for (let swap = 0; swap < this.paletteSwaps.length; swap++) {
      let pix = 0;
      for (const shadeTable of this.colorShades) {
        for (let idx = 0; idx < 256; idx++) {
          let colorID = idx;
          if (this.paletteSwaps[swap]) {
            colorID = this.paletteSwaps[swap][colorID];
          }
          const color = this.colors[shadeTable[colorID]];
          pixels[pix] = color.fR;
          pixels[pix + 1] = color.fG;
          pixels[pix + 2] = color.fB;
          pixels[pix + 3] = idx === 255 ? 0 : 255;
          pix += 4;
        }
      }

      // Generate texture
      const tex = GL.createTexture()!;
      GL.bindTexture(GL.TEXTURE_2D, tex);
      GL.texParameteri(GL.TEXTURE_2D, GL.TEXTURE_MIN_FILTER, GL.NEAREST);
      GL.texParameteri(GL.TEXTURE_2D, GL.TEXTURE_MAG_FILTER, GL.NEAREST);
      GL.texParameteri(GL.TEXTURE_2D, GL.TEXTURE_WRAP_S, GL.CLAMP_TO_EDGE);
      GL.texParameteri(GL.TEXTURE_2D, GL.TEXTURE_WRAP_T, GL.CLAMP_TO_EDGE);
      GL.texImage2D(
        GL.TEXTURE_2D,
        0,
        GL.RGBA,
        this.colors.length,
        this.colorShades.length,
        0,
        GL.RGBA,
        GL.UNSIGNED_BYTE,
        pixels
      );
      GL.bindTexture(GL.TEXTURE_2D, null);
      this.paletteTextures.push(tex);
    }
  }

  /**
   * Get specific color, affected by shade
   * @param {number} index
   * @param {number} shade
   * @returns {Color}
   */
  public static get(index: number, shade: number = 0) {
    return this.colors[this.colorShades[shade][index]];
  }

  /**
   * Get palette texture
   * @returns {WebGLTexture}
   */
  public static getTexture(index: number = 0) {
    return this.paletteTextures[index];
  }

  /**
   * Read main palette info
   * @private
   */
  private static readBasePalette() {
    const f = GroupArchive.getReader('PALETTE.DAT');

    // Reading raw palette colors
    this.colors = [];
    for (let i = 0; i < 256; i++) {
      const r = f.readByte() / 63;
      const g = f.readByte() / 63;
      const b = f.readByte() / 63;
      this.colors.push({
        r,
        g,
        b,
        fR: Math.ceil(r * 255.0),
        fG: Math.ceil(g * 255.0),
        fB: Math.ceil(b * 255.0)
      });
    }

    // Reading shades
    this.colorShades = [];
    const numLookups = f.readShort();
    for (let i = 0; i < numLookups; i++) {
      const lookup: number[] = [];
      for (let j = 0; j < this.colors.length; j++) {
        lookup.push(f.readByte());
      }
      this.colorShades.push(lookup);
    }
  }

  /**
   * Read all non-default palettes
   * @private
   */
  private static readPaletteRemaps() {
    const f = GroupArchive.getReader('LOOKUP.DAT');

    // Reading swaps
    this.paletteSwaps = [];
    const swapCount = f.readByte();
    for (let i = 0; i < swapCount; i++) {
      const index = f.readByte();
      this.paletteSwaps[index] = Array.from(f.readBytes(256));
    }
  }
}
