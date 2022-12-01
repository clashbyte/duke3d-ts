import earcut from 'earcut';
import { vec2, vec3 } from 'gl-matrix';
import { GL } from '../core/Bootstrap';
import { Tile } from '../files/Bitmaps';
import { Palette } from '../files/Palette';
import { MapData } from '../files/parsers/parseMap';
import { polygonWinding } from '../helpers/MathHelpers';
import { Shader } from '../rendering/Shader';
import FragCode from '../shaders/test/test_wall.frag.glsl';
import VertCode from '../shaders/test/test_wall.vert.glsl';
import { Sector } from './Sector';
import { Wall, WallFlags } from './Wall';

interface SurfaceInfo {
  tile: Tile;
  palette: number;
  shade: number;
  parallax?: boolean;
  masking?: boolean;
  transparent?: boolean;
  inverseTransparent?: boolean;
}

interface OffsetSurfaceInfo extends SurfaceInfo {
  startIndex: number;
  indexCount: number;
}

export interface Portal {
  points: vec3[];
  sector: number;
}

export class SectorRenderer {
  private static DEBUG_SECTOR = -1;

  private static shader: Shader;

  public readonly portals: Portal[];

  private readonly sector: Sector;

  private readonly surfaces: OffsetSurfaceInfo[];

  private wallLoops: number[][];

  private meshPositions: number[];

  private meshUVs: number[];

  private meshIndices: number[];

  private positionBuffer: WebGLBuffer;

  private uvBuffer: WebGLBuffer;

  private indexBuffer: WebGLBuffer;

  private dirty: boolean;

  public constructor(sector: Sector, map: MapData) {
    if (!SectorRenderer.shader) {
      SectorRenderer.shader = new Shader(
        FragCode,
        VertCode,
        ['bitmap', 'palette', 'opacity', 'shadeOffset'],
        ['position', 'uv']
      );
    }

    // Base fields
    this.sector = sector;
    this.wallLoops = this.findLoops(map);
    this.surfaces = [];
    this.portals = [];
    this.meshPositions = [];
    this.meshUVs = [];
    this.meshIndices = [];

    // Create buffers
    this.surfaces = [];
    this.positionBuffer = GL.createBuffer()!;
    this.uvBuffer = GL.createBuffer()!;
    this.indexBuffer = GL.createBuffer()!;
    this.dirty = true;
  }

  public update() {
    if (this.dirty) {
      this.triangulate();
    }
  }

  public render(transparent: boolean = false) {
    const posID = SectorRenderer.shader.attribute('position');
    const uvID = SectorRenderer.shader.attribute('uv');
    const textureID = SectorRenderer.shader.uniform('bitmap');
    const paletteID = SectorRenderer.shader.uniform('palette');
    const opacityID = SectorRenderer.shader.uniform('opacity');
    const shadeID = SectorRenderer.shader.uniform('shadeOffset');

    SectorRenderer.shader.bind();
    GL.enableVertexAttribArray(posID);
    GL.bindBuffer(GL.ARRAY_BUFFER, this.positionBuffer);
    GL.vertexAttribPointer(posID, 3, GL.FLOAT, false, 0, 0);
    GL.enableVertexAttribArray(uvID);
    GL.bindBuffer(GL.ARRAY_BUFFER, this.uvBuffer);
    GL.vertexAttribPointer(uvID, 2, GL.FLOAT, false, 0, 0);

    GL.uniform1i(textureID, 0);
    GL.uniform1i(paletteID, 1);
    GL.uniform1f(opacityID, 1);

    GL.bindBuffer(GL.ELEMENT_ARRAY_BUFFER, this.indexBuffer);
    for (const surface of this.surfaces) {
      const surfaceTransparent = surface.transparent || surface.inverseTransparent || surface.masking;
      if (transparent !== surfaceTransparent) continue;

      GL.activeTexture(GL.TEXTURE0);
      GL.bindTexture(GL.TEXTURE_2D, surface.tile.texture);
      GL.activeTexture(GL.TEXTURE1);
      GL.bindTexture(GL.TEXTURE_2D, Palette.getTexture(surface.palette));

      let alpha = 1;
      if (surface.transparent) {
        alpha = 0.6;
      } else if (surface.inverseTransparent) {
        alpha = 0.3;
      }
      GL.uniform1f(opacityID, alpha);
      GL.uniform1f(shadeID, surface.shade);

      GL.drawElements(GL.TRIANGLES, surface.indexCount, GL.UNSIGNED_SHORT, surface.startIndex * 2);
    }

    GL.bindBuffer(GL.ELEMENT_ARRAY_BUFFER, null);
    GL.bindBuffer(GL.ARRAY_BUFFER, null);
    GL.disableVertexAttribArray(posID);
    GL.disableVertexAttribArray(uvID);
    SectorRenderer.shader.unbind();
  }

  private triangulate() {
    this.surfaces.length = 0;
    this.portals.length = 0;
    this.meshPositions.length = 0;
    this.meshUVs.length = 0;
    this.meshIndices.length = 0;

    // Triangulate floor and ceiling
    const flatCoords: number[][] = [];
    const flatHoles: number[] = [];
    for (let i = 0; i < this.wallLoops.length; i++) {
      if (i > 0) {
        flatHoles.push(flatCoords.length);
      }
      flatCoords.push(
        ...this.wallLoops[i].map((idx) => {
          const p = this.sector.walls[idx].start;
          return [p[0], p[1]];
        })
      );
    }
    const flatIndices = earcut(flatCoords.flat(), flatHoles, 2);

    this.makeWalls();
    this.makeFloor(flatCoords as vec2[], flatIndices);
    this.makeCeiling(flatCoords as vec2[], flatIndices);

    // Debug if needed
    if (this.sector.ID === SectorRenderer.DEBUG_SECTOR) {
      this.debugTriangulation(flatIndices);
    }

    // Upload buffers
    GL.bindBuffer(GL.ARRAY_BUFFER, this.positionBuffer);
    GL.bufferData(GL.ARRAY_BUFFER, new Float32Array(this.meshPositions), GL.STATIC_DRAW);
    GL.bindBuffer(GL.ARRAY_BUFFER, this.uvBuffer);
    GL.bufferData(GL.ARRAY_BUFFER, new Float32Array(this.meshUVs), GL.STATIC_DRAW);
    GL.bindBuffer(GL.ARRAY_BUFFER, null);
    GL.bindBuffer(GL.ELEMENT_ARRAY_BUFFER, this.indexBuffer);
    GL.bufferData(GL.ELEMENT_ARRAY_BUFFER, new Uint16Array(this.meshIndices), GL.STATIC_DRAW);
    GL.bindBuffer(GL.ELEMENT_ARRAY_BUFFER, null);

    // Clear temp buffers
    this.meshPositions.length = 0;
    this.meshUVs.length = 0;
    this.meshIndices.length = 0;
    this.dirty = false;
  }

  private makeWalls() {
    for (const wall of this.sector.walls) {
      // Calculate sector vertical offsets
      const floorLeft = this.sector.getFloorAt(wall.start);
      const floorRight = this.sector.getFloorAt(wall.end);
      const ceilLeft = this.sector.getCeilingAt(wall.start);
      const ceilRight = this.sector.getCeilingAt(wall.end);

      if (wall.otherWall && wall.otherSector) {
        // If wall is a portal - we need to make upper and lower gaps
        const otherFloorLeft = wall.otherSector.getFloorAt(wall.start);
        const otherFloorRight = wall.otherSector.getFloorAt(wall.end);
        const otherCeilLeft = wall.otherSector.getCeilingAt(wall.start);
        const otherCeilRight = wall.otherSector.getCeilingAt(wall.end);

        // Make gaps
        this.makeWallSection(wall, wall.texture!, otherCeilLeft, otherCeilRight, ceilLeft, ceilRight, false, true);
        this.makeWallSection(wall, wall.texture!, floorLeft, floorRight, otherFloorLeft, otherFloorRight, true);

        if (wall.flags[WallFlags.Masking]) {
          this.makeWallSection(wall, wall.maskTexture!, otherFloorLeft, otherFloorRight, otherCeilLeft, otherCeilRight);
        } else if (wall.flags[WallFlags.OneWay]) {
          this.makeWallSection(wall, wall.texture!, floorLeft, floorRight, ceilLeft, ceilRight);
        }
      } else {
        // It's a full solid wall
        this.makeWallSection(wall, wall.texture!, floorLeft, floorRight, ceilLeft, ceilRight);
      }
    }
  }

  private makeWallSection(
    wall: Wall,
    tile: Tile,
    floorLeft: number,
    floorRight: number,
    ceilingLeft: number,
    ceilingRight: number,
    lowerGap: boolean = false,
    upperGap: boolean = false
  ) {
    if (floorRight >= ceilingRight && floorLeft >= ceilingLeft) {
      return;
    }
    const l = wall.start;
    const r = wall.end;
    const positions: number[][] = [
      [l[0], ceilingLeft, l[1]], //
      [r[0], ceilingRight, r[1]],
      [l[0], floorLeft, l[1]], //
      [r[0], floorRight, r[1]]
    ];
    const indices = [0, 1, 2, 1, 3, 2];
    let masking = false;
    let transparent = false;
    let invTransparent = false;
    if (!lowerGap && !upperGap) {
      masking = wall.flags[WallFlags.Masking];
      transparent = wall.flags[WallFlags.Transparent];
      invTransparent = wall.flags[WallFlags.InverseTransparent];
    }

    this.addMeshData(
      positions,
      positions.map((pos) => wall.getUV(pos as vec3, tile, lowerGap)),
      indices,
      tile,
      wall.shade,
      wall.palette,
      false,
      masking,
      transparent,
      invTransparent
    );
  }

  private makeFloor(flatCoords: vec2[], flatIndices: number[]) {
    this.addMeshData(
      flatCoords.map((p) => [p[0], this.sector.getFloorAt(p), p[1]]),
      flatCoords.map((p) => {
        const coord = this.sector.getFloorUV(p);
        return [coord[0], coord[1]];
      }),
      flatIndices,
      this.sector.getFloorInfo().tile,
      this.sector.getFloorInfo().shade,
      this.sector.getFloorInfo().palette
    );
  }

  private makeCeiling(flatCoords: vec2[], flatIndices: number[]) {
    const indices = [...flatIndices];
    for (let i = 0; i < indices.length; i += 3) {
      const temp = indices[i + 1];
      indices[i + 1] = indices[i + 2];
      indices[i + 2] = temp;
    }

    this.addMeshData(
      flatCoords.map((p) => [p[0], this.sector.getCeilingAt(p), p[1]]),
      flatCoords.map((p) => {
        const coord = this.sector.getCeilingUV(p);
        return [coord[0], coord[1]];
      }),
      indices,
      this.sector.getCeilingInfo().tile,
      this.sector.getCeilingInfo().shade,
      this.sector.getCeilingInfo().palette
    );
  }

  private addMeshData(
    positions: number[][],
    uvs: number[][],
    indices: number[] | number[][],
    tile: Tile,
    shade: number = 0,
    palette: number = 0,
    parallax: boolean = false,
    masking: boolean = false,
    transparent: boolean = false,
    inverseTransparent: boolean = false
  ) {
    const flatIndices = indices.flat();
    const indexOffset = this.meshPositions.length / 3;
    this.surfaces.push({
      tile,
      parallax,
      startIndex: this.meshIndices.length,
      indexCount: flatIndices.length,
      shade,
      palette,
      masking,
      inverseTransparent,
      transparent
    });

    this.meshPositions.push(...positions.flat());
    this.meshUVs.push(...uvs.flat());
    this.meshIndices.push(...flatIndices.map((idx: number) => idx + indexOffset));
  }

  private findLoops(map: MapData) {
    const def = map.sectors[this.sector.ID];

    // Search for loops
    const wallLoops: number[][] = [];
    const loop = [];
    for (let i = def.firstWall; i < def.firstWall + def.wallCount; i++) {
      loop.push(i - def.firstWall);
      if (map.walls[i].nextWall < i) {
        wallLoops.push([...loop]);
        loop.length = 0;
      }
    }

    // Convert positions
    const loopsCoords: vec2[][] = [];
    for (const wallLoop of wallLoops) {
      loopsCoords.push(wallLoop.map((id) => vec2.clone(map.walls[id + def.firstWall].start)));
    }

    // Correct winding
    if (loopsCoords.length > 1 && !polygonWinding(loopsCoords[0])) {
      for (let i = 1; i < loopsCoords.length; i++) {
        if (polygonWinding(loopsCoords[i])) {
          loopsCoords.unshift(loopsCoords.splice(i, 1)[0]);
          wallLoops.unshift(wallLoops.splice(i, 1)[0]);
          break;
        }
      }
    }

    return wallLoops;
  }

  private debugTriangulation(indices: number[]) {
    const dpi = window.devicePixelRatio;
    const resolution = 600 * dpi;
    const canvas = document.createElement('canvas');
    canvas.style.position = 'fixed';
    canvas.style.width = `600px`;
    canvas.style.height = `600px`;
    canvas.style.background = `#555`;
    canvas.width = resolution;
    canvas.height = resolution;
    document.body.append(canvas);

    const min: vec2 = vec2.fromValues(Infinity, Infinity);
    const max: vec2 = vec2.fromValues(-Infinity, -Infinity);
    for (const wall of this.sector.walls) {
      vec2.min(min, min, wall.start);
      vec2.max(max, max, wall.start);
    }

    const g = canvas.getContext('2d')!;
    const size: vec2 = [0, 0];
    vec2.sub(size, max, min);
    const center: vec2 = [min[0] + size[0] * 0.5, min[1] + size[1] * 0.5];
    const scale = (resolution / Math.max(size[0], size[1])) * 0.9;
    const points = this.sector.walls.map((wall) => {
      return [
        (wall.start[0] - center[0]) * scale + resolution / 2, //
        (wall.start[1] - center[1]) * scale + resolution / 2
      ] as const;
    });

    for (let loopID = 0; loopID < this.wallLoops.length; loopID++) {
      if (loopID === 0) {
        g.strokeStyle = '#000';
        g.lineWidth = 1;
      } else {
        g.strokeStyle = '#00a';
        g.lineWidth = 1;
      }

      g.beginPath();
      for (let id = 0; id <= this.wallLoops[loopID].length; id++) {
        const p = points[this.wallLoops[loopID][id % this.wallLoops[loopID].length]];
        g[id === 0 ? 'moveTo' : 'lineTo'](p[0], p[1]);
      }
      g.stroke();
    }

    g.strokeStyle = '#ff0';
    g.beginPath();
    for (let idx = 0; idx < indices.length; idx += 3) {
      g.moveTo(...points[indices[idx]]);
      g.lineTo(...points[indices[idx + 1]]);
      g.lineTo(...points[indices[idx + 2]]);
      g.lineTo(...points[indices[idx]]);
    }
    g.stroke();
  }
}
