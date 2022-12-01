import { assert } from '../../helpers/Assert';
import { BinaryReader } from '../../helpers/BinaryReader';
import { GroupArchive } from '../GroupArchive';

enum ChunkType {
  Terminator,
  SoundData,
  MoreSoundData,
  Silence,
  NewFormat = 9
}

function checkHeader(f: BinaryReader) {
  assert(f.readString(19) === 'Creative Voice File', 'Incorrect VOC header');
  assert(f.readByte() === 0x1a, 'Incorrect VOC magic');
  f.position = f.readShort();
}

function readBlockHeader(f: BinaryReader) {
  const type: ChunkType = f.readByte();
  let size = 0;
  if (type !== 0) {
    const bytes = f.readBytes(3);
    size = bytes[0] + (bytes[1] << 8) + (bytes[2] << 16);
  }
  return {
    type,
    size
  };
}

/**
 * Parse Creative Voice file (*.VOC)
 * @param {string} name
 * @returns {{data: Uint8Array, channels: number, rate: number, is16bit: boolean}}
 */
export function parseVoc(name: string) {
  const f = GroupArchive.getReader(name);
  checkHeader(f);

  // Output variables default values
  let data = new Uint8Array(0);
  let rate = 0;
  let channels = 1;
  let bits = 8;
  let ended = false;

  // Iterate through blocks
  while (!f.eof && !ended) {
    const { type, size } = readBlockHeader(f);
    switch (type) {
      case ChunkType.Terminator:
        // Ending chunk
        ended = true;
        break;

      case ChunkType.SoundData:
        // Main sound data info
        {
          const sampleRate = Math.round(1000000 / (256 - f.readByte()));
          f.position += 1;
          const rawData = f.readBytes(size - 2);
          rate = sampleRate;
          const temp = data;
          data = new Uint8Array(temp.length + rawData.length);
          data.set(temp, 0);
          data.set(rawData, temp.length);
        }
        break;

      case ChunkType.MoreSoundData:
        // Same sound block, but with existing config
        {
          f.position += 2;
          const rawData = f.readBytes(size - 2);
          const temp = data;
          data = new Uint8Array(temp.length + rawData.length);
          data.set(temp, 0);
          data.set(rawData, temp.length);
        }
        break;

      case ChunkType.Silence:
        // Same sound block, but with existing config
        {
          const length = f.readShort() - 1;
          f.position += 1;

          const temp = data;
          data = new Uint8Array(temp.length + length);
          data.set(temp, 0);
          data.fill(128, temp.length);
        }
        break;

      case ChunkType.NewFormat:
        // Like WAV format, this contains full audio data
        rate = f.readInt();
        bits = f.readByte();
        channels = f.readByte();
        f.position += 6;
        data = f.readBytes(size - 12);
        ended = true;
        break;

      default:
        // Unknown block - skip it
        f.position += size;
    }
  }

  // Convert to floating point buffer
  const finalData: number[] = [];
  if (bits === 16) {
    for (let i = 0; i < data.length; i += 2) {
      let value = data[i + 1] * 256 + data[i];
      if (value > 32767) {
        value -= 65535;
      }
      finalData.push(value / 32767.0);
    }
  } else {
    for (let i = 0; i < data.length; i++) {
      finalData.push((data[i] - 128) / 128.0);
    }
  }

  // Return found data or empty buffer
  return {
    finalData,
    rate,
    channels,
    is16bit: bits === 16
  };
}
