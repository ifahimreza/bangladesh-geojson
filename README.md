# bangladesh-geojson

[![npm version](https://img.shields.io/npm/v/bangladesh-geojson.svg)](https://www.npmjs.com/package/bangladesh-geojson)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![Validate](https://github.com/ifahimreza/bangladesh-geojson/actions/workflows/validate.yml/badge.svg)](https://github.com/ifahimreza/bangladesh-geojson/actions/workflows/validate.yml)
[![Demo](https://img.shields.io/badge/demo-geojson.bd-006a4e)](https://geojson.bd)

Open-source geographic data for Bangladesh — divisions, districts, upazilas, postcodes, and full boundary GeoJSON. Free, accurate, and community-maintained.

> **Demo:** https://geojson.bd · **GitHub:** https://github.com/ifahimreza/bangladesh-geojson

## Quick Start

```bash
npm install bangladesh-geojson
```

```ts
import bd from 'bangladesh-geojson';

bd.getDivisions();              // 8 divisions
bd.getDistrictsByDivision('3'); // districts in Dhaka division
bd.getUpazilasByDistrict('1');  // upazilas in Dhaka district
bd.getDivisionOfDistrict('1');  // find which division a district belongs to
bd.getDistrictOfUpazila('1');   // find which district an upazila belongs to
bd.getDhakaAreasByCorporation('dncc'); // Dhaka North city areas
bd.search('সিলেট');             // search EN + Bangla names
bd.getFullHierarchy();          // full division → district → upazila tree
```

You can also import the raw JSON files directly:

```ts
import divisions from 'bangladesh-geojson/src/data/bd-divisions.json';
import boundary from 'bangladesh-geojson/src/data/bangladesh.geojson';
```

## What's Inside

| File | Records | Description |
|------|---------|-------------|
| `bd-divisions.json` | 8 | Divisions with EN/BN names + coordinates |
| `bd-districts.json` | 64 | Districts mapped to divisions |
| `bd-upazilas.json` | 492 | Upazilas mapped to districts |
| `bd-postcodes.json` | 1,349 | Post offices and post codes |
| `bangladesh.geojson` | — | Full boundary polygons (~7MB) |
| `bd-bazars.geojson` | — | Bazar/market POIs from OpenStreetMap |
| `bd-major-routes.geojson` | — | Major road network from OpenStreetMap |
| `dhaka-city.json` | 142 | Dhaka city / city corporation areas |

All names are bilingual (English + বাংলা).

## Data Shape

```ts
interface Division  { id; name; bn_name; lat; long }
interface District  { id; division_id; name; bn_name; lat; long }
interface Upazila   { id; district_id; name; bn_name }
interface Postcode  { division_id; district_id; upazila; postOffice; postCode }
interface DhakaArea { division_id; district_id; city_corporation; name; bn_name }
```

See [src/types.ts](src/types.ts) for the full TypeScript definitions with JSDoc.

## API

| Function | Returns | Notes |
|----------|---------|-------|
| `getDivisions()` | `Division[]` | All 8 divisions |
| `getDivisionById(id)` | `Division \| undefined` | O(1) lookup |
| `getDistricts()` | `District[]` | All 64 districts |
| `getDistrictById(id)` | `District \| undefined` | O(1) lookup |
| `getDistrictsByDivision(divisionId)` | `District[]` | O(1) group lookup |
| `getDivisionOfDistrict(districtId)` | `Division \| undefined` | Upward hierarchy |
| `getUpazilas()` | `Upazila[]` | All 492 upazilas |
| `getUpazilaById(id)` | `Upazila \| undefined` | O(1) lookup |
| `getUpazilasByDistrict(districtId)` | `Upazila[]` | O(1) group lookup |
| `getDistrictOfUpazila(upazilaId)` | `District \| undefined` | Upward hierarchy |
| `getPostcodes()` | `Postcode[]` | All 1,349 postcodes |
| `getPostcodesByDistrict(districtId)` | `Postcode[]` | O(1) group lookup |
| `getDhakaAreas()` | `DhakaArea[]` | All 142 areas |
| `getDhakaAreasByCorporation(name)` | `DhakaArea[]` | Filter by corporation |
| `search(query)` | `SearchResult[]` | Matches EN + Bangla + postcodes |
| `getFullHierarchy()` | `HierarchyDivision[]` | Cached, O(1) on repeat calls |

### Performance

All ID-based lookups use precomputed `Map` structures for **O(1) access** instead of O(n) linear search. The `getFullHierarchy()` result is lazily cached — first call builds the tree, subsequent calls return the cached result.

### Common Patterns

**Address dropdown cascade:**

```ts
import bd from 'bangladesh-geojson';

// 1. User selects a division
const districts = bd.getDistrictsByDivision(selectedDivisionId);

// 2. User selects a district
const upazilas = bd.getUpazilasByDistrict(selectedDistrictId);

// 3. User selects an upazila — show postcodes
const postcodes = bd.getPostcodesByDistrict(selectedDistrictId)
  .filter(p => p.upazila === selectedUpazilaName);
```

**Upward hierarchy traversal:**

```ts
// Given an upazila, find its district and division
const district = bd.getDistrictOfUpazila('10');
const division = district ? bd.getDivisionOfDistrict(district.id) : undefined;
```

More examples in [docs/USAGE.md](docs/USAGE.md).

## Data Quality

This package includes automated data validation and testing:

- **30 tests** covering data counts, referential integrity, uniqueness, whitespace, required fields, hierarchy completeness, and specific data correctness
- **Comprehensive validation** of all 7 data files including GeoJSON schema checks
- **CI pipeline** runs validation + tests + type checking on every PR

```bash
npm run validate   # comprehensive data validation
npm run test       # 30 integrity tests
```

## Use Cases

- **E-commerce** — shipping address dropdowns, delivery zones, postcode lookup
- **Logistics** — route planning across divisions and districts
- **NGO / Government** — beneficiary mapping, coverage reporting
- **Fintech** — KYC address validation
- **Civic tech** — election visualizations, public service maps
- **Education** — teaching geography, building Bangla-first apps

## Demo Site

The demo at [geojson.bd](https://geojson.bd) lets you:
- Search any division, district, or upazila by EN or Bangla name
- Browse the full hierarchy with cascade dropdowns
- See the boundary on a MapLibre map (OpenFreeMap tiles)
- Copy any record as JSON in one click

Run it locally:

```bash
npm install
npm run demo:install
npm run demo:dev
```

## Contributing

Found wrong coordinates? A missing upazila? A typo in a Bangla name? PRs are very welcome.

See [docs/CONTRIBUTING.md](docs/CONTRIBUTING.md). Data validation and tests run automatically on every PR.

## Validation

Before submitting a data PR, run:

```bash
npm run validate   # comprehensive data validation
npm run test       # 30 data integrity tests
```

Validation checks structure, required fields, referential integrity, cross-dataset consistency, whitespace, duplicate names, coordinate bounds, GeoJSON schema, hierarchy completeness, and data count expectations.

## License

This project uses **two licenses**:

- **Code** (the npm package, demo site, scripts) — [MIT](LICENSE). Free for any use, commercial or otherwise.
- **Data files derived from OpenStreetMap** — [ODbL 1.0](LICENSE-DATA). Specifically `bd-bazars.geojson` and `bd-major-routes.geojson`. ODbL requires attribution and share-alike on derived databases.
- **Boundary data** (`bangladesh.geojson`) — [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/), sourced from [geoBoundaries](https://www.geoboundaries.org/) (gbOpen, ADM3). Underlying authority: Bangladesh Bureau of Statistics (BBS) / OCHA ROAP.
- **Administrative reference data** (`bd-divisions.json`, `bd-districts.json`, `bd-upazilas.json`, `bd-postcodes.json`, `dhaka-city.json`) — community-contributed, MIT.

**Attribution when using OSM-derived layers:**

> © OpenStreetMap contributors — odbl-1.0

See `metadata.attribution` inside each derived GeoJSON for the exact string.

## Credits

Maintained by [@ifahimreza](https://github.com/ifahimreza) and [contributors](https://github.com/ifahimreza/bangladesh-geojson/graphs/contributors). Map tiles by [OpenFreeMap](https://openfreemap.org).
