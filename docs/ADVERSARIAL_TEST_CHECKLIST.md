# Adversarial Test Checklist — Morrowkind Platform

This checklist enumerates specific attack surfaces, edge cases, negative tests, and verification methods.

## 1. Authentication & Vault Protection
- [x] Blank passcode rejection on lock screen.
- [x] Whitespace-only passcode rejection.
- [x] Missing / unconfigured passcode rejects default `1234` and any arbitrary passcode.
- [x] Explicit notice distinguishing visual screen curtain from AES-256 storage encryption.
- [x] AES-256-GCM authenticated decryption rejects wrong passphrase with `OperationError`.
- [x] Storage migration to AES-256 purges residual plaintext from `localStorage`.
- [x] Safe reverse migration back to standard mode preserves data integrity.
- [x] In unencrypted mode, resetting passcode preserves all artwork and financial records without data loss.

## 2. Cryptographic Proofs & Identity
- [x] Modifying covered artwork metadata changes SHA-256 hash.
- [x] Tampered ECDSA signature bytes fail cryptographic verification.
- [x] Self-signed certificates from unknown public keys flagged as `SIGNATURE_VALID_ISSUER_UNVERIFIED`.
- [x] Certificate revocation state renders active warning and disables valid status.
- [x] Portable proof tokens larger than 64KB rejected to prevent QR buffer exhaustion.
- [x] Offline QR SVG generation creates deterministic valid vector payloads without internet access.

## 3. Injection, Deserialization & File Imports
- [x] CSV formula injection: Cells starting with `=`, `+`, `-`, `@`, `\t`, `\r` are sanitized with leading single quote.
- [x] Oversized CSV files (>5MB) rejected before parser memory exhaustion.
- [x] Multiline CSV cells with embedded quotes and commas parsed according to RFC-4180.
- [x] Missing required columns (e.g. Dimensions) rejected with structured row errors.
- [x] Corrupted JSON backups rejected safely without overwriting current workspace.
- [x] Cross-Site Scripting (XSS): Artwork titles, descriptions, and notes containing `<script>` or `<img onerror>` rendered safely as plain text React nodes.

## 4. Multi-Tenant Workspace Isolation
- [x] Switching studio tenants partitions `localStorage` keys (`morrowkind_workspace_<tenantId>`).
- [x] IndexedDB asset blobs partitioned by tenant identifier.
- [x] Deleting an asset in tenant B does not affect tenant A.
- [x] Switching workspaces in one tab does not bleed unsaved state into another tab.

## 5. Financial & Mathematical Integrity
- [x] Sales net proceeds calculated from `gross - (gross * commission / 100)`.
- [x] Negative commission rates (<0%) and rates >100% rejected by validation.
- [x] Partial payments tracked with remaining balance due; does not recognize premature total cash.
- [x] FX engine converts using documented benchmark matrix and strictly disclaims live real-time rate access.
- [x] Exhibition ROI calculates net profit `(sales revenue - expenses) / expenses * 100`.
