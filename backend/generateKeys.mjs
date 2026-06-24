import { generateKeyPairSync } from "node:crypto";

const { privateKey, publicKey } = generateKeyPairSync("rsa", {
  modulusLength: 2048,
  publicExponent: 0x10001,
});

const privatePem = privateKey
  .export({ type: "pkcs8", format: "pem" })
  .trimEnd()
  .replace(/\n/g, " ");
const publicJwk = publicKey.export({ format: "jwk" });
const jwks = JSON.stringify({ keys: [{ use: "sig", ...publicJwk }] });

console.log(`JWT_PRIVATE_KEY=${privatePem}`);
console.log(`JWKS=${jwks}`);
