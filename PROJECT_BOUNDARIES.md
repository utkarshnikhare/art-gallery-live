# PROJECT BOUNDARIES & ISOLATION MANIFEST

**Project Name**: Art Gallery Live  
**Project Directory**: `C:\Users\Admin\.gemini\antigravity\scratch\art-gallery-live`  
**Git Root**: `C:\Users\Admin\.gemini\antigravity\scratch\art-gallery-live\.git`  
**Target Repository**: `https://github.com/utkarshnikhare/art-gallery-live`  
**Target Public URL**: `https://utkarshnikhare.github.io/art-gallery-live/`  
**Creation Date**: 25 October 2026  

---

## 1. Strict Isolation Guarantee

1. **Non-Negotiable Project Separation**:
   - **Search Utility** (`excel-manager`) is a completely separate reference project.
   - It is located at `C:\Users\Admin\.gemini\antigravity\scratch\excel-manager` and hosted at `https://utkarshnikhare.github.io/excel-manager/`.
   - Under no circumstances will Search Utility code, configuration, assets, dependencies, workflows, or git history be touched, modified, deleted, imported, or mingled.
2. **Dedicated Independent Artifacts**:
   - Art Gallery Live has its own git repository, its own `package.json`, its own build and test suite, its own data pipelines, its own documentation (`README.md`, `PROJECT_NOTES.md`, `PROJECT_BOUNDARIES.md`), and its own GitHub Actions / GitHub Pages deployment.
   - No code or package imports from `excel-manager` exist in Art Gallery Live.
3. **Environment & Runtime Discoveries**:
   - Operating System: Windows
   - Node.js version: `v22.23.2`
   - npm version: `10.9.8`
   - GitHub CLI: `gh version 2.102.0` (authenticated as `utkarshnikhare`)
   - Python runtime: Python is not configured in PATH; therefore, all ingestion, validation, and testing scripts are implemented in native Node.js (ES modules), ensuring reliable execution both locally and inside GitHub Actions CI without extra runtime dependencies.
