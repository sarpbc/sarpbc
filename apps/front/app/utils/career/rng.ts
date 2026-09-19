export function hashString(input: string): number {
  let hash = 2166136261;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function createRng(seed: number): () => number {
  let localSeed = seed >>> 0 || 1;
  return () => {
    localSeed = (Math.imul(localSeed, 1103515245) + 12345) & 0x7fffffff;
    return localSeed / 0x7fffffff;
  };
}
