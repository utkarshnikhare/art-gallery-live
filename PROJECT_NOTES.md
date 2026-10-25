# ART GALLERY LIVE — DATA INTEGRITY AUDIT & ENGINEERING LOG

**Audit Date**: 25 October 2026  
**Auditor**: Antigravity Technical Lead & Senior Data Integrity Engineer  
**Project Root**: `C:\Users\Admin\.gemini\antigravity\scratch\art-gallery-live`  
**Git Root**: `C:\Users\Admin\.gemini\antigravity\scratch\art-gallery-live\.git`  
**Repository**: [https://github.com/utkarshnikhare/art-gallery-live](https://github.com/utkarshnikhare/art-gallery-live)  
**Public Application URL**: [https://utkarshnikhare.github.io/art-gallery-live/](https://utkarshnikhare.github.io/art-gallery-live/)  

---

## 1. Data Integrity Audit & Remediation Findings

### A. Non-Negotiable Integrity Rules Applied
1. **Exhibition-Level Grounding**: An institution homepage alone is insufficient. Listings must link to a specific exhibition announcement or catalog.
2. **Honest Admission Fees**: Free entry is never assumed. Unconfirmed fees are explicitly labeled `Fee: Check Organiser`.
3. **Quarantine Review Queue**: Permanent museum collections, rotating schedules without named artist lineups, and unverified leads are segregated into `review_queue.json` and excluded from the public directory.
4. **Field-Level Verification Tracking**: Every event explicitly tracks verified fields (`['title', 'dates', 'venue', 'admissionFee', 'organiser']`) and includes an exact `lastVerifiedAt` timestamp.

### B. Audit Breakdown of Candidate Records
- **Original Candidate Records**: 18
- **Confirmed & Retained (with exhibition evidence)**: 13
- **Corrected to Specific Installment**: 1 (*Where the Body Begins: Body* at VHC Pune)
- **New Verified Exhibitions Added**: 4
  - *Prajith Ellampilal & Ramansh Bhargava: (Not) In Plain Sight* (VHC Pune)
  - *The Shapes of Elsewhere* by Kalpana Shah (Tao Art Gallery Mumbai)
  - *Sarnath Banerjee: Badly Remembered Things* (Project 88 Mumbai)
  - *From Line to Landscape: Works on Paper* (Akara Modern Mumbai)
- **Quarantined to Review Queue (`public/data/review_queue.json`)**: 5
  - `evt-jehangir-rotating-show`: Rotating hall display notice. Lacks individual artist exhibition confirmation.
  - `evt-darpan-pune-oct`: Kalachhaya Campus general showcase. Lacks dedicated exhibition catalog.
  - `evt-kelkar-heritage`: Raja Dinkar Kelkar permanent collection. Not a time-bounded special exhibition.
  - `evt-monalisa-autumn-craft`: Monalisa Kalagram seasonal workshop lead. Lacks verified dates/ticket link.
  - `evt-zapurza-collection`: Zapurza permanent display. Permanent museum collection rather than time-bounded special exhibition.
- **Total Published Confirmed Records**: **17 verified events** (10 Happening Now, 7 Upcoming)

---

## 2. Source Coverage & Health Assessment

- **Total Monitored Institutions**: 16
  - **Healthy (HTTP 200 & verified events)**: 15
  - **Degraded (rotating calendar under revision)**: 1 (*Jehangir Art Gallery*, leads quarantined in review queue)
- Full per-source metrics, collection methods, and limitations are published in [`SOURCE_COVERAGE_REPORT.md`](file:///SOURCE_COVERAGE_REPORT.md).

---

## 3. Automated Test Suite Metrics

All tests executed via `npm test`:
- **Unit & Adversarial Integrity Suite (`tests/unit.test.mjs`)**: **16 PASSED, 0 FAILED**
  1. Valid event passes schema & field-level validation.
  2. Fake event with placeholder/demo link is rejected.
  3. Missing critical field-level verification fails validation.
  4. Conflicting dates (endDate before startDate) are rejected.
  5. Expired events are excluded from upcoming directory.
  6. Cancelled and postponed exhibitions are properly identified.
  7. Old records retained safely after a failed update.
  8. Empty or partially parsed source results do not wipe feed.
  9. Free admission cannot be claimed without organiser confirmation.
  10. Invalid booking link is rejected.
  11. Timezone and date-only boundaries do not cause off-by-one shifts.
  12. Multi-day events show happening-now during exhibition run.
  13. Duplicate detection distinguishes different dates or sessions.
  14. Missing lastVerifiedAt timestamp is rejected.
  15. Search matches title, venue, organiser and city case-insensitively.
  16. Combined filters apply strict AND logic.
- **Browser E2E Suite (`tests/e2e.test.mjs`)**: **15 PASSED, 0 FAILED**
  - Tested on desktop (1366×768) and mobile (390×844) viewports: 0 console errors, zero overflow, responsive layout, modal dialogs, and authentic link navigation.
- **Production Verification (`scripts/verify_live_deployment.mjs`)**: **100% SUCCESS** on live GitHub Pages deployment.

---

## 4. Project Isolation Guarantee
Search Utility (`excel-manager`) remains completely untouched. No shared files, configurations, workflows, or repositories.
