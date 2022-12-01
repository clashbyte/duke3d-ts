import { vec2, vec3 } from 'gl-matrix';
import { Bitmaps, Tile } from '../files/Bitmaps';
import { MapData } from '../files/parsers/parseMap';
import { Level } from './Level';
import { Sector } from './Sector';

export enum WallFlags {
  Solid,
  BottomSwapped,
  BottomAlign,
  FlipX,
  Masking,
  OneWay,
  Blocking,
  Transparent,
  FlipY,
  InverseTransparent
}

export class Wall {
  private static readonly PIXELS_IN_REPEAT = 8;

  private static readonly PIXELS_IN_HUNIT = this.PIXELS_IN_REPEAT / 1024;

  /**
   * Wall ID in main list
   * @type {number}
   */
  public readonly ID: number;

  /**
   * Wall flags
   * @type {boolean[]}
   */
  public readonly flags: boolean[];

  /**
   * Assigned texture
   * @type {Tile}
   */
  public texture: Tile | null = null;

  /**
   * Masking texture
   * @type {Tile | null}
   */
  public maskTexture: Tile | null = null;

  public palette: number = 0;

  public shade: number = 0;

  /**
   * First point
   * @type {vec2}
   */
  public start: vec2;

  /**
   * Second point
   * @type {vec2}
   */
  public end: vec2;

  /**
   * Wall normal
   * @type {vec2}
   */
  public readonly normal: vec2;

  /**
   * Owner sector
   * @type {Sector | null}
   */
  public sector: Sector | null = null;

  /**
   * Opposite wall, if any
   * @type {Wall | null}
   */
  public otherWall: Wall | null = null;

  /**
   * Sector on opposite side of wall
   * @type {Sector | null}
   */
  public otherSector: Sector | null = null;

  /**
   * Texture shift
   * @type {vec2}
   * @private
   */
  private textureShift: vec2;

  /**
   * Texture scale
   * @type {vec2}
   * @private
   */
  private textureScale: vec2;

  /**
   * Create wall instance
   * @param {number} index
   * @param {MapData} map
   */
  public constructor(index: number, map: MapData) {
    // Base fields
    const def = map.walls[index];
    const nextDef = map.walls[def.nextWall];
    this.ID = index;
    this.palette = def.paletteLookup;
    this.shade = def.shade;
    if (def.texture !== -1) {
      this.texture = Bitmaps.get(def.texture);
    }
    if (def.maskTexture !== -1) {
      this.maskTexture = Bitmaps.get(def.maskTexture);
    }

    // Coords for vertices
    this.start = [0, 0];
    this.end = [0, 0];
    vec2.scale(this.start, def.start, Level.SCALE);
    vec2.scale(this.end, nextDef.start, Level.SCALE);

    // Calculate normal
    this.normal = [0, 0];
    const tempNormal: vec2 = [0, 0];
    vec2.sub(tempNormal, this.end, this.start);
    vec2.normalize(this.normal, [-tempNormal[1], tempNormal[0]]);

    // Texture size
    this.textureShift = [0, 0];
    this.textureScale = [0, 0];
    vec2.copy(this.textureShift, def.panning);
    vec2.copy(this.textureScale, def.repeat);

    // Flags
    this.flags = [];
    for (let i = 0; i < 15; i++) {
      this.flags.push(((def.flags >> i) & 1) > 0);
    }
  }

  public getUV(point: vec3, tile: Tile | null, lowerGap: boolean = false) {
    if (!tile || !this.sector) {
      return [0, 0];
    }

    // Check alignment
    const portalWall = this.otherSector !== null;
    const alignToFloor = this.flags[WallFlags.BottomAlign];
    let originY = this.sector.getCeilingInfo().height;
    if (portalWall) {
      if (!alignToFloor) {
        if (lowerGap) {
          originY = this.otherSector!.getFloorInfo().height;
        } else {
          originY = this.otherSector!.getCeilingInfo().height;
        }
      }
    } else {
      if (alignToFloor) {
        originY = this.sector.getFloorInfo().height;
      }
    }

    // Calculating X coordinate
    const unitsX = Math.hypot(this.end[0] - this.start[0], this.end[1] - this.start[1]);
    const pixelsX = Wall.PIXELS_IN_REPEAT * this.textureScale[0];
    let posX = Math.hypot(point[0] - this.start[0], point[2] - this.start[1]);
    if (this.flags[WallFlags.FlipX]) {
      posX = unitsX - posX;
    }
    const x = (posX / unitsX) * (pixelsX / tile.width);

    // Calculating Y coordinate
    const spanY = (originY - point[1]) / Level.SCALE;
    const pixelsY = spanY * this.textureScale[1] * Wall.PIXELS_IN_HUNIT;
    let y = pixelsY / tile.height;
    if (this.flags[WallFlags.FlipY]) {
      y = 1.0 - y;
    }

    // Calculating shifts
    const offX = this.textureShift[0] / tile.width;
    const offY = this.textureShift[1] / 255;

    return [x + offX, y + offY];
  }
}
