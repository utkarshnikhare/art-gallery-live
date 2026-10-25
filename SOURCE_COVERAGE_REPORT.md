# ART GALLERY LIVE — SOURCE COVERAGE & INSTITUTION HEALTH REPORT

**Audit Date**: 25 October 2026  
**Auditor**: Antigravity Data Integrity Pipeline  
**Production URL**: [https://utkarshnikhare.github.io/art-gallery-live/](https://utkarshnikhare.github.io/art-gallery-live/)  
**Repository**: [https://github.com/utkarshnikhare/art-gallery-live](https://github.com/utkarshnikhare/art-gallery-live)  

---

## 1. Executive Summary & Integrity Mandate

Art Gallery Live enforces an **uncompromising zero-fabrication standard**. 
- An institution homepage alone is **insufficient evidence** to publish an event.
- Every listed event must be backed by an individual official exhibition announcement, curatorial catalog, or confirmed festival schedule.
- Admission fees are marked `Fee: Check Organiser` unless the host explicitly confirms free admission.
- General collection displays without time bounds and unconfirmed leads are **strictly quarantined** in `review_queue.json` and excluded from the confirmed public feed.

---

## 2. Institutional Registry & Health Posture

| Institution / Space | City / Region | Official Source URL | Collection Method | Health Status | Verification Level | Known Limitations & Notes |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Vida Heydari Contemporary (VHC)** | Pune, MH | `https://vhc.art/exhibitions` | Official Exhibition Catalog | **HEALTHY** (200) | Exhibition Verified | Closed Sundays; focus on contemporary solo/curated South Asian art in Koregaon Park. |
| **Zapurza Museum of Art & Culture** | Pune, MH | `https://zapurza.org/` | Official Portal & Events | **HEALTHY** (200) | Institution Monitored | Closed Thursdays; permanent collections segregated to review queue; rotational shows tracked. |
| **Chemould Prescott Road** | Mumbai, MH | `https://gallerychemould.com/exhibitions/` | Official Exhibition Archive | **HEALTHY** (200) | Exhibition Verified | Closed Sundays; solo exhibitions typically run 4–6 weeks in Fort gallery space. |
| **TARQ Mumbai** | Mumbai, MH | `https://www.tarq.in/` | Official Exhibition Page | **HEALTHY** (200) | Exhibition Verified | Tuesday–Saturday opening; contemporary emerging & mid-career artist showcases. |
| **Tao Art Gallery** | Mumbai, MH | `https://www.taoartgallery.com/exhibitions/` | Official Curatorial Archive | **HEALTHY** (200) | Exhibition Verified | Worli gallery space; daily openings for active solo exhibitions. |
| **Project 88** | Mumbai, MH | `https://www.project88.in/exhibitions/` | Official Exhibition Page | **HEALTHY** (200) | Exhibition Verified | Colaba gallery space; milestone contemporary and conceptual art presentations. |
| **Akara Modern & Contemporary** | Mumbai, MH | `https://akaraart.com/` | Official Exhibition Archive | **HEALTHY** (200) | Exhibition Verified | Historic Churchill Chambers, Colaba; modern South Asian masters and paper works. |
| **Jehangir Nicholson Art Foundation (JNAF @ CSMVS)** | Mumbai, MH | `https://jnaf.org/` | Official Exhibition Listing | **HEALTHY** (200) | Exhibition Verified | East Wing, CSMVS Museum; museum entry tickets apply. |
| **NMACC Art House** | Mumbai, MH | `https://www.nmacc.com/` | Official Portal & Ticketing | **HEALTHY** (200) | Exhibition Verified | Dedicated multi-story visual arts gallery in BKC; advance ticketing required. |
| **Mumbai Gallery Weekend** | Mumbai, MH | `https://www.mumbaigalleryweekend.com/` | Organiser Schedule Portal | **HEALTHY** (200) | Organiser Confirmed | Annual citywide visual arts festival (Jan 14–17, 2027). Free access across spaces. |
| **Kala Ghoda Arts Festival** | Mumbai, MH | `https://kalaghodaassociation.com/` | Organiser Portal & Release | **HEALTHY** (200) | Organiser Confirmed | Asia's largest street art festival (Jan 30 – Feb 7, 2027); free public entry. |
| **Kiran Nadar Museum of Art (KNMA)** | New Delhi, NCR | `https://www.knma.in/` | Official Exhibition Calendar | **HEALTHY** (200) | Exhibition Verified | Saket and Noida galleries; admission is always confirmed free to the public. |
| **India Art Fair** | New Delhi, NCR | `https://indiaartfair.in/` | Organiser Portal & Ticketing | **HEALTHY** (200) | Organiser Confirmed | Annual modern & contemporary fair at NSIC Grounds (Feb 4–7, 2027); ticketed pass. |
| **Museum of Art & Photography (MAP)** | Bengaluru, KA | `https://map-india.org/` | Official Curatorial Listing | **HEALTHY** (200) | Exhibition Verified | Closed Mondays; curated temporary exhibitions ticketed at ₹150. |
| **Tate Modern & Tate Britain** | London, UK | `https://www.tate.org.uk/` | Official Exhibition Pages | **HEALTHY** (200) | Exhibition Verified | Permanent collection free; major temporary retrospective exhibitions ticketed. |
| **Jehangir Art Gallery** | Mumbai, MH | `https://jehangirartgallery.com/` | Website Weekly Schedule | **DEGRADED** (200) | Lead Quarantined | Weekly rotating shows across 4 halls; current online roster held in review queue pending catalogue confirmation. |

---

## 3. Data Integrity Audit & Feed Statistics

- **Original Candidate Records**: 18
- **Confirmed & Retained with Exhibition Evidence**: 13
- **Corrected to Specific Installment**: 1 (*Where the Body Begins: Body* at VHC Pune)
- **New Verified Exhibitions Added**: 4 (*(Not) In Plain Sight* at VHC Pune; *The Shapes of Elsewhere* at Tao Art Gallery; *Badly Remembered Things* at Project 88; *From Line to Landscape* at Akara Modern)
- **Quarantined / Excluded Records (`review_queue.json`)**: 5
  1. `evt-jehangir-rotating-show`: Rotating hall display notice. Lacks individual artist exhibition confirmation.
  2. `evt-darpan-pune-oct`: Kalachhaya Campus general showcase. Lacks dedicated exhibition catalog.
  3. `evt-kelkar-heritage`: Raja Dinkar Kelkar permanent collection. Not a time-bounded special exhibition.
  4. `evt-monalisa-autumn-craft`: Monalisa Kalagram seasonal workshop lead. Lacks verified dates/ticket link.
  5. `evt-zapurza-collection`: Zapurza permanent display. Permanent museum collection rather than time-bounded special exhibition.
- **Current Active Confirmed Event Feed**: **17 verified events**
  - **Happening Now (Current)**: 10
  - **Upcoming**: 7

---

## 4. Transparency & Freshness Policy

1. **Daily Scheduled Sync**: Pipeline runs daily via GitHub Actions at 06:00 UTC (11:30 AM IST).
2. **Freshness Tracking**: Records verified within 14 days carry a `fresh` status. Records exceeding 14 days without recheck are flagged `stale`.
3. **Outage Safety**: If an upstream institution experiences downtime, the last verified known-good dataset is retained, but the timestamp is not falsely updated.
4. **Coverage Scope**: Art Gallery Live guarantees that every listed event is genuine and verified, but explicitly disclaims comprehensive coverage of every unannounced or private art gathering.
