# AGENTS.md — Engineering Rules, Safety Boundaries & Quality Standards

## Mission Context
Morrowkind is an Artist Intelligence Platform combining a private, client-side studio management workspace with a verified public art discovery directory.

Production Application: https://utkarshnikhare.github.io/art-gallery-live/
Repository: https://github.com/utkarshnikhare/art-gallery-live/
Protected External Project: `C:\Users\Admin\.gemini\antigravity\scratch\excel-manager` (**STRICTLY UNTOUCHED**)

---

## Mandatory Engineering Rules

1. **Evidence-Based Quality:** Never claim a test passed unless it actually executed successfully with verifiable output.
2. **Zero Fabrication:** Never fabricate test output, synthetic user counts, performance metrics, screenshots, deployment status, or source verification evidence.
3. **Reproduce Before Fixing:** Reproduce every defect before implementing code changes whenever safe and feasible.
4. **Structured Defect Accounting:** Record severity, impact, reproduction steps, root cause, fix, and regression test in `docs/DEFECT_REGISTER.md` for each confirmed issue.
5. **Negative Path Testing:** Explicitly test failure paths, invalid inputs, tampered payloads, and boundaries, not only happy paths.
6. **Data Safety & Isolation:** Use isolated disposable test datasets and separate browser contexts. Never overwrite, corrupt, or wipe real user data during testing.
7. **Zero Secret Leakage:** Never expose passwords, passphrases, encryption keys, tokens, or private studio data in logs, console output, or telemetry.
8. **No Weakened Defenses:** Never weaken security controls, reduce iterations, bypass validation, or delete assertions to make a test suite pass.
9. **Backward Compatibility:** Preserve legitimate user data across storage format migrations. Ensure existing records remain fully accessible.
10. **Release Gates:** Never deploy known P0 or P1 defects. Verify the built production artifact (`dist/`), not merely the local Vite dev server.
11. **Deploy Verification:** Verify that the deployed commit hash corresponds exactly to the tested source code.
12. **Honest Environment Claims:** Distinguish browser-emulated device testing from physical-device testing. Distinguish client-side storage architecture from server-enforced multi-tenancy.
13. **Protected Project Boundary:** Never read, touch, stage, or modify files in `C:\Users\Admin\.gemini\antigravity\scratch\excel-manager`.
14. **Documented Limitations:** If a test is blocked by unavailable infrastructure or third-party unavailability, explicitly record the limitation.

---

## Severity Definitions

- **P0 / Critical:** Active security compromise, catastrophic data loss, cross-workspace private data exposure, or immediate release-blocking failure.
- **P1 / High:** Serious security weakness, unauthorized data modification, major storage corruption, or critical workflow failure.
- **P2 / Medium:** Important functional defect, significant usability failure, financial calculation rounding error, or meaningful reliability/performance bottleneck.
- **P3 / Low:** Minor visual flaw, noncritical layout glitch, or minor documentation inconsistency.
