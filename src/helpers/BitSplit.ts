export function splitBits(value: number, ...sizes: number[]) {
  let accum = value;
  const out: number[] = [];
  for (const bitLength of sizes) {
    const size = Math.abs(bitLength);
    const mask = Math.pow(2, size);
    let item = accum & (mask - 1);
    if (bitLength < 0 && item >= mask / 2) {
      item -= mask;
    }
    out.push(item);
    accum >>= size;
  }
  return out;
}
