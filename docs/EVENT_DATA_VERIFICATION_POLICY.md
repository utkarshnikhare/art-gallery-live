# Morrowkind Event Data Verification & Timezone Policy

## 1. Scope & Objective
This document defines the strict verification standards, source hierarchy, timezone handling rules, and link integrity guarantees governing all public exhibition feeds, artist open calls, and directory data on the Morrowkind Artist Intelligence Platform.

---

## 2. Source Hierarchy & Verification Criteria

| Level | Source Type | Description | Permitted Claims |
| :--- | :--- | :--- | :--- |
| **Tier 1 (Authoritative)** | Official Museum, Gallery, or Biennale Domain | Direct exhibition landing page hosted on the institution's primary portal (e.g. `gallerychemould.com`, `tate.org.uk`, `knma.in`). | Marked `official-event-verified`. Full field verification permitted. |
| **Tier 2 (Confirmed)** | Registered Festival / Biennale Association | Official festival or consortium announcement (e.g. `mumbaigalleryweekend.com`, `kalaghodaassociation.com`). | Marked `organiser-confirmed`. Venue and dates verified. |
| **Tier 3 (Quarantined / Excluded)** | Aggregators, Blogs, Social Media, Third-Party Scrapers | Unverified third-party calendars or secondary mentions. | **Never displayed in verified feed**. Quarantined in `review_queue.json`. |

### Field-Level Verification Requirements
Every published exhibition event MUST verify the following fields against Tier 1 or Tier 2 sources:
1. **Title**: Full official exhibition title as announced by curator/institution.
2. **Dates (`startDate`, `endDate`)**: Confirmed exhibition calendar window.
3. **Venue & Address**: Physical gallery or pavilion location with city and country.
4. **Admission Fee**:
   - `free`: Only permitted if `isConfirmedByOrganiser: true` is verified.
   - `price`: Ticket price or booking requirement documented with active booking link.
   - `unknown`: Explicitly labeled "Fee: Check Organiser" — never assumed free.
5. **Canonical Official URL**:
   - Must resolve to a valid, live HTTP 200 destination.
   - Cannot be a placeholder, example domain, dead subpath, or trailing `#`.
   - External links must specify `target="_blank"` and `rel="noopener noreferrer"`.

---

## 3. Timezone Standardization Policy (Indian Standard Time — IST)

### 3.1 Primary Timezone Standard
- Default user-facing timezone: **Indian Standard Time (IST), IANA `Asia/Kolkata` (UTC+05:30)**.
- Formatted via native `Intl.DateTimeFormat('en-IN', { timeZone: 'Asia/Kolkata', ... })`.
- Explicit `IST` label appended to user-facing timestamps (e.g. `25 Oct 2026, 02:50 PM IST`).

### 3.2 Date-Only Calendar Value Invariance
- Exhibition dates, deadlines, and schedule milestones are represented as ISO 8601 date-only strings (`YYYY-MM-DD`).
- **Zero Date-Shift Guarantee**: Date-only strings are parsed using calendar component extraction (`YYYY`, `MM`, `DD`) rather than UTC midnight instantiations, preventing negative UTC offset timezones (`America/New_York`, `America/Los_Angeles`) from shifting dates backward by a day (e.g., `2026-11-30` displaying as `29 Nov`).

### 3.3 International Venues & Timezone Coexistence
- For international exhibitions (e.g., Tate Modern London in `Europe/London`), the venue's local hours and timezone are preserved for on-site visitors (e.g., `10:00 AM – 6:00 PM BST`), with secondary Indian Standard Time equivalent provided where relevant.

### 3.4 Event Status & Closing Boundaries
- An exhibition's `endDate` encompasses the complete final calendar day, concluding at `23:59:59.999` in the venue's designated timezone.
- An exhibition whose closing boundary has elapsed is strictly marked `past` and **never** displays `happening-now`.

---

## 4. Stale-Data & Quarantine Lifecycle

1. **Re-verification Interval**: All active exhibition listings are audited on a scheduled cadence.
2. **Freshness Classification**:
   - `fresh`: Verified within the last 14 days.
   - `stale`: Last verification timestamp older than 14 days without recheck. Displays warning pill.
3. **Link Health**: If an official URL or booking link yields HTTP 4xx/5xx or unresolvable DNS, the pipeline flags the record for immediate human review.
4. **Failure Resilience**: The ingestion pipeline strictly preserves the last known-good dataset upon parser exceptions or empty source responses, preventing accidental production outages.
