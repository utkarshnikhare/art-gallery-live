# Load & Concurrency Test Plan — Morrowkind

## 1. Architectural Realities & Concurrency Model
Morrowkind is an offline-capable, client-side Single Page Application (SPA). It maintains state inside the client's browser origin (`localStorage`, `IndexedDB`, `sessionStorage`).

**Crucial Architecture Distinction**:
Because there is no shared central application server or central write database (static hosting via GitHub Pages CDN), traditional multi-client backend server load testing (e.g., simulating 1,000 HTTP POSTs/sec to a backend server) does not apply. Instead, concurrency testing must evaluate:
1. **Parallel Independent Browser Contexts**: Simulating multiple synthetic users running isolated workspaces concurrently on the client machine.
2. **Client-Side Concurrency & Race Conditions**:
   - Simultaneous write operations to `localStorage` (staging vs main keys).
   - High-throughput IndexedDB blob storage transactions.
   - Rapid workspace switching and in-flight operations.
   - Large inventory rendering stress (500+ artwork records).

## 2. Load Testing Campaign Stages
- **Stage A: Multi-Context Client Simulation (1, 5, 10, 25 contexts)**:
  - Script: `scripts/load_and_concurrency_test.mjs`
  - Automated browser context creation using Puppeteer.
  - Measures: Context startup time, memory allocation, transaction completion rate, and data isolation.
- **Stage B: Concurrency & Race Condition Stress**:
  - Rapid double-clicks on save/export/import triggers.
  - Staging key recovery during simulated write interruptions.
  - IndexedDB asset writes under simulated quota constraints.
