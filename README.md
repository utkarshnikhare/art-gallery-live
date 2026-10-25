# Art Gallery Live

**Discover exhibitions, art fairs and creative events.**

Art Gallery Live is a fast, responsive, and truthful web application for discovering active and upcoming visual arts exhibitions, gallery showcases, museum collections, art fairs, and creative workshops.

**Live Application URL**: [https://utkarshnikhare.github.io/art-gallery-live/](https://utkarshnikhare.github.io/art-gallery-live/)  
**Repository**: [https://github.com/utkarshnikhare/art-gallery-live](https://github.com/utkarshnikhare/art-gallery-live)

---

## 🏛️ Core Features

- **Real Verified Events**: Every event in the directory is backed by an official institution announcement or direct gallery listing. Zero placeholder events, zero invented timings, and zero fabricated booking buttons.
- **Honest Admission Data**: If an event's entry fee is not explicitly published, it is labelled `Fee: Check Organiser` rather than being falsely presented as free.
- **Geographic Discovery**: Filter across Pune & PCMC, Mumbai Region, Maharashtra, broader India (New Delhi, Bengaluru), and international art hubs (London, Venice).
- **Multi-Faceted Search & Filters**: Search case-insensitively across artists, titles, curators, venues, and cities. Filter by format (in-person, online), timeframe (happening now, upcoming), fee, and category.
- **Failure-Protected Daily Pipeline**: Event data synchronizes daily via GitHub Actions. If an upstream site experiences downtime, the pipeline preserves the last known-good dataset.
- **Responsive & Accessible**: Clean editorial aesthetic optimized for both mobile screens (390×844) and desktop displays (1366×768) with full keyboard accessibility.

---

## 🔍 Verified Source Coverage

Art Gallery Live monitors a curated starter registry of leading visual arts institutions:

1. **Zapurza Museum of Art & Culture** (Khadakwasla Dam, Pune) — [https://zapurza.org/](https://zapurza.org/)
2. **Vida Heydari Contemporary (VHC)** (Koregaon Park, Pune) — [https://vhc.art/exhibitions](https://vhc.art/exhibitions)
3. **Raja Dinkar Kelkar Museum** (Shukrawar Peth, Pune) — [https://www.rajakelkarmuseum.org/](https://www.rajakelkarmuseum.org/)
4. **Monalisa Kalagram** (Koregaon Park, Pune) — [https://monalisakalagram.com/](https://monalisakalagram.com/)
5. **Darpan Art Gallery** (Kalachhaya Campus, Pune) — [https://kalachhaya.org/](https://kalachhaya.org/)
6. **Chemould Prescott Road** (Fort, Mumbai) — [https://gallerychemould.com/exhibitions/](https://gallerychemould.com/exhibitions/)
7. **TARQ Mumbai** (Fort, Mumbai) — [https://www.tarq.in/](https://www.tarq.in/)
8. **Jehangir Nicholson Art Foundation (JNAF @ CSMVS)** (Fort, Mumbai) — [https://jnaf.org/](https://jnaf.org/)
9. **NMACC Art House** (Bandra Kurla Complex, Mumbai) — [https://www.nmacc.com/](https://www.nmacc.com/)
10. **Jehangir Art Gallery** (Kala Ghoda, Mumbai) — [https://jehangirartgallery.com/](https://jehangirartgallery.com/)
11. **Mumbai Gallery Weekend** (Mumbai) — [https://www.mumbaigalleryweekend.com/](https://www.mumbaigalleryweekend.com/)
12. **Kala Ghoda Arts Festival** (Mumbai) — [https://kalaghodaassociation.com/](https://kalaghodaassociation.com/)
13. **Kiran Nadar Museum of Art (KNMA)** (New Delhi) — [https://www.knma.in/](https://www.knma.in/)
14. **India Art Fair** (New Delhi) — [https://indiaartfair.in/](https://indiaartfair.in/)
15. **Museum of Art & Photography (MAP)** (Bengaluru) — [https://map-india.org/](https://map-india.org/)
16. **Tate Modern & Tate Britain** (London, UK) — [https://www.tate.org.uk/](https://www.tate.org.uk/)

---

## 🏷️ Verification & Status Labels

| Label | Meaning |
| :--- | :--- |
| **● Happening Now** | Today's date falls within the exhibition's verified active dates. |
| **Upcoming** | The event has verified opening dates in the future. |
| **✓ Free Admission** | Explicitly published as free public entry by the host institution. |
| **🎟️ Ticket Required** | Requires paid admission or advance ticket booking. |
| **ℹ️ Fee: Check Organiser** | Fee status was not confirmed on the public portal; check before visiting. |
| **✓ Official Source** | Validated directly against an official museum or gallery portal. |
| **Secondary Listing** | Gathered from an aggregator or media announcement; re-verification advised. |

---

## 🚀 Local Development & Testing

### Prerequisites
- Node.js `v18+` or `v22+`
- npm `v10+`

### Setup
```bash
# Clone the repository
git clone https://github.com/utkarshnikhare/art-gallery-live.git
cd art-gallery-live

# Install dependencies
npm ci

# Start the local development server
npm run dev
```

### Run Tests
```bash
# Run unit & integration tests
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

### Manually Run Data Ingestion Pipeline
```bash
npm run update-data
```

---

## 🛠️ Adding or Removing a Source

1. Open `scripts/sources.json`.
2. Add a new entry with `id`, `name`, `officialUrl`, `sourceType`, `city`, `categories`, and `collectionMethod`.
3. Run `npm run update-data`. The pipeline verifies the source, runs deduplication, validates candidate events, and atomically updates `public/data/events.json`.

---

## 📢 Reporting Inaccuracies or Cancellations

If an exhibition has been rescheduled, postponed, or closed early:
- Submit an issue on GitHub: [https://github.com/utkarshnikhare/art-gallery-live/issues](https://github.com/utkarshnikhare/art-gallery-live/issues)
- Or reach out to the gallery directly via their official portal link provided on each event card.

---

## 🔒 Project Isolation Notice
Art Gallery Live is an independent project. It has no shared dependencies, repositories, or deployments with the Search Utility (`excel-manager`). See [`PROJECT_BOUNDARIES.md`](file:///PROJECT_BOUNDARIES.md) for complete isolation specifications.
