const TOKEN_PREFIX = "tlk_live";
const PREFIX_BYTES = 9;
const SECRET_BYTES = 32;
const TOKEN_RE = /^tlk_live_([A-Za-z0-9_-]{12})_([A-Za-z0-9_-]{43})$/;

function bytesToBase64Url(bytes: Uint8Array) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function randomBase64Url(byteLength: number) {
  const bytes = new Uint8Array(byteLength);
  crypto.getRandomValues(bytes);
  return bytesToBase64Url(bytes);
}

export function generateApiKeyToken() {
  const prefix = randomBase64Url(PREFIX_BYTES);
  const secret = randomBase64Url(SECRET_BYTES);
  return {
    prefix,
    token: `${TOKEN_PREFIX}_${prefix}_${secret}`,
  };
}

export function parseApiKeyToken(token: string) {
  const match = TOKEN_RE.exec(token.trim());
  if (match === null) {
    throw new Error("Invalid API key");
  }
  return { prefix: match[1] };
}

export async function hashApiKeyToken(token: string) {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(token),
  );
  return bytesToBase64Url(new Uint8Array(digest));
}

export function constantTimeEqual(left: string, right: string) {
  const max = Math.max(left.length, right.length);
  let diff = left.length ^ right.length;
  for (let index = 0; index < max; index += 1) {
    diff |= (left.charCodeAt(index) || 0) ^ (right.charCodeAt(index) || 0);
  }
  return diff === 0;
}
