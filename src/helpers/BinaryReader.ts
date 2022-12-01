/**
 * Helper class for reading DataView in C# manner
 */
export class BinaryReader {
  /**
   * Byte offset in stream
   * @type {number}
   */
  public rawPosition: number;

  /**
   * Internal offset
   * @type {number}
   * @private
   */
  public readonly bufferOffset: number;

  /**
   * Total stream length
   * @type {number}
   */
  public readonly length: number;

  /**
   * Internal DataView
   * @type {DataView}
   * @private
   */
  private reader: DataView;

  /**
   * Get stream position
   * @returns {number}
   */
  public get position() {
    return this.rawPosition - this.bufferOffset;
  }

  /**
   * Set position (starts from offset)
   * @param {number} value
   */
  public set position(value: number) {
    this.rawPosition = value + this.bufferOffset;
  }

  /**
   * True if reader reached end of file
   * @returns {boolean}
   */
  public get eof() {
    return this.rawPosition >= this.bufferOffset + this.length;
  }

  /**
   * Constructor for BinaryReader
   * @param {ArrayBuffer} buffer
   * @param offset
   * @param length
   */
  public constructor(buffer: ArrayBuffer, offset: number = 0, length: number = Infinity) {
    this.bufferOffset = offset;
    this.rawPosition = offset;
    this.length = Math.min(buffer.byteLength - offset, length);
    this.reader = new DataView(buffer);
  }

  /**
   * Read single unsigned byte
   * @returns {number}
   */
  public readByte() {
    const val = this.reader.getUint8(this.rawPosition);
    this.rawPosition++;
    return val;
  }

  /**
   * Read signed byte
   * @returns {number}
   */
  public readSignedByte() {
    const val = this.reader.getInt8(this.rawPosition);
    this.rawPosition++;
    return val;
  }

  /**
   * Read byte array with specified length
   * @param {number} count
   * @returns {Uint8Array}
   */
  public readBytes(count: number) {
    const out = [];
    for (let i = 0; i < count; i++) {
      out.push(this.readByte());
    }
    return new Uint8Array(out);
  }

  /**
   * Read unsigned short (2 bytes)
   * @returns {number}
   */
  public readShort() {
    const val = this.reader.getUint16(this.rawPosition, true);
    this.rawPosition += 2;
    return val;
  }

  /**
   * Read signed short (2 bytes)
   * @returns {number}
   */
  public readSignedShort() {
    const val = this.reader.getInt16(this.rawPosition, true);
    this.rawPosition += 2;
    return val;
  }

  /**
   * Read signed int (4 bytes)
   * @returns {number}
   */
  public readInt() {
    const val = this.reader.getInt32(this.rawPosition, true);
    this.rawPosition += 4;
    return val;
  }

  /**
   * Read signed int (4 bytes)
   * @returns {number}
   */
  public readUInt() {
    const val = this.reader.getUint32(this.rawPosition, true);
    this.rawPosition += 4;
    return val;
  }

  /**
   * Read single-precision float (4 bytes)
   * @returns {number}
   */
  public readFloat() {
    const val = this.reader.getFloat32(this.rawPosition, true);
    this.rawPosition += 4;
    return val;
  }

  /**
   * Read string with length prefix
   * @returns {string}
   */
  public readString(length: number | null = null) {
    const len = length === null ? this.readShort() : length;
    let out = '';
    for (let i = 0; i < len; i++) {
      out += String.fromCharCode(this.readByte());
    }
    if (out.includes('\0')) {
      out = out.substring(0, out.indexOf('\0'));
    }
    return out;
  }

  /**
   * Read null-terminated string
   * @returns {string}
   */
  public readNullString() {
    let out = '';
    for (let i = 0; i < 1024; i++) {
      const char = this.readByte();
      if (char === 0) {
        break;
      }
      out += String.fromCharCode(char);
    }
    return out;
  }
}
