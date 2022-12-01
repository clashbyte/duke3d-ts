import { FreeLook } from '../controls/FreeLook';
import { Input } from '../controls/Input';
import { Bitmaps } from '../files/Bitmaps';
import { GroupArchive } from '../files/GroupArchive';
import { Palette } from '../files/Palette';
import { parseMap } from '../files/parsers/parseMap';
import { Level } from '../map/Level';
import { Camera } from '../rendering/Camera';
import { Renderer } from './Renderer';

export class Engine {
  private ready: boolean = false;
  public init() {
    Promise.all([
      GroupArchive.load() //
    ]).then(() => {
      this.startup();
    });
  }

  public startup() {
    Renderer.init();
    Palette.init();
    Bitmaps.init();

    const map = parseMap('e1l1.map');
    Level.load(map);

    /*
      Problematic sectors
      295,
      89,
      147,
      252
     */
    // decodeSectorLoops(map, 147);

    this.ready = true;
  }

  public frame() {
    if (!this.ready) return;

    // Controls
    FreeLook.update();
    Level.update();

    // if (Input.keyHit('Space')) {
    //   Audio.testPlay();
    // }

    // Rendering
    Renderer.render();

    // Cleanup
    Input.reset();
  }

  public resize(width: number, height: number) {
    Camera.updateProjection(width / height);
    Renderer.resize(width, height);
  }
}
