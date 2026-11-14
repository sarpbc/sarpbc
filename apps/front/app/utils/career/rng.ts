const UINT32_MODULUS = 2 ** 32;
const UINT31_MODULUS = 2 ** 31;

function wrap(value: number, modulus: number): number {
  return ((value % modulus) + modulus) % modulus;
}

function xorUint32(left: number, right: number): number {
  let result = 0;

  for (let bit = 1; bit < UINT32_MODULUS; bit *= 2) {
    if (Math.floor(left / bit) % 2 !== Math.floor(right / bit) % 2) result += bit;
  }

  return result;
}

export function hashString(input: string): number {
  let hash = 2_166_136_261;

  for (const unit of input.split("")) {
    hash = wrap(Math.imul(xorUint32(hash, unit.codePointAt(0) ?? 0), 16_777_619), UINT32_MODULUS);
  }

  return hash;
}

export function createRng(seed: number): () => number {
  let localSeed = wrap(seed, UINT32_MODULUS) || 1;

  return () => {
    localSeed = wrap(Math.imul(localSeed, 1_103_515_245) + 12_345, UINT31_MODULUS);

    return localSeed / 0x7f_ff_ff_ff;
  };
}
