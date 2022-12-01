import { mat4, quat, vec3 } from 'gl-matrix';
import { Shader } from './Shader';

/**
 * Class for camera handling
 */
export class Camera {
  /**
   * WebGL View matrix
   * @type {mat4}
   * @private
   */
  private static viewMatrix: mat4 = mat4.identity(mat4.create());

  /**
   * Complete combined matrix
   * @type {mat4}
   * @private
   */
  private static cameraMatrix: mat4 = mat4.identity(mat4.create());

  /**
   * Projection matrix
   * @type {mat4}
   * @private
   */
  private static projMatrix: mat4 = mat4.identity(mat4.create());

  /**
   * Camera position
   * @type {vec3}
   * @private
   */
  private static pos: vec3 = vec3.fromValues(0, 0, 0);

  /**
   * Camera rotation in Euler angles
   * @type {vec3}
   * @private
   */
  private static rot: vec3 = vec3.fromValues(0, 0, 0);

  /**
   * Flag that position/rotation changed
   * @type {boolean}
   * @private
   */
  private static matrixDirty: boolean = true;

  /**
   * Get camera position vector
   * @returns {any}
   */
  public static get position() {
    return vec3.fromValues(this.pos[0], this.pos[1], this.pos[2]);
  }

  /**
   * Update camera position vector
   * @param {vec3} value
   */
  public static set position(value: vec3) {
    if (!vec3.equals(this.pos, value)) {
      vec3.copy(this.pos, value);
      this.matrixDirty = true;
    }
  }

  /**
   * Get camera angles
   * @returns {vec3}
   */
  public static get rotation() {
    return vec3.fromValues(this.rot[0], this.rot[1], this.rot[2]);
  }

  /**
   * Update camera rotation
   * @param {vec3} value
   */
  public static set rotation(value: vec3) {
    if (!vec3.equals(this.rot, value)) {
      vec3.copy(this.rot, value);
      this.matrixDirty = true;
    }
  }

  /**
   * Update projection with screen aspect
   * @param {number} aspect
   */
  public static updateProjection(aspect: number) {
    mat4.perspective(this.projMatrix, 1.04, aspect, 0.05, 500);
  }

  /**
   * Updating matrix bindings for shaders
   */
  public static bindMatrices() {
    this.updateMatrices();
    Shader.updateCamera(this.viewMatrix, this.projMatrix);
  }

  /**
   * Check if point cloud is visible
   * @param {vec3[]} points
   */
  public static isPortalVisible(cloud: vec3[]) {
    return true;
  }

  /**
   * Recalculate all matrices on changes
   * @private
   */
  private static updateMatrices() {
    if (this.matrixDirty) {
      mat4.fromRotationTranslation(
        this.cameraMatrix,
        quat.fromEuler(quat.create(), this.rot[0], this.rot[1], this.rot[2]),
        this.pos
      );
      mat4.invert(this.viewMatrix, this.cameraMatrix);
      this.matrixDirty = false;
    }
  }
}
