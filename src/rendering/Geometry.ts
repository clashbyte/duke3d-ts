import { GL } from '../core/Bootstrap';
import { Shader } from './Shader';

type BufferArray = number[] | number[][];

export enum BufferType {
  Byte,
  SignedByte,
  Short,
  SignedShort,
  Int,
  UnsignedInt,
  Float
}

export enum DrawType {
  Triangles,
  Lines,
  LineLoop,
  LineStrip
}

interface Buffer {
  data: ArrayBuffer;
  type: BufferType;
  buffer: WebGLBuffer;
  size: number;
}

export class Geometry {
  private readonly buffers: { [key: string]: Buffer };

  private type: DrawType;

  private indexBuffer: WebGLBuffer | null;

  private indexCount: number;

  private byteIndexing: boolean;

  public constructor(drawType: DrawType = DrawType.Triangles) {
    this.buffers = {};
    this.indexCount = 0;
    this.byteIndexing = false;
    this.type = drawType;
    this.indexBuffer = null;
  }

  public setBuffer(name: string, data: BufferArray, type: BufferType, size: number = 1) {
    const rawData = data.flat();
    let dataArray: ArrayBuffer;
    switch (type) {
      case BufferType.Byte:
        dataArray = new Uint8Array(rawData);
        break;
      case BufferType.SignedByte:
        dataArray = new Int8Array(rawData);
        break;
      case BufferType.Short:
        dataArray = new Uint16Array(rawData);
        break;
      case BufferType.SignedShort:
        dataArray = new Int16Array(rawData);
        break;
      case BufferType.Int:
        dataArray = new Int32Array(rawData);
        break;
      case BufferType.UnsignedInt:
        dataArray = new Uint32Array(rawData);
        break;
      case BufferType.Float:
        dataArray = new Float32Array(rawData);
        break;
    }

    let buffer: Buffer;
    if (!(name in this.buffers)) {
      buffer = {
        data: dataArray,
        type: type,
        size: size,
        buffer: GL.createBuffer()!
      };
      this.buffers[name] = buffer;
    } else {
      buffer = this.buffers[name];
      buffer.data = dataArray;
      buffer.type = type;
      buffer.size = size;
    }

    GL.bindBuffer(GL.ARRAY_BUFFER, buffer.buffer);
    GL.bufferData(GL.ARRAY_BUFFER, buffer.data, GL.STATIC_DRAW);
    GL.bindBuffer(GL.ARRAY_BUFFER, null);
  }

  public setIndex(indices: BufferArray, byteIndexing: boolean = false) {
    if (!this.indexBuffer) {
      this.indexBuffer = GL.createBuffer()!;
    }

    const indexData = indices.flat();
    this.byteIndexing = byteIndexing;
    this.indexCount = indexData.length;

    GL.bindBuffer(GL.ELEMENT_ARRAY_BUFFER, this.indexBuffer);
    GL.bufferData(
      GL.ELEMENT_ARRAY_BUFFER,
      byteIndexing ? new Uint8Array(indexData) : new Uint16Array(indexData),
      GL.STATIC_DRAW
    );
    GL.bindBuffer(GL.ELEMENT_ARRAY_BUFFER, null);
  }

  public render() {
    const shader = Shader.active;
    if (!shader || !this.indexBuffer) return;
    const attribs: number[] = [];

    // Bind attributes
    for (const name in this.buffers) {
      const id = shader.attribute(name);
      if (id !== -1) {
        const b = this.buffers[name];
        attribs.push(id);

        let type: number;
        switch (b.type) {
          case BufferType.Byte:
            type = GL.UNSIGNED_BYTE;
            break;
          case BufferType.SignedByte:
            type = GL.BYTE;
            break;
          case BufferType.Short:
            type = GL.UNSIGNED_SHORT;
            break;
          case BufferType.SignedShort:
            type = GL.SHORT;
            break;
          case BufferType.Int:
            type = GL.INT;
            break;
          case BufferType.UnsignedInt:
            type = GL.UNSIGNED_INT;
            break;
          case BufferType.Float:
            type = GL.FLOAT;
            break;
        }

        GL.enableVertexAttribArray(id);
        GL.bindBuffer(GL.ARRAY_BUFFER, b.buffer);
        GL.vertexAttribPointer(id, b.size, type, false, 0, 0);
      }
    }

    // Try to render mesh
    if (attribs.length) {
      let type: number;
      switch (this.type) {
        case DrawType.Triangles:
          type = GL.TRIANGLES;
          break;
        case DrawType.Lines:
          type = GL.LINES;
          break;
        case DrawType.LineLoop:
          type = GL.LINE_LOOP;
          break;
        case DrawType.LineStrip:
          type = GL.LINE_STRIP;
          break;
      }

      GL.bindBuffer(GL.ELEMENT_ARRAY_BUFFER, this.indexBuffer);
      GL.drawElements(type, this.indexCount, this.byteIndexing ? GL.UNSIGNED_BYTE : GL.UNSIGNED_SHORT, 0);

      // Release attributes
      for (const id of attribs) {
        GL.disableVertexAttribArray(id);
      }
      GL.bindBuffer(GL.ARRAY_BUFFER, null);
      GL.bindBuffer(GL.ELEMENT_ARRAY_BUFFER, null);
    }
  }

  public dispose() {
    const keys = Object.keys(this.buffers);
    for (const key of keys) {
      GL.deleteBuffer(this.buffers[key].buffer);
      delete this.buffers[key];
    }
    if (this.indexBuffer) {
      GL.deleteBuffer(this.indexBuffer);
      this.indexBuffer = null;
    }
    this.indexCount = 0;
  }
}
