# Quality Assurance Plan — Morrowkind Artist Intelligence Platform

## 1. Overview & Objectives
This Quality Assurance Plan governs the testing, hardening, verification, and release standards for Morrowkind. The primary goal is guaranteeing correctness, security, client-side data safety, performance, and cross-device accessibility across the platform.

## 2. Testing Levels & Matrix
- **Unit & Adversarial Tests (`tests/unit.test.mjs`)**:
  - Pure algorithms: SHA-256 fingerprinting, ECDSA signature generation/verification, AES-GCM-256 encryption/decryption, FX benchmarks, pricing formulas, CSV RFC-4180 parsing, formula injection sanitization.
- **Browser E2E Tests (`tests/e2e.test.mjs`)**:
  - Full headless browser lifecycle: onboarding empty states, module transitions, pricing calculations, public discovery, search narrowing, and zero mobile overflow.
- **Cross-Device Responsive Audits (`scripts/comprehensive_cross_device_audit.mjs`)**:
  - Evaluates 11 viewports (320px to 1920px) and 3 browser zoom levels (125%, 150%, 200%).
- **Live Workflow Production Tests (`scripts/test_live_workflows.mjs`)**:
  - Real browser automation against deployed GitHub Pages production build testing 16 critical end-to-end workflows.
- **Client-Side Concurrency & Load Testing (`scripts/load_and_concurrency_test.mjs`)**:
  - Multi-context parallel execution assessing storage race conditions, IndexedDB concurrency, memory stability, and workspace isolation.

## 3. Release Criteria & Quality Gates
1. **Zero High/Critical Vulnerabilities:** `npm audit` must report 0 vulnerabilities in dependencies.
2. **100% Passing Test Suites:** All unit, integration, E2E, and adversarial tests must pass without skipped critical assertions.
3. **Production Build Integrity:** `tsc && vite build` must compile cleanly with 0 errors.
4. **Zero Layout Overflow:** Max width scroll width must equal client width on all 11 standardized viewports.
5. **No Data Cross-Contamination:** Multi-tenant workspace partitions and browser profiles must strictly isolate records.
6. **Live Deployment Verification:** Automated workflows must pass against the live GitHub Pages CDN URL.
