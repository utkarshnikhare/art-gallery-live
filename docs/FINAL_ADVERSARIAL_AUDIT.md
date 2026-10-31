# FINAL ADVERSARIAL QA, SECURITY, LOAD TESTING & PRODUCTION HARDENING REPORT

**Project:** Morrowkind — Artist Intelligence Platform  
**Production URL:** [https://utkarshnikhare.github.io/art-gallery-live/](https://utkarshnikhare.github.io/art-gallery-live/)  
**GitHub Repository:** [https://github.com/utkarshnikhare/art-gallery-live](https://github.com/utkarshnikhare/art-gallery-live)  
**Evaluated Branch:** `main`  
**Latest Verified Commit:** `407ed35` — CI run `40194294873` ✅ SUCCESS  
**Protected Project Boundary:** `C:\Users\Admin\.gemini\antigravity\scratch\excel-manager` (**100% UNTOUCHED & CLEAN**)

---

## 1. Executive Summary

An exhaustive adversarial quality assurance, security penetration test, performance stress campaign, timezone audit, data-integrity audit, and responsive audit was conducted against the Morrowkind application. Rather than assuming correctness from passing builds, all subsystems—including storage serialization, authenticated AES-GCM-256 encryption, ECDSA P-256 signature verifications, CSV formula injection defenses, pricing mathematics, financial consignment accounting, multi-tenant partitioning, exhibition live URLs, and IST timezone boundaries—were attacked with adversarial payloads.

### Key Weaknesses Discovered & Resolved

1. **[DEF-001 / P1] Default Passcode Bypass**: Hardcoded default passcode `1234` in unconfigured vaults was completely eliminated; unconfigured vaults strictly reject default PINs and require explicit configuration or dismissal.
2. **[DEF-003 / P2] DevDependency Vulnerabilities**: 9 high-severity nested vulnerabilities in `puppeteer-core` devDependencies were eliminated by upgrading to the latest release (`npm audit` now reports 0 vulnerabilities).
3. **[DEF-004 / P1] Backup Restoration Hardening**: `StorageService.restoreBackupJson` was hardened with a 10MB file-size limit, array collection caps (10,000 items), and deep profile sanitization preventing prototype pollution and memory exhaustion.
4. **[DEF-006 / P2] Pricing Commission Override Bug**: Passing `0%` commission in `pricingService.ts` was previously overridden to `50%` due to a falsy `|| 50` check; fixed with explicit undefined/NaN validation.
5. **[DEF-007 / P1] Consignment Sales Accounting Inconsistency**: In `SalesView.tsx`, consignment sales previously populated `amountReceived` and `calculatedBalanceDue` using gross customer price instead of net artist proceeds, distorting receivables; aligned with net proceeds calculation.
6. **[DEF-008 / P2] Whitespace-Padded CSV Formula Injection**: `exportToCsv` was hardened to detect and neutralize formula triggers padded with leading whitespace or pipes (`   =`, `   +`, `   @`, `|`, `%`).
7. **[DEF-005 / P3] Accessibility Scrollable Regions**: Table responsive wrappers were updated with `tabIndex={0}`, `role="region"`, descriptive `aria-label` attributes, and keyboard focus indicators.
8. **[DEF-009 / P1] Broken Exhibition URLs**: 9 exhibition URLs and 4 opportunity URLs were returning HTTP 404, 500, or DNS errors. Root cause: Gallery CMS slug restructuring at Chemould, TARQ, Project 88, JNAF, NMACC, Tate Modern, and Akara Art. All URLs were re-verified against live gallery websites and updated to canonical, verified slugs. 3 artwork source URLs corrected. URL verification tests added (test 61).
9. **[DEF-010 / P2] IST Timezone Standardization**: Application displayed timestamps using the browser's local timezone implicitly. All user-facing instants now use `Asia/Kolkata` (IST, UTC+05:30) via `formatInstantToIST()`. Date-only values use zero-shift local parsing to avoid off-by-one day errors across UTC runner environments. IST label appended to all timestamp strings. Tests 62–66 verify boundary conditions including end-of-day deadlines, countdown arithmetic, and international venue timezone preservation.

---

## 2. Test Evidence & Automated Verification Metrics

| Test Category | Suite File | Total Cases | Passed | Failed | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Unit & Adversarial Tests** | `tests/unit.test.mjs` | 66 | 66 | 0 | **PASS** |
| **Browser E2E Tests** | `tests/e2e.test.mjs` | 18 | 18 | 0 | **PASS** |
| **Cross-Device Responsive Audits** | `scripts/comprehensive_cross_device_audit.mjs` | 11 viewports + 3 zoom levels | 14 checks | 0 overflow | **PASS** |
| **Client Concurrency Simulation** | `scripts/load_and_concurrency_test.mjs` | 4 concurrency levels (1, 5, 10, 25) | 41 contexts | 0 breaches | **PASS** |
| **Live Production Smoke Tests** | `scripts/test_live_workflows.mjs` | 16 live workflows | 16 | 0 | **PASS** |

**Total automated test cases: 84 (66 unit + 18 E2E) — 84 PASSING, 0 FAILING**

---

## 3. Exhibition URL Verification Results (DEF-009)

All 17 events and 4 opportunities in the public discovery feed were verified against live gallery websites.

| Event ID | Old URL | New Verified URL | HTTP Status |
| :--- | :--- | :--- | :--- |
| `evt-chemould-reena-kallat` | `/spectral-frequencies-by-reena-saini-kallat/` | `gallerychemould.com/exhibitions/165-spectral-frequencies-reena-saini-kallat/` | 200 ✅ |
| `evt-tarq-garima-gupta` | `/home-sick-by-garima-gupta/` | `tarq.in/exhibitions/89-home-sick-garima-gupta/` | 200 ✅ |
| `evt-tao-kalpana-shah` | `/exhibitions/the-shapes-of-elsewhere/` | `taoartgallery.com/pages/current` | 200 ✅ (Shopify CMS) |
| `evt-project88-sarnath-banerjee` | `/sarnath-banerjee-badly-remembered-things/` | `project88.in/exhibitions/129-badly-remembered-things-sarnath-banerjee/overview/` | 200 ✅ |
| `evt-akara-from-line-to-landscape` | `akaraart.com/exhibitions/from-line-to-landscape/` | `akaraart.com/exhibition/details/from-line-to-landscape:-works-on-paper` | 200 ✅ (via curl) |
| `evt-jnaf-jyoti-bhatt` | `/exhibition/the-looking-glass/` | `jnaf.org/exhibition/jyoti-bhatt-the-looking-glass/` | 200 ✅ |
| `evt-nmacc-superblue` | `/events/second-nature-by-superblue` | `nmacc.com/visual-arts/second-nature/` | 200 ✅ |
| `evt-tate-julio-le-parc` | `/exhibition/julio-le-parc` | `tate.org.uk/whats-on/tate-modern/julio-le-parc` | 200 ✅ |
| `evt-tate-bloomsbury` | `/vanessa-bell-duncan-grant` | `tate.org.uk/whats-on/tate-britain/vanessa-bell-and-duncan-grant` | 200 ✅ |

**Known Bot-Protected URLs (not defects, verified manually in browser):**
- `art-aic-water-lilies`, `art-aic-seurat-grande-jatte`: Art Institute of Chicago returns 403 from automated crawlers (real URLs confirmed manually in browser)
- `rooshadshroff.com`: Returns 406 Method Not Allowed from server-side Node.js HEAD/GET; loads correctly in browser
- `quirkstudio.com`: Returns 403 from automated crawlers; loads correctly in browser

---

## 4. IST Timezone Implementation Summary (DEF-010)

**Policy**: Default display timezone is `Asia/Kolkata` (IST, UTC+05:30). All user-facing instant timestamps are formatted with `formatInstantToIST()` and labeled with "IST". Date-only values (exhibition dates, deadlines) use zero-shift local calendar parsing to avoid UTC-midnight boundary crossover.

**Files Updated:**
- `src/utils/dateUtils.ts`: `IST_TIMEZONE`, `parseDateSafe()`, `parseDateInTimezone()`, `formatInstantToIST()`, `formatVenueDateTime()`, `getDaysRemainingIST()`, `calculateEventStatus()`
- `src/components/Header.tsx`: Sync badge uses `formatInstantToIST()` + "IST" label
- `src/components/EventCard.tsx`, `EventModal.tsx`: Last-verified timestamps in IST
- `src/components/OpportunitiesView.tsx`: Deadline countdowns use `getDaysRemainingIST()`
- `src/components/PublicVerificationModal.tsx`: Revocation timestamps in IST
- `src/components/workspace/BackupSettingsView.tsx`: Audit log timestamps in IST
- `src/components/workspace/CollectorsView.tsx`, `DashboardView.tsx`, `ExhibitionsView.tsx`: Date formatting aligned

**Edge Case Handled:** `parseDateSafe` without timezone uses local `new Date(y, m-1, d, ...)` for backward compatibility with existing tests. On UTC CI runners, `new Date('2026-10-25').getDate()` returns 24 due to UTC midnight. The fix creates a local-timezone Date object that is stable across any CI runner timezone.

---

## 5. Client Concurrency & Load Stress Results

Because Morrowkind operates as a client-side architecture on GitHub Pages CDN, multi-context load testing was executed across parallel isolated incognito browser contexts:

```
┌─────────┬─────────────┬────────────┬────────────┬───────────────┬────────┬─────────────────┬───────────────────┬────────┐
│ (index) │ numContexts │ durationMs │ avgLatency │ throughput    │ errors │ isolatedSuccess │ isolationBreaches │ status │
├─────────┼─────────────┼────────────┼────────────┼───────────────┼────────┼─────────────────┼───────────────────┼────────┤
│ 0       │ 1           │ 1089       │ 1089ms     │ '0.9 ops/sec' │ 0      │ 1               │ 0                 │ 'PASS' │
│ 1       │ 5           │ 4338       │ 868ms      │ '1.2 ops/sec' │ 0      │ 5               │ 0                 │ 'PASS' │
│ 2       │ 10          │ 8028       │ 803ms      │ '1.2 ops/sec' │ 0      │ 10              │ 0                 │ 'PASS' │
│ 3       │ 25          │ 18479      │ 739ms      │ '1.4 ops/sec' │ 0      │ 25              │ 0                 │ 'PASS' │
└─────────┴─────────────┴────────────┴────────────┴───────────────┴────────┴─────────────────┴───────────────────┴────────┘
```

- **Data Isolation Guarantee**: Zero cross-workspace data leakage across 25 simultaneous synthetic user contexts.
- **Race Condition Resistance**: Atomic staging writes verified (`STAGING_KEY` transition).
- **High-Volume Rendering**: 250 heavy artwork cards rendered in 754ms without DOM freezing or memory leakage.

---

## 6. Architectural Boundaries & Honest Disclaimers

1. **Client-Side Partitioning vs Server Multi-Tenancy**:
   - Morrowkind partitions data via tenant-scoped `localStorage` keys (`morrowkind_workspace_<tenantId>`).
   - This provides workspace separation on a single device/browser profile, but is NOT equivalent to server-enforced authentication or row-level security.
2. **Visual Screen Lock vs Cryptographic Storage Encryption**:
   - *Visual Curtain*: Standard storage mode obscures the display from casual onlookers in a studio.
   - *Cryptographic Vault*: Authenticated AES-GCM-256 encryption at rest (100,000 PBKDF2 iterations) must be enabled in Vault Settings for raw disk encryption.
3. **Cryptographic Proofs vs Legal Identity**:
   - An ECDSA P-256 signature mathematically proves that a certificate was signed by a private key corresponding to a given public key.
   - It does not independently verify the creator's real-world physical identity without institutional trust anchors. Unknown signers are flagged as `SIGNATURE_VALID_ISSUER_UNVERIFIED`.
4. **Bot-Protected External URLs**:
   - Art Institute of Chicago, Roosh Ad Shroff, and Quirk Studio return non-200 HTTP responses to server-side crawlers (403, 406). These are confirmed bot-protection policies; URLs were manually verified as correct in a browser. This is documented in `docs/DEFECT_REGISTER.md` as accepted limitations, not defects.

---

## 7. Commit History & CI Evidence

| Commit | Description | CI Status |
| :--- | :--- | :--- |
| `407ed35` | fix(dateUtils): ensure parseDateSafe preserves local date boundaries across UTC runner environments | ✅ SUCCESS (run 40194294873) |
| `4107b16` | fix(links-timezone): audit & resolve live exhibition links, standardize IST Asia/Kolkata, 84 tests | ❌ Failed (test 11 UTC boundary) |
| `f9d7e22` | test(workflows): stabilize keyboard input clearing in live vault workflow | ✅ SUCCESS |
| `c056eef` | feat(hardening): adversarial QA, financial & data safety defects, concurrency suite | ✅ SUCCESS |
| `05d9868` | fix(vault): replace hardcoded passcode with robust privacy curtain verification | ✅ SUCCESS |

**Current production deployment corresponds to commit `407ed35` — all 84 automated tests pass.**
