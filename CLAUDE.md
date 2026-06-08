# Bangladesh GeoJSON — Project Context

## What This Is
Open-source geographic data repository for Bangladesh. Free public good. No monetization.

**GitHub:** https://github.com/ifahimreza/bangladesh-geojson  
**Demo site:** https://geojson.bd (GitHub Pages + custom domain)

## Goals
- Build community brand as the trusted Bangladesh geo data source
- Keep data accurate and fresh for the developer community
- No paid tiers, no SaaS, no over-engineering

## Current Data (in src/data/)
| File | Records |
|------|---------|
| bd-divisions.json | 8 divisions |
| bd-districts.json | 64 districts |
| bd-upazilas.json | 492 upazilas |
| bd-postcodes.json | 1,349 postcodes |
| bangladesh.geojson | full boundary polygons (7MB) |
| bd-bazars.geojson | bazar/market POIs (OpenStreetMap) |
| bd-major-routes.geojson | major road network (OpenStreetMap) |
| dhaka-city.json | 142 Dhaka city / city corporation areas |

## Data Shape
```json
// Division
{ "id": "3", "name": "Dhaka", "bn_name": "ঢাকা", "lat": "23.810332", "long": "90.412518" }

// District
{ "id": "1", "division_id": "3", "name": "Dhaka", "bn_name": "ঢাকা", "lat": "23.7115253", "long": "90.4111451" }

// Upazila
{ "id": "1", "district_id": "34", "name": "Amtali", "bn_name": "আমতলী" }

// Postcode
{ "division_id": "1", "district_id": "34", "upazila": "Amtali", "postOffice": "Amtali", "postCode": "8710" }
```

## Target Structure
```
bangladesh-geojson/
├── src/
│   ├── data/          ← all JSON files live here
│   ├── index.ts       ← npm package entry (query functions)
│   └── types.ts       ← TypeScript definitions with JSDoc
├── demo/              ← React + Vite demo site (geojson.bd)
│   ├── index.html
│   └── src/
│       ├── main.tsx
│       ├── App.tsx
│       └── index.css
├── scripts/
│   ├── validate-data.js  ← comprehensive data validation
│   ├── test-data.js      ← 30 data integrity tests
│   ├── build-boundary.js
│   ├── build-poi.js
│   └── extract-unions.js
├── docs/
│   ├── CONTRIBUTING.md
│   └── USAGE.md
├── .github/workflows/
│   └── validate.yml   ← GitHub Actions: validate + test + typecheck + deploy demo
├── README.md
├── package.json
├── tsconfig.json
├── CLAUDE.md
├── LICENSE            ← MIT
└── .gitignore
```

## Tech Stack
- **npm package:** TypeScript, exports query functions
- **Demo site:** React + Vite + Tailwind CSS + MapLibre GL JS
- **Map tiles:** OpenFreeMap (https://openfreemap.org) — free, no API key needed
- **Deploy:** GitHub Actions → GitHub Pages → geojson.bd

## npm Package API
```ts
import bd from 'bangladesh-geojson';

// Core lookups (O(1) via precomputed maps)
bd.getDivisions()
bd.getDivisionById(id)
bd.getDistricts()
bd.getDistrictById(id)
bd.getDistrictsByDivision(divisionId)
bd.getUpazilas()
bd.getUpazilasByDistrict(districtId)
bd.getUpazilaById(id)
bd.getPostcodes()
bd.getPostcodesByDistrict(districtId)
bd.getDhakaAreas()
bd.getDhakaAreasByCorporation(name)

// Upward hierarchy (O(1))
bd.getDivisionOfDistrict(districtId)
bd.getDistrictOfUpazila(upazilaId)

// Search
bd.search(query)           // searches EN + Bangla names + postcodes + Dhaka areas

// Hierarchy (cached)
bd.getFullHierarchy()      // lazy memoization, O(1) on repeat calls
```

## Demo Site (geojson.bd)
Single page React app. Shows:
1. Stats bar — 8 Divisions · 64 Districts · 492 Upazilas · 1,349 Postcodes
2. Search bar — find any location by EN or Bangla name
3. Division → District → Upazila cascade dropdowns
4. Selected location card — shows data + "Copy JSON" button
5. MapLibre map (OpenFreeMap tiles) centered on Bangladesh
   - Overlays bangladesh.geojson as division boundary layer
   - Map flies to selected/searched location

## Design
- Bangladesh green (#006a4e) as primary color
- Clean, minimal, fast
- Mobile friendly
- No analytics, no tracking, no ads

## GitHub Actions
Four jobs:
1. **validate** — runs `node scripts/validate-data.js` on every push/PR
2. **test** — runs `node scripts/test-data.js` on every push/PR
3. **typecheck** — runs `tsc --noEmit` on every push/PR
4. **deploy-demo** — builds demo with Vite, deploys to GitHub Pages with CNAME: geojson.bd (runs on master merge only, depends on all 3 above)

## Data Quality Status
- ✅ All 7 data files validated (structure, required fields, referential integrity, cross-dataset consistency, whitespace, duplicates, bounds, GeoJSON schema, hierarchy)
- ✅ 30 automated tests passing
- ✅ No duplicate upazilas (Natore Sadar id=361, Baraigram id=362 removed)
- ✅ No trailing whitespace in bn_name fields
- ✅ Mymensingh postcodes have correct division_id=8 (was incorrectly 3)
- ⚠️ 12 postcodes are missing the `district_id` mapping

## Data Validation Rules
- JSON structure valid (all 7 files)
- Required fields present (id, name, bn_name)
- No leading/trailing whitespace in string fields
- No duplicate IDs or duplicate names within same parent
- Referential integrity (district.division_id exists, upazila.district_id exists)
- Cross-dataset consistency (postcode division_id matches its district's division_id)
- Coordinates within Bangladesh bounds (lat 20.5–26.7, long 88.0–92.8)
- Boundary GeoJSON: FeatureCollection type, valid geometry, bbox covers Saint Martin's Island
- Bazar and Route GeoJSON: valid FeatureCollection, required properties
- Hierarchy completeness (no orphan districts/upazilas, no empty parents)
- Data count expectations (8 divisions, 64 districts, 492 upazilas, 1349 postcodes)

## Notes
- Owner is a PHP developer — keep scripts simple and well commented
- Lazy load the 7MB bangladesh.geojson in the demo
- Always show both English and Bangla names
- Keep it simple — this is a data repo with a demo, not a product
