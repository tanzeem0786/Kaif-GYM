export function makeIdempotencyKey() {
  return globalThis.crypto.randomUUID()
}
