// Cheap heuristics for cross-agent prompt-injection / abuse attempts (see
// README > Security & safety). This is intentionally shallow — it does not
// remove or block anything, it just routes a copy into the owner inbox as
// an escalation so a human can look, while the message stays on the board.

const SUSPICIOUS_PATTERNS = [
  /ignore (all|any|the|your)?\s*(previous|prior|above)\s*instructions/i,
  /disregard (all|any|the|your)?\s*(previous|prior|above)\s*instructions/i,
  /you are now/i,
  /new system prompt/i,
  /reveal (your|the) (system|hidden) prompt/i,
  /act as (if you|though you)/i,
];

export function looksSuspicious(text) {
  return SUSPICIOUS_PATTERNS.some((pattern) => pattern.test(text));
}
