import { vec2 } from 'gl-matrix';
import { Bitmaps, Tile } from '../files/Bitmaps';
import { FlatDef, MapData } from '../files/parsers/parseMap';
import { pointInsidePolygon } from '../helpers/MathHelpers';
import { Level } from './Level';
import { SectorRenderer } from './SectorRenderer';
import { Wall } from './Wall';

export enum FlatFlags {
  Parallaxing,
  Sloped,
  SwapCoords,
  LargeTexture,
  FlipX,
  FlipY,
  AlignToFirstWall
}

interface FlatInfo {
  height: number;
  slope: number;
  tile: Tile;
  flags: boolean[];
  panning: vec2;
  shade: number;
  palette: number;
}

export class Sector {
  public readonly ID: number;

  public readonly walls: Wall[];

  private readonly floor: FlatInfo;

  private readonly ceiling: FlatInfo;

  private readonly renderer: SectorRenderer;

  public constructor(index: number, map: MapData, walls: Wall[]) {
    const def = map.sectors[index];

    // Base params
    this.ID = index;
    this.floor = this.parseFlatInfo(def.floor);
    this.ceiling = this.parseFlatInfo(def.ceiling);

    // Link walls
    this.walls = [];
    for (let i = def.firstWall; i < def.firstWall + def.wallCount; i++) {
      const wall = walls[i];
      wall.sector = this;
      this.walls.push(wall);
    }

    // Make renderer
    this.renderer = new SectorRenderer(this, map);
  }

  public update() {
    this.renderer.update();
  }

  public render() {
    this.renderer.render(false);
  }

  public renderTransparent() {
    this.renderer.render(true);
  }

  public getFloorAt(position: vec2) {
    let height = this.floor.height;
    if (this.floor.slope !== 0) {
      height += this.getSlopeFactor(position) * -this.floor.slope;
    }
    return height;
  }

  public getCeilingAt(position: vec2) {
    let height = this.ceiling.height;
    if (this.ceiling.slope !== 0) {
      height += this.getSlopeFactor(position) * -this.ceiling.slope;
    }
    return height;
  }

  public getPortals() {
    return this.renderer.portals;
  }

  public isInside(point: vec2) {
    return pointInsidePolygon(
      point,
      this.walls.map((wall) => [wall.start, wall.end])
    );
  }

  public getFloorInfo() {
    return this.floor;
  }

  public getCeilingInfo() {
    return this.ceiling;
  }

  public getFloorUV(point: vec2) {
    const uv: vec2 = vec2.clone(point);
    const panX = this.floor.panning[0];
    const panY = this.floor.panning[1];
    const divX = this.floor.tile.width;
    const divY = this.floor.tile.height;
    if (this.floor.flags[FlatFlags.SwapCoords]) {
      [uv[0], uv[1]] = [uv[1], uv[0]];
      uv[0] *= -1;
    }
    if (this.floor.flags[FlatFlags.AlignToFirstWall]) {
      const angle = Math.atan2(this.walls[0].normal[1], this.walls[0].normal[0]);
      vec2.sub(uv, uv, this.walls[0].start);
      vec2.rotate(uv, uv, [0, 0], -angle + Math.PI * 0.5);
      if (this.floor.slope !== 0) {
        uv[1] = Math.hypot(uv[1], uv[1] * Math.abs(this.floor.slope));
      }
    } else {
      uv[1] *= -1;
    }
    if (this.floor.flags[FlatFlags.FlipX]) {
      uv[0] *= -1;
    }
    if (this.floor.flags[FlatFlags.FlipY]) {
      uv[1] *= -1;
    }
    uv[0] = ((uv[0] / 1.024) * 64) / divX + panX / 255;
    uv[1] = ((uv[1] / 1.024) * 64) / divY + panY / 255;

    if (this.floor.flags[FlatFlags.LargeTexture]) {
      vec2.scale(uv, uv, 2);
    }

    return uv;
  }

  public getCeilingUV(point: vec2) {
    const uv: vec2 = vec2.clone(point);
    const panX = this.ceiling.panning[0];
    const panY = this.ceiling.panning[1];
    const divX = this.ceiling.tile.width;
    const divY = this.ceiling.tile.height;
    if (this.ceiling.flags[FlatFlags.SwapCoords]) {
      [uv[0], uv[1]] = [uv[1], uv[0]];
      uv[0] *= -1;
    }
    if (this.ceiling.flags[FlatFlags.AlignToFirstWall]) {
      const angle = Math.atan2(this.walls[0].normal[1], this.walls[0].normal[0]);
      vec2.sub(uv, uv, this.walls[0].start);
      vec2.rotate(uv, uv, [0, 0], -angle + Math.PI * 0.5);
      if (this.ceiling.slope !== 0) {
        uv[1] = Math.hypot(uv[1], uv[1] * Math.abs(this.ceiling.slope));
      }
    } else {
      uv[1] *= -1;
    }
    if (this.ceiling.flags[FlatFlags.FlipX]) {
      uv[0] *= -1;
    }
    if (this.ceiling.flags[FlatFlags.FlipY]) {
      uv[1] *= -1;
    }
    uv[0] = ((uv[0] / 1.024) * 64) / divX + panX / 255;
    uv[1] = ((uv[1] / 1.024) * 64) / divY + panY / 255;

    if (this.ceiling.flags[FlatFlags.LargeTexture]) {
      vec2.scale(uv, uv, 2);
    }

    return uv;
  }

  private parseFlatInfo(def: FlatDef): FlatInfo {
    const tile = Bitmaps.get(def.texture)!;
    const flags: boolean[] = [];
    for (let i = 0; i < 16; i++) {
      flags.push(((def.flags >> i) & 1) > 0);
    }
    return {
      height: (-def.height / 16) * Level.SCALE,
      slope: flags[FlatFlags.Sloped] ? def.slope / 4096 : 0,
      flags,
      tile,
      panning: vec2.clone(def.panning),
      shade: def.shade,
      palette: def.paletteLookup
    };
  }

  private getSlopeFactor(position: vec2) {
    const firstWall = this.walls[0];
    const tempPos = vec2.clone(position);
    vec2.sub(tempPos, tempPos, firstWall.start);
    return vec2.dot(firstWall.normal, tempPos);
  }
}
