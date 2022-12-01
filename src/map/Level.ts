import { vec2 } from 'gl-matrix';
import { Input } from '../controls/Input';
import { Bitmaps } from '../files/Bitmaps';
import { MapData } from '../files/parsers/parseMap';
import { Camera } from '../rendering/Camera';
import { Sector } from './Sector';
import { Wall } from './Wall';

const RENDER_ALL = true;

export class Level {
  public static readonly SCALE = 0.001;

  private static loaded: boolean = false;
  private static currentData: MapData | null = null;

  private static sectors: Sector[];

  private static walls: Wall[];

  private static visibleSectors: number[] = [];

  public static load(data: MapData | null) {
    this.unload();
    if (data) {
      this.currentData = data;
      this.cacheTextures();

      // Create walls
      this.walls = [];
      for (let i = 0; i < data.walls.length; i++) {
        this.walls[i] = new Wall(i, data);
      }

      // Create sectors and link walls
      this.sectors = [];
      for (let i = 0; i < data.sectors.length; i++) {
        this.sectors[i] = new Sector(i, data, this.walls);
      }

      // Postprocess loaded data
      this.linkWalls();

      this.loaded = true;
    }
  }

  public static update() {
    // Update all sectors
    for (const sector of this.sectors) {
      sector.update();
    }

    // Calculate visisbility tree
    const camera: vec2 = [Camera.position[0], Camera.position[2]];
    const firstSector = this.sectors.findIndex((sector) => sector.isInside(camera));
    this.visibleSectors.length = 0;
    if (firstSector !== -1) {
      if (Input.keyHit('U')) {
        console.log(firstSector);
      }
      this.traverseSector(firstSector);
    }
  }

  public static render() {
    if (RENDER_ALL) {
      for (const sector of this.sectors) {
        sector.render();
      }
    } else {
      for (const sector of this.visibleSectors) {
        this.sectors[sector].render();
      }
    }
  }

  public static renderTransparent() {
    if (RENDER_ALL) {
      for (const sector of this.sectors) {
        sector.renderTransparent();
      }
    } else {
      // for (const sector of this.visibleSectors) {
      //   this.sectors[sector].render();
      // }
    }
  }

  /**
   * Release all data
   * @private
   */
  private static unload() {
    if (this.currentData && this.loaded) {
      this.currentData = null;
      this.loaded = false;
    }
  }

  /**
   * Traverse sector for visibility check
   * @param {number} id
   * @private
   */
  private static traverseSector(id: number) {
    this.visibleSectors.push(id);
    const sector = this.sectors[id];
    for (const portal of sector.getPortals()) {
      if (!this.visibleSectors.includes(portal.sector)) {
        if (Camera.isPortalVisible(portal.points)) {
          this.traverseSector(portal.sector);
        }
      }
    }
  }

  /**
   * Assign all walls to sectors
   * @private
   */
  private static linkWalls() {
    if (!this.currentData) return;
    const map = this.currentData;

    // Assign walls to opposite walls and sectors
    for (let i = 0; i < this.walls.length; i++) {
      const wall = this.walls[i];
      const def = map.walls[i];
      if (def.oppositeWall !== -1) {
        wall.otherWall = this.walls[def.oppositeWall];
      }
      if (def.oppositeSector !== -1) {
        wall.otherSector = this.sectors[def.oppositeSector];
      }
    }
  }

  /**
   * Cache all textures used in map
   * @private
   */
  private static cacheTextures() {
    if (!this.currentData) return;

    // Lookup table and adding function
    const ids: number[] = [];
    const add = (id: number) => {
      if (id !== -1 && !ids.includes(id)) {
        ids.push(id);
      }
    };

    // Add sector flats
    for (const sector of this.currentData.sectors) {
      add(sector.floor.texture);
      add(sector.ceiling.texture);
    }

    // Add walls
    for (const wall of this.currentData.walls) {
      add(wall.texture);
      add(wall.maskTexture);
    }

    // Iterate all IDs and precache them
    for (const id of ids) {
      Bitmaps.cacheTile(id);
    }
  }
}
