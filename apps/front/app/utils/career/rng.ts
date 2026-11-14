export function hashString(input: string): number {
  let hash = 2_166_136_261;

  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16_777_619);
  }

  return hash >>> 0;
}

export function createRng(seed: number): () => number {
  let localSeed = seed >>> 0 || 1;

  return () => {
    localSeed = (Math.imul(localSeed, 1_103_515_245) + 12_345) & 0x7f_ff_ff_ff;

    return localSeed / 0x7f_ff_ff_ff;
  };
}
