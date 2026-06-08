# Usage

## Install

```bash
npm install bangladesh-geojson
```

## Use it

```ts
import bd from 'bangladesh-geojson';

bd.getDivisions();              // all 8
bd.getDistrictsByDivision('3'); // districts in Dhaka
bd.getUpazilasByDistrict('1');  // upazilas in Dhaka district
bd.getPostcodesByDistrict('1'); // postcodes
bd.getDivisionOfDistrict('1');  // find which division a district belongs to
bd.getDistrictOfUpazila('1');   // find which district an upazila belongs to
bd.getDhakaAreasByCorporation('dncc'); // Dhaka North city areas
bd.search('সিলেট');             // English or Bangla
bd.getFullHierarchy();          // nested tree of everything
```

The data ships inside the package — no API key, no internet needed once it's installed.

## Pick a layer

Each dataset has its own subpath, so your bundler ships only what you import:

```ts
import divisions from 'bangladesh-geojson/divisions';
import districts from 'bangladesh-geojson/districts';
import upazilas  from 'bangladesh-geojson/upazilas';
import postcodes from 'bangladesh-geojson/postcodes';

import boundary  from 'bangladesh-geojson/boundary'; // upazila polygons (~3.5 MB)
import bazars    from 'bangladesh-geojson/bazars';   // ~3,500 marketplaces
import routes    from 'bangladesh-geojson/routes';   // major highways
```

Boundary feature properties carry our IDs and Bangla names, so you can join polygons back to the JSON:

```ts
boundary.features[0].properties;
// { upazila_id, district_id, division_id, name, bn_name, ... }
```

## TypeScript

All types include JSDoc comments for IDE autocomplete:

```ts
import type {
  Division,
  District,
  Upazila,
  Postcode,
  DhakaArea,
  Bazar,
  Route,
  SearchResult,
  HierarchyDivision,
  BangladeshGeoAPI,
} from 'bangladesh-geojson';
```

## API Reference

### Core Lookups

| Function | Returns | Performance |
|----------|---------|-------------|
| `getDivisions()` | `Division[]` | — |
| `getDivisionById(id)` | `Division \| undefined` | O(1) |
| `getDistricts()` | `District[]` | — |
| `getDistrictById(id)` | `District \| undefined` | O(1) |
| `getUpazilas()` | `Upazila[]` | — |
| `getUpazilaById(id)` | `Upazila \| undefined` | O(1) |
| `getPostcodes()` | `Postcode[]` | — |
| `getDhakaAreas()` | `DhakaArea[]` | — |

### Group Lookups

| Function | Returns | Performance |
|----------|---------|-------------|
| `getDistrictsByDivision(divisionId)` | `District[]` | O(1) |
| `getUpazilasByDistrict(districtId)` | `Upazila[]` | O(1) |
| `getPostcodesByDistrict(districtId)` | `Postcode[]` | O(1) |
| `getDhakaAreasByCorporation(name)` | `DhakaArea[]` | O(n) filter |

### Hierarchy

| Function | Returns | Performance |
|----------|---------|-------------|
| `getDivisionOfDistrict(districtId)` | `Division \| undefined` | O(1) |
| `getDistrictOfUpazila(upazilaId)` | `District \| undefined` | O(1) |
| `getFullHierarchy()` | `HierarchyDivision[]` | Cached (lazy) |

### Search

```ts
bd.search('dhaka');    // matches name + bn_name + postCode
bd.search('ঢাকা');     // Bangla search works too
bd.search('1205');     // postcode search
```

Results include a `type` field (`'division' | 'district' | 'upazila' | 'postcode' | 'dhaka_area'`) and a `data` field with the matching record.

## Common Patterns

### Address Dropdown Cascade

```ts
import bd from 'bangladesh-geojson';

// 1. User selects a division
const districts = bd.getDistrictsByDivision(selectedDivisionId);

// 2. User selects a district
const upazilas = bd.getUpazilasByDistrict(selectedDistrictId);

// 3. User selects an upazila — show matching postcodes
const postcodes = bd.getPostcodesByDistrict(selectedDistrictId)
  .filter(p => p.upazila === selectedUpazilaName);
```

### Upward Hierarchy Traversal

```ts
// Given an upazila, find its district and division
const district = bd.getDistrictOfUpazila('10');
const division = district ? bd.getDivisionOfDistrict(district.id) : undefined;
```

### Full Hierarchy Tree

```ts
const tree = bd.getFullHierarchy();
// [
//   {
//     id: '1', name: 'Barishal', ...,
//     districts: [
//       {
//         id: '1', name: 'Barguna', ...,
//         upazilas: [ { id: '1', name: 'Amtali', ... }, ... ]
//       },
//       ...
//     ]
//   },
//   ...
// ]
```

## Data Quality

The package includes automated validation and testing:

```bash
npm run validate   # comprehensive validation of all 7 data files
npm run test       # 30 data integrity tests
```

Validation covers: structure, required fields, referential integrity, cross-dataset consistency (postcode division_id vs district), whitespace, duplicate detection, coordinate bounds, GeoJSON schema, hierarchy completeness, and data count expectations.

## License

Code is MIT. Boundary is CC BY 4.0 ([geoBoundaries](https://www.geoboundaries.org/)). Bazars and routes are ODbL ([OpenStreetMap](https://www.openstreetmap.org/)).

When you ship the bazars or routes layer, add this line somewhere visible:

> © OpenStreetMap contributors

That's it.

## Caveats

- 12 postcodes are missing the `district_id` mapping. PRs welcome.
- Upazilas don't have lat/long — use the parent district's coordinates.
- The boundary file has 544 polygons; ~118 of those are Dhaka/Chittagong city thanas, not in `bd-upazilas.json`.
