import { vec2, vec3 } from 'gl-matrix';
import { assert } from '../../helpers/Assert';
import { BinaryReader } from '../../helpers/BinaryReader';
import { GroupArchive } from '../GroupArchive';

/**
 * Tag definition
 */
export interface TagDef {
  low: number;
  high: number;
  extra: number;
}

/**
 * Flat definition
 */
export interface FlatDef {
  height: number;
  flags: number;
  texture: number;
  slope: number;
  shade: number;
  paletteLookup: number;
  panning: vec2;
}

/**
 * Sector definition
 */
export interface SectorDef {
  firstWall: number;
  wallCount: number;
  floor: FlatDef;
  ceiling: FlatDef;
  shadeFactor: number;
  tags: TagDef;
}

/**
 * Wall definition
 */
export interface WallDef {
  start: vec2;
  nextWall: number;
  oppositeWall: number;
  oppositeSector: number;
  flags: number;
  texture: number;
  maskTexture: number;
  shade: number;
  paletteLookup: number;
  repeat: vec2;
  panning: vec2;
  tags: TagDef;
}

/**
 * Map info container
 */
export interface MapData {
  player: vec3;
  playerAngle: number;
  playerSector: number;
  sectors: SectorDef[];
  walls: WallDef[];
}

/**
 * Read tags
 * @param {BinaryReader} f
 * @returns {TagDef}
 */
function readTags(f: BinaryReader): TagDef {
  const low = f.readSignedShort();
  const high = f.readSignedShort();
  const extra = f.readSignedShort();
  return {
    low,
    high,
    extra
  };
}

/**
 * Read floor/ceiling struct
 * @param {BinaryReader} f
 * @param {number} flags
 * @param {number} height
 * @returns {FlatDef}
 */
function readFlat(f: BinaryReader, flags: number, height: number): FlatDef {
  const texture = f.readShort();
  const slope = f.readSignedShort();
  const shade = f.readSignedByte();
  const paletteLookup = f.readByte();
  const panning: vec2 = [0, 0];
  panning[0] = f.readByte();
  panning[1] = f.readByte();
  return {
    height,
    flags,
    texture,
    slope,
    shade,
    paletteLookup,
    panning
  };
}

/**
 * Read sector
 * @param {BinaryReader} f
 * @returns {SectorDef}
 */
function readSector(f: BinaryReader): SectorDef {
  const firstWall = f.readSignedShort();
  const wallCount = f.readSignedShort();
  const ceilingHeight = f.readInt();
  const floorHeight = f.readInt();
  const ceilingFlags = f.readShort();
  const floorFlags = f.readShort();
  const ceiling = readFlat(f, ceilingFlags, ceilingHeight);
  const floor = readFlat(f, floorFlags, floorHeight);
  const shadeFactor = f.readSignedByte();
  f.position += 1;
  const tags = readTags(f);
  return {
    firstWall,
    wallCount,
    ceiling,
    floor,
    shadeFactor,
    tags
  };
}

/**
 * Read Wall entry
 * @param {BinaryReader} f
 * @returns {WallDef}
 */
function readWall(f: BinaryReader): WallDef {
  const start: vec2 = [0, 0];
  const repeat: vec2 = [0, 0];
  const panning: vec2 = [0, 0];
  start[0] = f.readInt();
  start[1] = f.readInt();
  const nextWall = f.readSignedShort();
  const oppositeWall = f.readSignedShort();
  const oppositeSector = f.readSignedShort();
  const flags = f.readShort();
  const texture = f.readSignedShort();
  const maskTexture = f.readSignedShort();
  const shade = f.readSignedByte();
  const paletteLookup = f.readByte();
  repeat[0] = f.readByte();
  repeat[1] = f.readByte();
  panning[0] = f.readByte();
  panning[1] = f.readByte();
  const tags = readTags(f);
  return {
    nextWall,
    oppositeWall,
    oppositeSector,
    flags,
    texture,
    maskTexture,
    shade,
    paletteLookup,
    start,
    repeat,
    panning,
    tags
  };
}

/**
 * Decode MAP file
 * @param {string} name
 * @returns {MapData}
 */
export function parseMap(name: string) {
  const map: MapData = {
    player: [0, 0, 0],
    playerAngle: 0,
    playerSector: 0,
    sectors: [],
    walls: []
  };

  const f = GroupArchive.getReader(name);
  assert(f.readInt() === 7, `Unknown map format in ${name.toUpperCase()}`);

  // Read player position and angle
  map.player[0] = f.readInt();
  map.player[1] = f.readInt();
  map.player[2] = f.readInt();
  map.playerAngle = f.readSignedShort();
  map.playerSector = f.readSignedShort();

  // Read sectors
  const totalSectors = f.readShort();
  for (let i = 0; i < totalSectors; i++) {
    map.sectors[i] = readSector(f);
  }

  // Read walls
  const totalWalls = f.readShort();
  for (let i = 0; i < totalWalls; i++) {
    map.walls[i] = readWall(f);
  }

  return map;
}
