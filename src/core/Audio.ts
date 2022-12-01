import { parseVoc } from '../files/parsers/parseVoc';

export class Audio {
  private static context: AudioContext;

  public static init() {
    if (!this.context) {
      this.context = new AudioContext();
    }
  }

  public static testPlay() {
    // CHEW05.VOC
    const voc = parseVoc('BONUS.VOC');

    const testBuffer = this.context.createBuffer(voc.channels, voc.finalData.length / voc.channels, voc.rate);
    let pos = 0;
    for (let i = 0; i < voc.channels; i++) {
      const channel = testBuffer.getChannelData(i);
      for (let g = 0; g < voc.finalData.length / voc.channels; g++) {
        channel[g] = voc.finalData[pos];
        pos++;
      }
    }

    const source = this.context.createBufferSource();
    source.buffer = testBuffer;
    source.connect(this.context.destination);
    source.start();
  }
}
