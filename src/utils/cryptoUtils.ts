/**
 * Cryptographic Utility for Document Fingerprinting, Authenticated Encryption,
 * Asymmetric ECDSA Digital Signatures, and Portable Proof Verification.
 * Complies with FIPS 180-4 standard SHA-256 digest specification,
 * NIST SP 800-38D AES-GCM 256-bit authenticated encryption, and
 * FIPS 186-4 ECDSA with P-256 curve digital signatures.
 */

import { EncryptedStoragePayload, DigitalCertificate, VerificationOutcome, PortableProofPayload } from '../types';

export const PROVENANCE_LEGAL_NOTICE =
  "LEGAL TITLE NOTICE: This cryptographic digital certificate attests to the artwork attributes recorded by the artist's studio vault at issuance date. It establishes immutable cryptographic provenance but does not constitute a government-registered copyright, statutory title deed, or registered trademark without formal legal contracts of transfer.";

export const KEY_RECOVERY_LIMITATION_NOTICE =
  "KEY MANAGEMENT & RECOVERY NOTICE: The studio private key is stored exclusively within your local browser storage. If this key is deleted, storage is cleared, or device is lost without an encrypted backup, the private key CANNOT mathematically be reconstructed. Any subsequent certificates must be issued using a newly generated keypair and existing certificates marked as superseded.";

export const OFFLINE_REVOCATION_DISCLAIMER =
  "OFFLINE VERIFICATION SCOPE: Cryptographic math and payload integrity are verified 100% offline without network connectivity. Real-time certificate revocation status cannot be guaranteed without an active registry query.";

export const LEGAL_IDENTITY_DISCLAIMER =
  "CREATOR IDENTITY NOTICE: An ECDSA digital signature confirms only that the payload matches the private key corresponding to the public key. It does not independently prove real-world legal identity, physical artwork possession, or statutory ownership.";

/**
 * Pure TypeScript SHA-256 implementation ensuring deterministic operation in any environment
 */
export function sha256(str: string): string {
  function rightRotate(value: number, amount: number) {
    return (value >>> amount) | (value << (32 - amount));
  }

  let i = 0;
  let j = 0;
  let result = '';

  const words: number[] = [];
  const asciiBitLength = str.length * 8;

  const hash = [
    0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a,
    0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19
  ];

  const k = [
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2
  ];

  for (i = 0; i < str.length; i++) {
    const code = str.charCodeAt(i);
    words[i >> 2] = (words[i >> 2] || 0) | ((code & 0xff) << ((3 - (i % 4)) * 8));
  }

  words[asciiBitLength >> 5] = (words[asciiBitLength >> 5] || 0) | (0x80 << (31 - (asciiBitLength % 32)));
  words[(((asciiBitLength + 64) >> 9) << 4) + 15] = asciiBitLength;

  for (i = 0; i < words.length; i += 16) {
    const w = words.slice(i, i + 16);
    while (w.length < 16) w.push(0);

    for (j = 16; j < 64; j++) {
      const s0 = rightRotate(w[j - 15], 7) ^ rightRotate(w[j - 15], 18) ^ (w[j - 15] >>> 3);
      const s1 = rightRotate(w[j - 2], 17) ^ rightRotate(w[j - 2], 19) ^ (w[j - 2] >>> 10);
      w[j] = (w[j - 16] + s0 + w[j - 7] + s1) | 0;
    }

    let a = hash[0], b = hash[1], c = hash[2], d = hash[3];
    let e = hash[4], f = hash[5], g = hash[6], h = hash[7];

    for (j = 0; j < 64; j++) {
      const S1 = rightRotate(e, 6) ^ rightRotate(e, 11) ^ rightRotate(e, 25);
      const ch = (e & f) ^ ((~e) & g);
      const temp1 = (h + S1 + ch + k[j] + w[j]) | 0;
      const S0 = rightRotate(a, 2) ^ rightRotate(a, 13) ^ rightRotate(a, 22);
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const temp2 = (S0 + maj) | 0;

      h = g;
      g = f;
      f = e;
      e = (d + temp1) | 0;
      d = c;
      c = b;
      b = a;
      a = (temp1 + temp2) | 0;
    }

    hash[0] = (hash[0] + a) | 0;
    hash[1] = (hash[1] + b) | 0;
    hash[2] = (hash[2] + c) | 0;
    hash[3] = (hash[3] + d) | 0;
    hash[4] = (hash[4] + e) | 0;
    hash[5] = (hash[5] + f) | 0;
    hash[6] = (hash[6] + g) | 0;
    hash[7] = (hash[7] + h) | 0;
  }

  for (i = 0; i < 8; i++) {
    for (j = 3; j >= 0; j--) {
      const b = (hash[i] >> (8 * j)) & 255;
      result += (b < 16 ? '0' : '') + b.toString(16);
    }
  }

  return result;
}

// Helper: Uint8Array <-> Base64 conversion
export function uint8ArrayToBase64(bytes: Uint8Array): string {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

export function base64ToUint8Array(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

/**
 * Derive AES-GCM-256 Key using PBKDF2 with 100,000 SHA-256 iterations
 */
async function deriveKey(passphrase: string, salt: Uint8Array): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const baseKey = await globalThis.crypto.subtle.importKey(
    'raw',
    enc.encode(passphrase),
    'PBKDF2',
    false,
    ['deriveKey']
  );

  return globalThis.crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt as any,
      iterations: 100000,
      hash: 'SHA-256',
    },
    baseKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Authenticated Encryption using AES-GCM-256 with unique 12-byte IV and 16-byte PBKDF2 Salt
 */
export async function encryptAesGcm(plainText: string, passphrase: string): Promise<EncryptedStoragePayload> {
  if (!passphrase || passphrase.trim().length < 6) {
    throw new Error('Vault passphrase must be at least 6 characters long.');
  }

  const salt = globalThis.crypto.getRandomValues(new Uint8Array(16));
  const iv = globalThis.crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(passphrase, salt);

  const enc = new TextEncoder();
  const encryptedBuf = await globalThis.crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: iv as any },
    key,
    enc.encode(plainText)
  );

  return {
    version: '2.0.0',
    encrypted: true,
    algorithm: 'AES-GCM-256',
    iterations: 100000,
    salt: uint8ArrayToBase64(salt),
    iv: uint8ArrayToBase64(iv),
    ciphertext: uint8ArrayToBase64(new Uint8Array(encryptedBuf)),
  };
}

/**
 * Authenticated Decryption using AES-GCM-256
 */
export async function decryptAesGcm(payload: EncryptedStoragePayload, passphrase: string): Promise<string> {
  if (!payload || !payload.ciphertext || !payload.iv || !payload.salt) {
    throw new Error('Malformed encrypted payload: missing required ciphertext, IV, or salt.');
  }

  const salt = base64ToUint8Array(payload.salt);
  const iv = base64ToUint8Array(payload.iv);
  const ciphertextBytes = base64ToUint8Array(payload.ciphertext);

  const key = await deriveKey(passphrase, salt);

  try {
    const decryptedBuf = await globalThis.crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: iv as any },
      key,
      ciphertextBytes as any
    );
    const dec = new TextDecoder();
    return dec.decode(decryptedBuf);
  } catch (err) {
    throw new Error('Decryption failed: Incorrect passphrase or corrupted ciphertext payload.');
  }
}

/**
 * Generate asymmetric ECDSA P-256 keypair for studio identity and non-repudiation
 */
export async function generateStudioKeypair(): Promise<{ publicKeyJwk: any; privateKeyJwk: any }> {
  const keypair = await globalThis.crypto.subtle.generateKey(
    { name: 'ECDSA', namedCurve: 'P-256' },
    true,
    ['sign', 'verify']
  );

  const publicKeyJwk = await globalThis.crypto.subtle.exportKey('jwk', keypair.publicKey);
  const privateKeyJwk = await globalThis.crypto.subtle.exportKey('jwk', keypair.privateKey);

  return { publicKeyJwk, privateKeyJwk };
}

/**
 * Digitally sign a SHA-256 fingerprint using the studio's private ECDSA P-256 key
 */
export async function signArtworkFingerprint(fingerprint: string, privateKeyJwk: any): Promise<string> {
  const privateKey = await globalThis.crypto.subtle.importKey(
    'jwk',
    privateKeyJwk,
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['sign']
  );

  const enc = new TextEncoder();
  const signatureBuf = await globalThis.crypto.subtle.sign(
    { name: 'ECDSA', hash: { name: 'SHA-256' } },
    privateKey,
    enc.encode(fingerprint)
  );

  return uint8ArrayToBase64(new Uint8Array(signatureBuf));
}

/**
 * Verify an ECDSA P-256 digital signature over a SHA-256 fingerprint using public key
 */
export async function verifyArtworkSignature(
  fingerprint: string,
  signatureBase64: string,
  publicKeyJwk: any
): Promise<boolean> {
  try {
    const publicKey = await globalThis.crypto.subtle.importKey(
      'jwk',
      publicKeyJwk,
      { name: 'ECDSA', namedCurve: 'P-256' },
      false,
      ['verify']
    );

    const enc = new TextEncoder();
    const signatureBytes = base64ToUint8Array(signatureBase64);

    return await globalThis.crypto.subtle.verify(
      { name: 'ECDSA', hash: { name: 'SHA-256' } },
      publicKey,
      signatureBytes as any,
      enc.encode(fingerprint)
    );
  } catch (err) {
    return false;
  }
}

/**
 * Generate canonical SHA-256 fingerprint from artwork metadata
 */
export function generateArtworkFingerprint(meta: {
  title: string;
  artistName: string;
  yearCreated: number;
  medium: string;
  dimensionsText: string;
  editionText?: string;
  uniqueSalt?: string;
}): string {
  const canonicalString = [
    `TITLE=${meta.title.trim().toUpperCase()}`,
    `ARTIST=${meta.artistName.trim().toUpperCase()}`,
    `YEAR=${meta.yearCreated}`,
    `MEDIUM=${meta.medium.trim().toUpperCase()}`,
    `DIMENSIONS=${meta.dimensionsText.trim()}`,
    `EDITION=${(meta.editionText || 'Original 1 of 1').trim().toUpperCase()}`,
    `ISSUER=MORROWKIND-PROVENANCE-VAULT`,
    `SALT=${meta.uniqueSalt || 'MK-SECURE-2026'}`
  ].join('|');

  return sha256(canonicalString);
}

/**
 * Verify whether an artwork matches an existing certificate fingerprint
 */
export function verifyArtworkFingerprint(
  storedFingerprint: string,
  meta: {
    title: string;
    artistName: string;
    yearCreated: number;
    medium: string;
    dimensionsText: string;
    editionText?: string;
    uniqueSalt?: string;
  }
): boolean {
  const calculated = generateArtworkFingerprint(meta);
  return calculated.toLowerCase() === storedFingerprint.toLowerCase();
}

/**
 * Generate a self-contained portable proof token for cross-device verification
 * Encodes all necessary metadata and cryptographic signatures into a compact, URL-safe Base64 token
 */
export function createPortableProofToken(cert: DigitalCertificate): string {
  const payload: PortableProofPayload = {
    v: '2.0',
    id: cert.certificateId,
    t: cert.artworkTitle,
    a: cert.artistName,
    y: cert.yearCreated,
    m: cert.medium,
    d: cert.dimensionsText,
    e: cert.editionText,
    dt: cert.issueDate,
    iss: cert.issuer || 'Morrowkind Provenance Vault',
    h: cert.sha256Fingerprint,
    sig: cert.ecdsaSignature || '',
    pk: cert.publicKeyJwk || null,
    st: cert.status,
    rr: cert.revocationReason || '',
  };

  const jsonStr = JSON.stringify(payload);
  const b64 = uint8ArrayToBase64(new TextEncoder().encode(jsonStr));
  // Make URL-safe
  return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/**
 * Unpack and verify a self-contained portable proof token on ANY third-party device
 * Implements strict schema validation, oversized payload defense, cryptographic verification,
 * and explicit non-repudiation / identity distinction states.
 */
export async function verifyPortableProofToken(token: string): Promise<VerificationOutcome> {
  // 1. Guard against oversized payload attacks (> 64KB)
  if (!token || typeof token !== 'string') {
    return {
      isValid: false,
      status: 'STATUS_UNAVAILABLE',
      statusMessage: 'Empty or invalid proof token string provided.',
      isHashValid: false,
      isSignatureVerified: false,
      issuerIdentityType: 'unknown',
      isOfflineProof: false,
      error: 'Proof token is missing or not a string.'
    };
  }

  if (token.length > 65536) {
    return {
      isValid: false,
      status: 'STATUS_UNAVAILABLE',
      statusMessage: 'Proof token exceeds allowable 64KB payload boundary.',
      isHashValid: false,
      isSignatureVerified: false,
      issuerIdentityType: 'unknown',
      isOfflineProof: false,
      error: 'Oversized proof token payload rejected to prevent memory exhaustion.'
    };
  }

  try {
    // Restore base64 padding
    let base64 = token.replace(/-/g, '+').replace(/_/g, '/');
    while (base64.length % 4) {
      base64 += '=';
    }

    const jsonBytes = base64ToUint8Array(base64);
    const jsonStr = new TextDecoder().decode(jsonBytes);
    const p = JSON.parse(jsonStr);

    // Schema and required field checks
    if (!p.id || !p.t || !p.h) {
      return {
        isValid: false,
        status: 'STATUS_UNAVAILABLE',
        statusMessage: 'Malformed proof payload: missing required identification fields.',
        isHashValid: false,
        isSignatureVerified: false,
        issuerIdentityType: 'unknown',
        isOfflineProof: false,
        error: 'Malformed proof payload'
      };
    }

    if (p.v && p.v !== '2.0' && p.v !== '1.0') {
      return {
        isValid: false,
        status: 'STATUS_UNAVAILABLE',
        statusMessage: `Incompatible token schema version: ${p.v}. Expected 2.0.`,
        isHashValid: false,
        isSignatureVerified: false,
        issuerIdentityType: 'unknown',
        isOfflineProof: false,
        error: `Incompatible schema version: ${p.v}`
      };
    }

    // 2. Recalculate SHA-256 fingerprint from unpacked metadata
    const recalculatedHash = generateArtworkFingerprint({
      title: p.t,
      artistName: p.a || '',
      yearCreated: p.y || 0,
      medium: p.m || '',
      dimensionsText: p.d || '',
      editionText: p.e || '',
      uniqueSalt: p.id,
    });

    const isHashValid = recalculatedHash.toLowerCase() === p.h.toLowerCase();
    if (!isHashValid) {
      return {
        isValid: false,
        status: 'PAYLOAD_TAMPERED',
        statusMessage: 'Cryptographic hash mismatch! Artwork attributes have been tampered with or altered.',
        isHashValid: false,
        isSignatureVerified: false,
        issuerIdentityType: 'unknown',
        isOfflineProof: true,
        error: 'Cryptographic hash mismatch! The artwork attributes have been modified.',
        offlineRevocationNotice: OFFLINE_REVOCATION_DISCLAIMER,
        legalDisclaimer: LEGAL_IDENTITY_DISCLAIMER,
        keyRecoveryNotice: KEY_RECOVERY_LIMITATION_NOTICE,
      };
    }

    // 3. Verify ECDSA signature if present
    let isSignatureVerified = false;
    if (p.sig && p.pk) {
      isSignatureVerified = await verifyArtworkSignature(p.h, p.sig, p.pk);
      if (!isSignatureVerified) {
        return {
          isValid: false,
          status: 'SIGNATURE_INVALID',
          statusMessage: 'ECDSA signature invalid! The signature does not correspond to the public key.',
          isHashValid: true,
          isSignatureVerified: false,
          issuerIdentityType: 'unknown',
          isOfflineProof: true,
          error: 'Signature mathematical verification failed.',
          offlineRevocationNotice: OFFLINE_REVOCATION_DISCLAIMER,
          legalDisclaimer: LEGAL_IDENTITY_DISCLAIMER,
          keyRecoveryNotice: KEY_RECOVERY_LIMITATION_NOTICE,
        };
      }
    }

    const reconstructedCert: DigitalCertificate = {
      schemaVersion: p.v || '2.0',
      certificateId: p.id,
      artworkId: `art-${p.id}`,
      artworkTitle: p.t,
      artistName: p.a,
      yearCreated: p.y,
      medium: p.m,
      dimensionsText: p.d,
      editionText: p.e,
      issueDate: p.dt,
      issuer: p.iss || 'Morrowkind Provenance Vault (Self-Verifying Proof)',
      sha256Fingerprint: p.h,
      ecdsaSignature: p.sig,
      publicKeyJwk: p.pk,
      verificationUrl: typeof window !== 'undefined' ? window.location.href : '',
      status: p.st || 'valid',
      revocationReason: p.rr || '',
      legalNotice: PROVENANCE_LEGAL_NOTICE,
      blockchainAnchor: {
        isAnchored: false,
        note: 'Verified offline via self-contained ECDSA cryptographic token.',
      },
    };

    // 4. Check revocation / superseded status
    if (p.st === 'revoked') {
      return {
        isValid: false,
        status: 'CERTIFICATE_REVOKED',
        statusMessage: `Certificate revoked by issuer. Reason: ${p.rr || 'No reason specified'}`,
        isHashValid: true,
        isSignatureVerified,
        issuerIdentityType: 'self-issued-unverified',
        isOfflineProof: true,
        cert: reconstructedCert,
        offlineRevocationNotice: OFFLINE_REVOCATION_DISCLAIMER,
        legalDisclaimer: LEGAL_IDENTITY_DISCLAIMER,
        keyRecoveryNotice: KEY_RECOVERY_LIMITATION_NOTICE,
      };
    }

    if (p.st === 'superseded') {
      return {
        isValid: false,
        status: 'CERTIFICATE_SUPERSEDED',
        statusMessage: 'Certificate has been superseded by a newly issued replacement certificate.',
        isHashValid: true,
        isSignatureVerified,
        issuerIdentityType: 'self-issued-unverified',
        isOfflineProof: true,
        cert: reconstructedCert,
        offlineRevocationNotice: OFFLINE_REVOCATION_DISCLAIMER,
        legalDisclaimer: LEGAL_IDENTITY_DISCLAIMER,
        keyRecoveryNotice: KEY_RECOVERY_LIMITATION_NOTICE,
      };
    }

    // 5. Success state: distinguish mathematical validity from verified legal identity
    return {
      isValid: true,
      status: isSignatureVerified ? 'SIGNATURE_VALID_ISSUER_UNVERIFIED' : 'PAYLOAD_INTEGRITY_VERIFIED',
      statusMessage: isSignatureVerified
        ? 'Payload integrity and ECDSA digital signature verified. Issuer identity is self-issued and unverified by independent CA.'
        : 'Payload integrity confirmed via SHA-256 fingerprint.',
      isHashValid: true,
      isSignatureVerified,
      issuerIdentityType: 'self-issued-unverified',
      isOfflineProof: true,
      cert: reconstructedCert,
      offlineRevocationNotice: OFFLINE_REVOCATION_DISCLAIMER,
      legalDisclaimer: LEGAL_IDENTITY_DISCLAIMER,
      keyRecoveryNotice: KEY_RECOVERY_LIMITATION_NOTICE,
    };
  } catch (err: any) {
    return {
      isValid: false,
      status: 'STATUS_UNAVAILABLE',
      statusMessage: `Failed to decode proof token: ${err.message}`,
      isHashValid: false,
      isSignatureVerified: false,
      issuerIdentityType: 'unknown',
      isOfflineProof: false,
      error: `Failed to decode proof token: ${err.message}`,
    };
  }
}

/**
 * Helper to check certificate validity status
 */
export function isCertificateValid(cert: DigitalCertificate): boolean {
  return cert.status === 'valid';
}
