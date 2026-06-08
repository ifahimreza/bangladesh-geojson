# Contributing

PRs and issues welcome. Three things you can fix:

## Reference data

Edit the JSON in `src/data/`:

- `bd-divisions.json`, `bd-districts.json`, `bd-upazilas.json`, `bd-postcodes.json`, `dhaka-city.json`

Rules for new entries: unique `id`, both `name` and `bn_name`, valid parent reference, lat/long inside Bangladesh (lat 20.5–26.7, long 88.0–92.8).

**Important:** Do not add trailing whitespace to `name` or `bn_name` fields. The validation script will catch and reject these.

## Bazars and routes

These come from **[OpenStreetMap](https://www.openstreetmap.org/)** — fix them upstream, not here.

**Fastest path:** [open an issue](https://github.com/ifahimreza/bangladesh-geojson/issues) with a Google Maps link or pin and what's wrong. I'll edit OSM and re-sync.

**Direct path:** sign up at [openstreetmap.org](https://www.openstreetmap.org/user/new), find the place, click **Edit**, fix the `name` / `name:bn` / `amenity=marketplace` / `highway=*` tag, save. Then ping me to re-run the sync.

## Code

PR with a short description. Keep it focused.

### TypeScript

The package source is in `src/index.ts` and `src/types.ts`. All exported interfaces have JSDoc comments — please maintain this convention when adding new types or functions.

Run type checking:

```bash
npx tsc --noEmit
```

### Git commit style

Use [Conventional Commits](https://www.conventionalcommits.org/):

```
fix: correct division_id for Mymensingh postcodes
feat: add getDivisionOfDistrict() API
docs: update README with new API functions
test: add hierarchy completeness tests
ci: add typecheck job to CI pipeline
refactor: precompute lookup maps for O(1) access
```

## Before you submit

```bash
npm run validate   # comprehensive data validation
npm run test       # 30 data integrity tests
npx tsc --noEmit   # TypeScript type check
```

All three run in CI on every PR. If any fails, the PR can't merge.

## Re-running data builds

```bash
node scripts/build-boundary.js     # upazila polygons
node scripts/build-poi.js bazars   # bazars from OpenStreetMap
node scripts/build-poi.js routes   # major highways from OpenStreetMap
node scripts/build-poi.js all      # both
```

Commit the regenerated files alongside your code change.

## Data validation details

The validation script (`npm run validate`) checks:

- All 7 data files load with correct structure
- Required fields present and non-empty
- No leading/trailing whitespace in string fields
- No duplicate IDs or duplicate names within same parent
- Referential integrity (division_id, district_id reference real records)
- Cross-dataset consistency (postcode division_id matches its district's division)
- Coordinate bounds within Bangladesh
- Boundary GeoJSON: Feature type, geometry, bbox (including Saint Martin's Island)
- Bazar and Route GeoJSON validity
- Dhaka city data: required fields, valid corporation names
- Hierarchy completeness (no orphan districts/upazilas, no empty parents)
- Data count expectations (8 divisions, 64 districts, 492 upazilas, 1349 postcodes)

## License

Code → [MIT](../LICENSE). OpenStreetMap-derived data → [ODbL](../LICENSE-DATA). Submitting a PR means you agree to the matching license for the file you're editing.
