const SALT = "tasklabs.telegram.v1";

function requiredSecret() {
  const secret = process.env.JWT_PRIVATE_KEY;
  if (secret === undefined || secret.length < 32) {
    throw new Error("JWT_PRIVATE_KEY is required for Telegram token encryption");
  }
  return secret;
}

function bytesToBase64(bytes: Uint8Array) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function base64ToBytes(value: string) {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

async function encryptionKey() {
  const encoder = new TextEncoder();
  const material = await crypto.subtle.importKey(
    "raw",
    encoder.encode(requiredSecret()),
    "PBKDF2",
    false,
    ["deriveKey"],
  );
  return await crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: encoder.encode(SALT),
      iterations: 100_000,
      hash: "SHA-256",
    },
    material,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

export async function encryptTelegramToken(plain: string) {
  const iv = new Uint8Array(12);
  crypto.getRandomValues(iv);
  const ciphertext = new Uint8Array(
    await crypto.subtle.encrypt(
      { name: "AES-GCM", iv },
      await encryptionKey(),
      new TextEncoder().encode(plain),
    ),
  );
  const packed = new Uint8Array(iv.length + ciphertext.length);
  packed.set(iv, 0);
  packed.set(ciphertext, iv.length);
  return bytesToBase64(packed);
}

export async function decryptTelegramToken(encrypted: string) {
  const packed = base64ToBytes(encrypted);
  if (packed.length <= 12) {
    throw new Error("Encrypted Telegram token is malformed");
  }
  const iv = packed.slice(0, 12);
  const ciphertext = packed.slice(12);
  const plain = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv },
    await encryptionKey(),
    ciphertext,
  );
  return new TextDecoder().decode(plain);
}
