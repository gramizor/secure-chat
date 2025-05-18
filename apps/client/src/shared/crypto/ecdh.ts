import nacl from "tweetnacl";

export type PublicKey = string;
export type PrivateKey = Uint8Array;

export function generateKeyPair(): {
  publicKey: PublicKey;
  privateKey: PrivateKey;
} {
  const { publicKey, secretKey } = nacl.box.keyPair();

  return {
    publicKey: btoa(String.fromCharCode(...publicKey)),
    privateKey: secretKey,
  };
}
