import { vec2 } from 'gl-matrix';
import { Level } from '../map/Level';
import { Camera } from '../rendering/Camera';
import { GL } from './Bootstrap';

export class Renderer {
  private static readonly viewport: vec2 = [10, 10];

  public static init() {}

  public static render() {
    Camera.bindMatrices();

    GL.viewport(0, 0, this.viewport[0], this.viewport[1]);
    GL.clearColor(0.2, 0.2, 0.2, 1);
    GL.clear(GL.COLOR_BUFFER_BIT | GL.DEPTH_BUFFER_BIT | GL.STENCIL_BUFFER_BIT);

    GL.enable(GL.DEPTH_TEST);
    GL.depthFunc(GL.LEQUAL);
    GL.enable(GL.CULL_FACE);
    GL.cullFace(GL.FRONT);
    Level.render();

    GL.enable(GL.BLEND);
    GL.blendFunc(GL.SRC_ALPHA, GL.ONE_MINUS_SRC_ALPHA);
    Level.renderTransparent();
    GL.disable(GL.BLEND);
  }

  public static resize(width: number, height: number) {
    this.viewport[0] = width;
    this.viewport[1] = height;
  }
}
