# Art Gallery Live

**Discover exhibitions, art fairs and creative events.**

Art Gallery Live is a fast, responsive, and uncompromisingly truthful public web application for discovering active and upcoming visual arts exhibitions, gallery showcases, museum collections, art fairs, and creative workshops.

**Live Application URL**: [https://utkarshnikhare.github.io/art-gallery-live/](https://utkarshnikhare.github.io/art-gallery-live/)  
**Repository**: [https://github.com/utkarshnikhare/art-gallery-live](https://github.com/utkarshnikhare/art-gallery-live)

---

## 🏛️ Core Features & Integrity Standards

- **Exhibition-Level Verification**: Every event is verified against an individual exhibition announcement, curatorial catalog, or official festival schedule. Zero placeholder events, zero invented timings, and zero fabricated booking buttons.
- **Field-Level Verification Tracking**: Each event card explicitly publishes which specific fields have been verified (`title`, `dates`, `venue`, `city`, `admissionFee`, `organiser`).
- **Honest Admission Policy**: If an event's entry fee is not confirmed by the organiser, it is labeled `Fee: Check Organiser` rather than being falsely presented as free.
- **Internal Review Queue**: Generic institution homepages, permanent collection visits, and unconfirmed leads are quarantined in `review_queue.json` and excluded from the public directory.
- **Geographic Discovery**: Filter across Pune & PCMC, Mumbai Region, Maharashtra, broader India (New Delhi, Bengaluru), and international art hubs (London, Venice).
- **Multi-Faceted Search & Filters (AND Semantics)**: Search case-insensitively across artists, titles, curators, venues, and cities. Filter by format, timeframe, fee, and verification level.
- **Failure-Protected Daily Pipeline**: Event data synchronizes daily via GitHub Actions. If an upstream site experiences downtime, the pipeline preserves the last known-good dataset.
- **Responsive & Accessible**: Clean editorial aesthetic optimized for both mobile screens (390×844) and desktop displays (1366×768) with full keyboard accessibility.

---

## 🔍 Verified Source Coverage & Registry

Art Gallery Live monitors a curated starter registry of leading visual arts institutions:

1. **Vida Heydari Contemporary (VHC)** (Koregaon Park, Pune) — [https://vhc.art/exhibitions](https://vhc.art/exhibitions)
2. **Chemould Prescott Road** (Fort, Mumbai) — [https://gallerychemould.com/exhibitions/](https://gallerychemould.com/exhibitions/)
3. **TARQ Mumbai** (Fort, Mumbai) — [https://www.tarq.in/](https://www.tarq.in/)
4. **Tao Art Gallery** (Worli, Mumbai) — [https://www.taoartgallery.com/exhibitions/](https://www.taoartgallery.com/exhibitions/)
5. **Project 88** (Colaba, Mumbai) — [https://www.project88.in/exhibitions/](https://www.project88.in/exhibitions/)
6. **Akara Modern & Contemporary** (Colaba, Mumbai) — [https://akaraart.com/](https://akaraart.com/)
7. **Jehangir Nicholson Art Foundation (JNAF @ CSMVS)** (Fort, Mumbai) — [https://jnaf.org/](https://jnaf.org/)
8. **NMACC Art House** (Bandra Kurla Complex, Mumbai) — [https://www.nmacc.com/](https://www.nmacc.com/)
9. **Mumbai Gallery Weekend** (Mumbai) — [https://www.mumbaigalleryweekend.com/](https://www.mumbaigalleryweekend.com/)
10. **Kala Ghoda Arts Festival** (Mumbai) — [https://kalaghodaassociation.com/](https://kalaghodaassociation.com/)
11. **Kiran Nadar Museum of Art (KNMA)** (New Delhi) — [https://www.knma.in/](https://www.knma.in/)
12. **India Art Fair** (New Delhi) — [https://indiaartfair.in/](https://indiaartfair.in/)
13. **Museum of Art & Photography (MAP)** (Bengaluru) — [https://map-india.org/](https://map-india.org/)
14. **Tate Modern & Tate Britain** (London, UK) — [https://www.tate.org.uk/](https://www.tate.org.uk/)
15. **Zapurza Museum of Art & Culture** (Khadakwasla Dam, Pune) — [https://zapurza.org/](https://zapurza.org/)
16. **Jehangir Art Gallery** (Kala Ghoda, Mumbai) — [https://jehangirartgallery.com/](https://jehangirartgallery.com/) *(Online calendar degraded; leads held in review queue)*

See [`SOURCE_COVERAGE_REPORT.md`](file:///SOURCE_COVERAGE_REPORT.md) for full institution health metrics.

---

## 🏷️ Verification & Status Labels

| Label | Meaning |
| :--- | :--- |
| **● Happening Now** | Today's date falls within the exhibition's verified active dates. |
| **Upcoming** | The event has verified opening dates in the future. |
| **✓ Confirmed Free Entry** | Explicitly confirmed as free public entry by the host institution. |
| **🎟️ Ticket Required** | Requires paid admission or advance ticket booking. |
| **ℹ️ Fee: Check Organiser** | Fee status was not confirmed on the public portal; check before visiting. |
| **✓ Event Verified** | Validated directly against a specific exhibition announcement or catalog. |
| **✓ Organiser Confirmed** | Confirmed by official festival or biennale organiser portal. |
| **⚠️ Needs Recheck** | Verification timestamp is older than 14 days without re-check. |

---

## 🚀 Local Development & Testing

### Setup
```bash
# Clone the repository
git clone https://github.com/utkarshnikhare/art-gallery-live.git
cd art-gallery-live

# Install dependencies
npm ci

# Start development server
npm run dev
```

### Run Tests
```bash
# Run unit & adversarial integrity tests
npm run test:unit

# Run browser E2E tests (uses local Chrome / Edge headless)
npm run test:e2e

# Run complete test suite
npm test
```

### Production Build
```bash
npm run build
npm run preview
```

### Manually Run Data Ingestion & Health Audit
```bash
npm run update-data
```

---

## 📢 Reporting Inaccuracies or Cancellations

If an exhibition has been rescheduled, postponed, or closed early:
- Submit an issue on GitHub: [https://github.com/utkarshnikhare/art-gallery-live/issues](https://github.com/utkarshnikhare/art-gallery-live/issues)
- Or use the "🚩 Report Issue" shortcut directly on any event card.

---

## 🔒 Project Isolation Notice
Art Gallery Live is an independent project. It has no shared dependencies, repositories, or deployments with the Search Utility (`excel-manager`). See [`PROJECT_BOUNDARIES.md`](file:///PROJECT_BOUNDARIES.md) for complete isolation specifications.
