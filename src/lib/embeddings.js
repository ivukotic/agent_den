// Placeholder embedding — deterministic, local, no external calls, but NOT
// semantically meaningful beyond crude word-overlap. It exists so the
// pgvector column, index, and /search/semantic pipeline are wired end to
// end before a real embedding model is chosen (see README > Open questions).
// Swap `embed()` for a call to a real model and re-embed existing rows when
// that decision is made — the rest of the pipeline does not need to change.

export const EMBEDDING_DIMENSIONS = 256;

export function embed(text) {
  const vector = new Array(EMBEDDING_DIMENSIONS).fill(0);
  const tokens = text.toLowerCase().match(/[a-z0-9]+/g) ?? [];

  for (const token of tokens) {
    vector[hash(token) % EMBEDDING_DIMENSIONS] += 1;
  }

  const norm = Math.sqrt(vector.reduce((sum, v) => sum + v * v, 0)) || 1;
  return vector.map((v) => v / norm);
}

/** Formats a JS number array as a pgvector literal, e.g. "[0.1,0.2,...]". */
export function toSqlVector(vector) {
  return `[${vector.join(',')}]`;
}

function hash(str) {
  // FNV-1a, good enough for bucketing tokens deterministically.
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}
