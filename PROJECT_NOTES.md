# ART GALLERY LIVE — PROJECT NOTES & ENGINEERING LOG

**Date**: 25 October 2026  
**Author**: Antigravity Assistant & Product Team  
**Project Root**: `C:\Users\Admin\.gemini\antigravity\scratch\art-gallery-live`  
**Git Root**: `C:\Users\Admin\.gemini\antigravity\scratch\art-gallery-live\.git`  
**Target Repository**: `https://github.com/utkarshnikhare/art-gallery-live`  
**Public Application URL**: `https://utkarshnikhare.github.io/art-gallery-live/`  

---

## 1. Architectural Decisions & Rationale

1. **Static Frontend Architecture (Vite + React 19 + TypeScript)**:
   - Zero-server overhead, maximum speed, hosted directly on GitHub Pages.
   - Restrained, gallery-grade CSS styling avoiding heavyweight UI component frameworks to keep page load fast.
   - Clean modular architecture: `Header`, `SearchBar`, `FilterBar`, `EventCard`, `EventModal`, `SourceDirectoryModal`, and `AboutModal`.
2. **Data Pipeline & Last-Known-Good Safety**:
   - `scripts/update_events.mjs`: Native Node.js ES module.
   - Atomic replacement: New data is written to `events.tmp.json`, verified against the strict schema, and only moved to `public/data/events.json` upon complete success.
   - Upstream failure protection: If an institution website is down or returns suspicious/empty data, the pipeline halts immediately and preserves the last known-good dataset and update timestamp.
   - Deduplication: Conservative key `title|venueName|startDate` ensures distinct exhibition sessions or workshop days are not merged.
3. **Honest Cultural Event Discovery (No Filler/Fabrication)**:
   - Admission fee: Missing fee information is explicitly shown as `Fee: Check Organiser` rather than falsely labeled as free.
   - Booking buttons: Rendered *only* when an authenticated, safe external ticket URL is verified. No dead `#` anchors or fake buttons.
   - Past events: Deterministically excluded from the default upcoming directory.
4. **Strict Multi-Faceted Filtering**:
   - Search query matches title, artist/curator, venue, city, and description case-insensitively.
   - Region filtering prioritizes Pune & PCMC, Mumbai Region, Maharashtra State, India, and International hubs.
   - Combined filters apply strict AND semantics; reset button restores default view in-place without page reload.

---

## 2. Inventory of Created Files

- `PROJECT_BOUNDARIES.md` — Strict isolation manifesto distinguishing Art Gallery Live from Search Utility (`excel-manager`).
- `PROJECT_NOTES.md` — Complete engineering record, test metrics, and deployment audit.
- `README.md` — Public documentation, usage guide, source registry, and contribution guidelines.
- `package.json` & `package-lock.json` — Dependencies, build scripts, and test commands.
- `tsconfig.json` — TypeScript compiler configuration with ES2022 and React 19 JSX support.
- `vite.config.ts` — Vite configuration with base path `/art-gallery-live/`.
- `index.html` — Accessible HTML shell with metadata and SVG favicon.
- `src/main.tsx` — React entry point.
- `src/App.tsx` — Main application component managing state, fetch, filtering, and modals.
- `src/index.css` — Custom accessible editorial art styles with responsive breakpoints and reduced-motion support.
- `src/types.ts` — Comprehensive TypeScript interfaces for events, filters, sources, and metadata.
- `src/vite-env.d.ts` — Vite client type declarations.
- `src/utils/dateUtils.ts` — Date parsing, status derivation, and human range formatting.
- `src/utils/filterUtils.ts` — Search query matching, region categorization, and multi-filter AND logic.
- `src/utils/validation.ts` — Strict event schema validator and URL security guard.
- `src/components/Header.tsx` — Application header with live timestamp and navigation buttons.
- `src/components/SearchBar.tsx` — Case-insensitive search bar with clear button and quick filter shortcuts.
- `src/components/FilterBar.tsx` — Detailed dropdown filters, results counter, and reset button.
- `src/components/EventCard.tsx` — Accessible event card displaying verified details, fee badges, and links.
- `src/components/EventModal.tsx` — Detailed exhibition popup dialog with full venue notes and dates.
- `src/components/SourceDirectoryModal.tsx` — Modal displaying registered institutions and collection status.
- `src/components/AboutModal.tsx` — Modal explaining data verification rules and accuracy policies.
- `public/data/events.json` — Production verified art event dataset.
- `public/data/sources.json` — Frontend source registry file.
- `scripts/sources.json` — Source registry configuration.
- `scripts/update_events.mjs` — Automated data ingestion, validation, and failure-protected sync script.
- `.github/workflows/deploy.yml` — Automated GitHub Pages build and deployment workflow.
- `.github/workflows/update-events.yml` — Scheduled daily data refresh workflow.
- `.gitignore` — Git exclusion rules.
- `tests/unit.test.mjs` — 16 unit and integration tests.
- `tests/e2e.test.mjs` — 15 browser E2E tests executing in headless Chrome/Edge.
- `tests/run-all-tests.mjs` — Master test runner orchestrating unit and E2E suites.

---

## 3. Verified Sources & Dataset Coverage

**Total Registered Sources**: 16  
**Total Verified Events**: 18  
- **Happening Now (Current)**: 10  
- **Upcoming**: 8  

### Implemented Sources:
1. **Zapurza Museum of Art & Culture** — `https://zapurza.org/` (Pune)
2. **Vida Heydari Contemporary (VHC)** — `https://vhc.art/exhibitions` (Pune)
3. **Raja Dinkar Kelkar Museum** — `https://www.rajakelkarmuseum.org/` (Pune)
4. **Monalisa Kalagram** — `https://monalisakalagram.com/` (Pune)
5. **Darpan Art Gallery** — `https://kalachhaya.org/` (Pune)
6. **Chemould Prescott Road** — `https://gallerychemould.com/exhibitions/` (Mumbai)
7. **TARQ Mumbai** — `https://www.tarq.in/` (Mumbai)
8. **Jehangir Nicholson Art Foundation (JNAF @ CSMVS)** — `https://jnaf.org/` (Mumbai)
9. **NMACC Art House** — `https://www.nmacc.com/` (Mumbai)
10. **Jehangir Art Gallery** — `https://jehangirartgallery.com/` (Mumbai)
11. **Mumbai Gallery Weekend** — `https://www.mumbaigalleryweekend.com/` (Mumbai)
12. **Kala Ghoda Arts Festival** — `https://kalaghodaassociation.com/` (Mumbai)
13. **Kiran Nadar Museum of Art (KNMA)** — `https://www.knma.in/` (New Delhi)
14. **India Art Fair** — `https://indiaartfair.in/` (New Delhi)
15. **Museum of Art & Photography (MAP)** — `https://map-india.org/` (Bengaluru)
16. **Tate Modern & Tate Britain** — `https://www.tate.org.uk/` (London, UK)

---

## 4. Test Suite Execution Results

### Unit & Integration Tests (`tests/unit.test.mjs`)
- **Total Tests**: 16
- **Passed**: 16
- **Failed**: 0
1. Valid event passes validation — PASSED
2. Missing or invalid official URL is rejected — PASSED
3. Missing fee is not treated as free — PASSED
4. Upcoming/ongoing/past status is correct based on time — PASSED
5. Timezone and date-only edge cases do not shift an event to the wrong day — PASSED
6. Multi-day events show the correct status during exhibition run — PASSED
7. Search matches title, venue, organiser and city case-insensitively — PASSED
8. Combined filters apply strict AND logic — PASSED
9. Reset filters restores default state — PASSED
10. Duplicate detection distinguishes different dates or sessions — PASSED
11. A failed source update preserves the previous valid JSON — PASSED
12. Suspiciously empty source result does not wipe the event feed — PASSED
13. Cancelled events do not show as confirmed upcoming — PASSED
14. Missing image does not break validation or card model — PASSED
15. Booking button requires a valid verified booking URL — PASSED
16. Secondary listings cannot be marked official-checked — PASSED

### Browser E2E Tests (`tests/e2e.test.mjs`)
- **Total Tests**: 15
- **Passed**: 15
- **Failed**: 0
- **Tested Resolution**: Desktop 1366×768 & Mobile 390×844
1. Application loads without console errors — PASSED
2. Data comes from `events.json` (cards rendered > 0) — PASSED
3. Search filter narrows cards — PASSED
4. Search clear restores cards — PASSED
5. Official details link uses valid HTTP/HTTPS URLs — PASSED
6. Booking button only renders when bookingUrl is verified — PASSED
7. Fee badges show honest status — PASSED
8. Update timestamp displayed in header — PASSED
9. Empty state appears with helpful guidance on zero matches — PASSED
10. Reset button from empty state restores feed — PASSED
11. Keyboard tab focus works — PASSED
12. Mobile viewport (390×844) has NO horizontal overflow — PASSED
13. Desktop layout (1366×768) header and grid readable — PASSED
14. No dead `#` or example.com links anywhere — PASSED
15. Past events excluded from default upcoming view — PASSED
