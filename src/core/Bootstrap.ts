import { Input } from '../controls/Input';
import { Engine } from './Engine';

// eslint-disable-next-line
(window as any)['global'] = window;

const canvas = document.getElementsByTagName('canvas')[0];
const GL = canvas.getContext('webgl2')!;

const engine = new Engine();
const onResize = () => {
  const w = window.innerWidth * window.devicePixelRatio;
  const h = window.innerHeight * window.devicePixelRatio;
  canvas.width = w;
  canvas.height = h;
  engine.resize(w, h);
};
window.addEventListener('resize', onResize);
onResize();

engine.init();

let lastFrameTime = performance.now();
const frameHandler = (time: number) => {
  requestAnimationFrame(frameHandler);
  const delta = (time - lastFrameTime) / 16.666;
  lastFrameTime = time;
  engine.frame(delta);
};

export const bootstrap = () => {
  Input.bind(canvas);
  Input.lock();
  lastFrameTime = performance.now();
  frameHandler(lastFrameTime);
};

export { GL };
