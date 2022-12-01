import { vec2 } from 'gl-matrix';

export function nearestPower2(value: number) {
  return 1 << (31 - Math.clz32(value));
}

export function polygonWinding(points: vec2[]) {
  let area = 0;
  for (let i = 0; i < points.length; i++) {
    const j = (i + 1) % points.length;
    area += points[i][0] * points[j][1];
    area -= points[j][0] * points[i][1];
  }
  return area / 2 > 0;
}

export function pointInsidePolygon(point: vec2, polygon: [vec2, vec2][]) {
  // ray-casting algorithm based on
  // https://wrf.ecse.rpi.edu/Research/Short_Notes/pnpoly.html/pnpoly.html

  const x = point[0];
  const y = point[1];

  let inside = false;
  for (let i = 0; i < polygon.length; i++) {
    const xi = polygon[i][0][0];
    const yi = polygon[i][0][1];
    const xj = polygon[i][1][0];
    const yj = polygon[i][1][1];
    const intersect = yi > y != yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }

  return inside;
}
