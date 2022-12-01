import { quat, vec3 } from 'gl-matrix';
import { Camera } from '../rendering/Camera';
import { Input } from './Input';

export class FreeLook {
  private static pitch: number = parseFloat(localStorage.getItem('freePitch') ?? '0');

  private static yaw: number = parseFloat(localStorage.getItem('freeYaw') ?? '0');

  private static position: vec3 = [
    parseFloat(localStorage.getItem('freeX') ?? '0'),
    parseFloat(localStorage.getItem('freeY') ?? '0'),
    parseFloat(localStorage.getItem('freeZ') ?? '0')
  ];

  public static update() {
    const lookSpeed = Input.getMouseSpeed();
    const moveValue = Input.getMovement();
    const moveSpeed = Input.keyDown('ShiftLeft') ? 0.3 : 0.04;
    this.pitch -= lookSpeed[1] * 0.06;
    this.yaw -= lookSpeed[0] * 0.06;
    this.pitch = Math.max(Math.min(this.pitch, 90), -90);

    const rot = quat.fromEuler(quat.create(), this.pitch, this.yaw, 0);
    const move = vec3.fromValues(moveValue[0] * moveSpeed, 0, moveValue[1] * moveSpeed);
    vec3.transformQuat(move, move, rot);
    vec3.add(this.position, this.position, move);

    Camera.position = this.position;
    Camera.rotation = [this.pitch, this.yaw, 0];

    if (Input.keyHit('Backspace')) {
      localStorage.setItem('freePitch', this.pitch.toString());
      localStorage.setItem('freeYaw', this.yaw.toString());
      localStorage.setItem('freeX', this.position[0].toString());
      localStorage.setItem('freeY', this.position[1].toString());
      localStorage.setItem('freeZ', this.position[2].toString());
      console.log('Camera saved');
    }
  }
}
