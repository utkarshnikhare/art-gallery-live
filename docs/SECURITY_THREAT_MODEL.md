# Security Threat Model — Morrowkind Artist Intelligence Platform

## 1. System Architecture & Trust Boundaries
Morrowkind operates as a client-side Single Page Application (SPA) hosted on GitHub Pages static CDN.

```
                      +---------------------------------------+
                      |       Public Internet / Users         |
                      +-------------------+-------------------+
                                          |
                                          v (HTTPS / Read-Only)
                      +-------------------+-------------------+
                      |   GitHub Pages Static Content CDN     |
                      |   - index.html, JS/CSS bundles        |
                      |   - public/data (events, opps, arts)  |
                      +-------------------+-------------------+
                                          |
                                          v
+---------------------------------------------------------------------------------+
| Browser Execution Sandbox (Client-Side Origin)                                  |
|                                                                                 |
|  +---------------------------+        +---------------------------------------+ |
|  | Public Discovery Realm    |        | Artist Private Workspace Realm        | |
|  | - Exhibitions directory   |        | - Artworks Inventory                  | |
|  | - Open Calls              |        | - Collectors & CRM                    | |
|  | - Trade Designers         |        | - Sales & Financial Analytics         | |
|  | - COA Verification Tool   |        | - Certificates & Asymmetric Keys      | |
|  +---------------------------+        +---------------------------------------+ |
|                                           |                   |                 |
|                                           v                   v                 |
|                             +--------------------+  +-------------------------+ |
|                             | localStorage       |  | IndexedDB               | |
|                             | - Plaintext Mode   |  | (High-Res Asset Blobs   | |
|                             | - AES-GCM-256 Mode |  |  with quota monitoring) | |
|                             +--------------------+  +-------------------------+ |
+---------------------------------------------------------------------------------+
```

### Trust Boundaries
1. **Public vs Private Realm**: Public discovery consumes static JSON assets. Private workspace persists strictly inside the client's browser origin.
2. **Standard Mode vs Encrypted Mode**:
   - *Standard Mode*: Plaintext in `localStorage`, guarded visually by a shoulder-surfing screen curtain.
   - *Encrypted-at-Rest Mode*: Authenticated AES-GCM-256 encryption using PBKDF2 (100,000 iterations). Raw disk inspection reveals zero plaintext.
3. **Cryptographic Proofs**:
   - Digital certificates use SHA-256 digests and ECDSA P-256 asymmetric signatures.
   - Self-signed public keys do NOT equate to legal proof of identity without institutional anchoring.

## 2. Threat Analysis (STRIDE)

| Threat Category | Description & Attack Vector | Mitigation in Morrowkind |
| :--- | :--- | :--- |
| **Spoofing** | Attacker crafts a fake Certificate of Authenticity (COA) with a valid self-generated key. | Verification modal flags unknown signers as `SIGNATURE_VALID_ISSUER_UNVERIFIED`. Signature validity is separated from real-world identity. |
| **Tampering** | Alteration of artwork dimensions, dates, or prices in transit or in JSON/CSV imports. | Cryptographic SHA-256 hash checking over covered fields; strict validation schemas on import. |
| **Repudiation** | An artist denies having issued a certificate. | ECDSA P-256 digital signature over canonicalized artwork specification payload. |
| **Information Disclosure** | Shoulder-surfing in the physical studio or extraction of browser storage. | Studio Privacy Curtain hides display; AES-256 storage migration encrypts disk state; zero telemetry/cloud leakage. |
| **Denial of Service** | Corrupted import files, massive CSVs, or IndexedDB storage exhaustion. | File size limits (5MB CSV, 10MB JSON), streaming row-by-row validation, and storage quota pre-checks. |
| **Elevation of Privilege** | Cross-tenant data contamination or script injection (XSS/CSV formula injection). | Client-side tenant namespace partitioning; RFC-4180 sanitization stripping formula prefixes (`=`, `+`, `-`, `@`, `\t`, `\r`). |
