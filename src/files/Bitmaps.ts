import { GL } from '../core/Bootstrap';
import { assert } from '../helpers/Assert';
import { splitBits } from '../helpers/BitSplit';
import { GroupArchive } from './GroupArchive';
import { Palette } from './Palette';

type TileFrame = Uint8Array;

export enum TileAnimationType {
  None,
  PingPong,
  Forward,
  Backward
}

export interface Tile {
  ID: number;
  width: number;
  height: number;
  centerX: number;
  centerY: number;
  animationType: TileAnimationType;
  animationSpeed: number;
  image: TileFrame;
  texture: WebGLTexture | null;
}

export class Bitmaps {
  private static tiles: (Tile | null)[] = [];

  /**
   * Load all bitmaps
   */
  public static init() {
    this.tiles = [];
    const prefix = GroupArchive.getTilesetPrefix();
    for (let i = 0; i < 1000; i++) {
      const fileName = `${prefix}${i.toString().padStart(3, '0')}.art`.toUpperCase();
      if (!GroupArchive.has(fileName)) break;
      this.parseTileset(fileName);
    }
  }

  /**
   * Precache tile for WebGL
   * @param {number} index
   */
  public static cacheTile(index: number) {
    const tile = this.tiles[index];
    if (tile && !tile.texture) {
      tile.texture = GL.createTexture()!;
      GL.bindTexture(GL.TEXTURE_2D, tile.texture);
      GL.texParameteri(GL.TEXTURE_2D, GL.TEXTURE_WRAP_S, GL.REPEAT);
      GL.texParameteri(GL.TEXTURE_2D, GL.TEXTURE_WRAP_T, GL.REPEAT);
      GL.texParameteri(GL.TEXTURE_2D, GL.TEXTURE_MIN_FILTER, GL.NEAREST);
      GL.texParameteri(GL.TEXTURE_2D, GL.TEXTURE_MAG_FILTER, GL.NEAREST);
      GL.pixelStorei(GL.UNPACK_ALIGNMENT, 1);
      GL.texImage2D(GL.TEXTURE_2D, 0, GL.R8, tile.width, tile.height, 0, GL.RED, GL.UNSIGNED_BYTE, tile.image);
      GL.bindTexture(GL.TEXTURE_2D, null);
    }
  }

  /**
   * Fetch tile entry
   * @param {number} index
   */
  public static get(index: number) {
    const tile = this.tiles[index];
    if (tile) {
      if (!tile.texture) {
        this.cacheTile(index);
      }
      return tile;
    }
    return null;
  }

  /**
   * Fetch tile texture
   * @param {number} index
   */
  public static getTexture(index: number) {
    const tile = this.tiles[index];
    if (tile) {
      if (!tile.texture) {
        this.cacheTile(index);
      }
      return tile.texture;
    }
    return null;
  }

  /**
   * Decode single tileset file
   * @param {string} fileName
   * @private
   */
  private static parseTileset(fileName: string) {
    const f = GroupArchive.getReader(fileName);
    assert(f.readInt() === 1, `Wrong version in ${fileName}`);

    f.position += 4;
    const tileStart = f.readInt();
    const tileEnd = f.readInt();
    const tileWidth: number[] = [];
    const tileHeight: number[] = [];
    const tileConfig: number[] = [];
    const count = tileEnd - tileStart + 1;

    for (let i = 0; i < count; i++) tileWidth[i] = f.readShort();
    for (let i = 0; i < count; i++) tileHeight[i] = f.readShort();
    for (let i = 0; i < count; i++) tileConfig[i] = f.readInt();
    for (let i = 0; i < count; i++) {
      const [, animType, offX, offY, animSpeed] = splitBits(tileConfig[i], 6, 2, -8, -8, 4);
      let data = new Uint8Array(tileWidth[i] * tileHeight[i]);
      if (tileWidth[i] > 0 && tileHeight[i] > 0) {
        data = this.transformTile(f.readBytes(tileWidth[i] * tileHeight[i]), tileWidth[i], tileHeight[i]);
      }
      this.tiles[i + tileStart] = {
        ID: i + tileStart,
        width: tileWidth[i],
        height: tileHeight[i],
        centerX: tileWidth[i] / 2 + offX,
        centerY: tileHeight[i] / 2 + offY,
        animationType: animType,
        animationSpeed: animSpeed,
        image: data,
        texture: null
      };
    }
  }

  /**
   * Transposing pixel index
   * @param {Uint8Array} data
   * @param {number} width
   * @param {number} height
   * @returns {Uint8Array}
   * @private
   */
  private static transformTile(data: Uint8Array, width: number, height: number) {
    const out = new Uint8Array(data.length);
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        out[y * width + x] = data[x * height + y];
      }
    }
    return out;
  }

  /**
   * Debug single tile on canvas
   * @param {number} index
   * @param shade
   * @private
   */
  public static debugTile(index: number, shade: number = 0) {
    const tile = this.tiles[index];
    if (!tile || !tile.image) return;

    const canvas = document.createElement('canvas');
    canvas.style.position = 'relative';
    canvas.style.width = `${tile.width * 4}px`;
    canvas.style.height = `${tile.height * 4}px`;
    canvas.style.background = `#555`;
    canvas.width = tile.width;
    canvas.height = tile.height;
    canvas.style.imageRendering = 'pixelated';
    document.body.append(canvas);

    const g = canvas.getContext('2d')!;
    const data = g.getImageData(0, 0, tile.width, tile.height);
    for (let i = 0; i < tile.image.length; i++) {
      const color = Palette.get(tile.image[i], shade);
      data.data[i * 4 + 0] = color.fR;
      data.data[i * 4 + 1] = color.fG;
      data.data[i * 4 + 2] = color.fB;
      data.data[i * 4 + 3] = tile.image[i] === 255 ? 0 : 255;
    }
    g.putImageData(data, 0, 0);
  }
}
