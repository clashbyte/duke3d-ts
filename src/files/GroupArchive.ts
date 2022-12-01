import { BinaryReader } from '../helpers/BinaryReader';

interface Entry {
  offset: number;
  length: number;
}

export class GroupArchive {
  private static buffer: ArrayBuffer;

  private static entries: { [key: string]: Entry } = {};

  public static async load() {
    this.buffer = await this.fetchGroupFile();

    // Parse file entries
    const f = new BinaryReader(this.buffer);
    if (f.readString(12) !== 'KenSilverman') throw new Error('Invalid GRP header');

    // Build raw file list
    const tempEntries: { name: string; length: number }[] = [];
    const totalFiles = f.readUInt();
    for (let i = 0; i < totalFiles; i++) {
      const name = f.readString(12);
      const length = f.readUInt();
      tempEntries.push({
        name,
        length
      });
      if (name.toLowerCase().endsWith('voc')) console.debug(`[Resources] Entry ${name} => ${length} bytes`);
    }

    // Calculate offsets starting from current position
    let offset = f.position;
    for (const en of tempEntries) {
      this.entries[en.name.toLowerCase()] = {
        offset,
        length: en.length
      };
      offset += en.length;
    }
  }

  /**
   * Check that GRP contains file
   * @param {string} name
   * @returns {boolean}
   */
  public static has(name: string) {
    return name.toLowerCase() in this.entries;
  }

  /**
   * Get file's binary reader instance
   * @param {string} name
   * @returns {BinaryReader}
   */
  public static getReader(name: string) {
    this.checkFile(name);
    const entry = this.entries[name.toLowerCase()];
    return new BinaryReader(this.buffer, entry.offset, entry.length);
  }

  /**
   * Get file as raw ArrayBuffer
   * @param {string} name
   * @returns {ArrayBuffer}
   */
  public static getRaw(name: string) {
    this.checkFile(name);
    const entry = this.entries[name];
    return this.buffer.slice(entry.offset, entry.offset + entry.length);
  }

  /**
   * Get tile files prefix ("tiles" for TILES000.ART)
   * @returns {string}
   */
  public static getTilesetPrefix() {
    for (const name in this.entries) {
      if (name.endsWith('.art')) {
        return name.replace(/\d{3}\.art$/gim, '');
      }
    }
    return '';
  }

  /**
   * Assert that file exists
   * @param {string} name
   * @private
   */
  private static checkFile(name: string) {
    if (!this.has(name)) throw Error('Unknown GRP entry: ' + name);
  }

  /**
   * Fetch GRP file from 'public' folder
   * @returns {Promise<ArrayBuffer>}
   * @private
   */
  private static async fetchGroupFile() {
    const resp = await fetch('/DUKE3D.GRP');
    return await resp.arrayBuffer();
  }
}
