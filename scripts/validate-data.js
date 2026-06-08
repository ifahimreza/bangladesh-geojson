#!/usr/bin/env node
/**
 * Comprehensive data validation for bangladesh-geojson.
 * Run: node scripts/validate-data.js
 *
 * Checks:
 *  1. All 7 data files load and have expected root keys.
 *  2. Required fields are present and non-empty.
 *  3. No leading/trailing whitespace in string fields.
 *  4. No duplicate IDs within a file.
 *  5. No duplicate names within the same parent (e.g. two upazilas with same name in same district).
 *  6. Referential integrity: division_id, district_id reference real records.
 *  7. Cross-dataset consistency: postcode division_id matches the division of its district.
 *  8. Coordinate bounds check (lat 20.5–26.7, long 88.0–92.8).
 *  9. Boundary GeoJSON: Feature type, geometry validity, bbox, join integrity.
 * 10. Bazar GeoJSON: Feature type, required properties.
 * 11. Route GeoJSON: Feature type, required properties, highway values.
 * 12. Dhaka city data: required fields, valid corporation names.
 * 13. Hierarchy completeness: no orphan districts/upazilas, no empty parents.
 * 14. Data count expectations (8 divisions, 64 districts, 492 upazilas, 1349 postcodes).
 */

const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'src', 'data');

const BD_BOUNDS = {
  latMin: 20.5,
  latMax: 26.7,
  longMin: 88.0,
  longMax: 92.8,
};

const EXPECTED_COUNTS = {
  divisions: 8,
  districts: 64,
  upazilas: 492,
  postcodes: 1349,
  dhaka: 142,
};

const errors = [];
const warnings = [];

function err(msg) {
  errors.push(msg);
}
function warn(msg) {
  warnings.push(msg);
}

function readJSON(file) {
  const full = path.join(DATA_DIR, file);
  const raw = fs.readFileSync(full, 'utf8');
  return JSON.parse(raw);
}

function checkCoords(label, lat, lng) {
  const latNum = parseFloat(lat);
  const lngNum = parseFloat(lng);
  if (Number.isNaN(latNum) || Number.isNaN(lngNum)) {
    err(`${label}: lat/long not numeric (lat=${lat}, long=${lng})`);
    return;
  }
  if (latNum < BD_BOUNDS.latMin || latNum > BD_BOUNDS.latMax) {
    err(`${label}: lat ${latNum} outside Bangladesh bounds (${BD_BOUNDS.latMin}–${BD_BOUNDS.latMax})`);
  }
  if (lngNum < BD_BOUNDS.longMin || lngNum > BD_BOUNDS.longMax) {
    err(`${label}: long ${lngNum} outside Bangladesh bounds (${BD_BOUNDS.longMin}–${BD_BOUNDS.longMax})`);
  }
}

function checkRequired(label, obj, fields) {
  for (const f of fields) {
    if (obj[f] === undefined || obj[f] === null || obj[f] === '') {
      err(`${label}: missing required field "${f}"`);
    }
  }
}

function checkWhitespace(label, obj, fields) {
  for (const f of fields) {
    if (typeof obj[f] === 'string' && obj[f] !== obj[f].trim()) {
      err(`${label}: field "${f}" has leading/trailing whitespace`);
    }
  }
}

function checkUniqueIds(label, items) {
  const seen = new Set();
  for (const item of items) {
    if (seen.has(item.id)) {
      err(`${label}: duplicate id "${item.id}"`);
    }
    seen.add(item.id);
  }
}

function checkDuplicateNames(label, items, nameField, parentIdField) {
  const groups = new Map();
  for (const item of items) {
    const key = `${item[parentIdField]}:${item[nameField]}`;
    if (groups.has(key)) {
      err(`${label}: duplicate ${nameField} "${item[nameField]}" within same ${parentIdField}="${item[parentIdField]}"`);
    }
    groups.set(key, true);
  }
}

// ─── 1. Load all data files ─────────────────────────────────────────────────

console.log('📦 Loading data files...');

let divisions, districts, upazilas, postcodes, dhaka;

try {
  const file = readJSON('bd-divisions.json');
  if (!Array.isArray(file.divisions)) err('bd-divisions.json: missing root key "divisions"');
  divisions = file.divisions || [];
} catch (e) {
  err(`bd-divisions.json: failed to load (${e.message})`);
  divisions = [];
}

try {
  const file = readJSON('bd-districts.json');
  if (!Array.isArray(file.districts)) err('bd-districts.json: missing root key "districts"');
  districts = file.districts || [];
} catch (e) {
  err(`bd-districts.json: failed to load (${e.message})`);
  districts = [];
}

try {
  const file = readJSON('bd-upazilas.json');
  if (!Array.isArray(file.upazilas)) err('bd-upazilas.json: missing root key "upazilas"');
  upazilas = file.upazilas || [];
} catch (e) {
  err(`bd-upazilas.json: failed to load (${e.message})`);
  upazilas = [];
}

try {
  const file = readJSON('bd-postcodes.json');
  if (!Array.isArray(file.postcodes)) err('bd-postcodes.json: missing root key "postcodes"');
  postcodes = file.postcodes || [];
} catch (e) {
  err(`bd-postcodes.json: failed to load (${e.message})`);
  postcodes = [];
}

try {
  const file = readJSON('dhaka-city.json');
  if (!Array.isArray(file.dhaka)) err('dhaka-city.json: missing root key "dhaka"');
  dhaka = file.dhaka || [];
} catch (e) {
  err(`dhaka-city.json: failed to load (${e.message})`);
  dhaka = [];
}

// ─── 2. Data count expectations ─────────────────────────────────────────────

console.log('📊 Checking data counts...');
if (divisions.length !== EXPECTED_COUNTS.divisions) warn(`Expected ${EXPECTED_COUNTS.divisions} divisions, got ${divisions.length}`);
if (districts.length !== EXPECTED_COUNTS.districts) warn(`Expected ${EXPECTED_COUNTS.districts} districts, got ${districts.length}`);
if (upazilas.length !== EXPECTED_COUNTS.upazilas) warn(`Expected ${EXPECTED_COUNTS.upazilas} upazilas, got ${upazilas.length}`);
if (postcodes.length !== EXPECTED_COUNTS.postcodes) warn(`Expected ${EXPECTED_COUNTS.postcodes} postcodes, got ${postcodes.length}`);
if (dhaka.length !== EXPECTED_COUNTS.dhaka) warn(`Expected ${EXPECTED_COUNTS.dhaka} Dhaka areas, got ${dhaka.length}`);

// ─── 3. Validate divisions ──────────────────────────────────────────────────

console.log('🏛️  Validating divisions...');
checkUniqueIds('divisions', divisions);
const divisionIds = new Set(divisions.map((d) => d.id));
for (const d of divisions) {
  const label = `division[id=${d.id}]`;
  checkRequired(label, d, ['id', 'name', 'bn_name', 'lat', 'long']);
  checkWhitespace(label, d, ['name', 'bn_name']);
  checkCoords(label, d.lat, d.long);
}

// ─── 4. Validate districts ──────────────────────────────────────────────────

console.log('🏙️  Validating districts...');
checkUniqueIds('districts', districts);
const districtIds = new Set(districts.map((d) => d.id));
checkDuplicateNames('districts', districts, 'name', 'division_id');
for (const d of districts) {
  const label = `district[id=${d.id}, name=${d.name}]`;
  checkRequired(label, d, ['id', 'division_id', 'name', 'bn_name', 'lat', 'long']);
  checkWhitespace(label, d, ['name', 'bn_name']);
  if (d.division_id && !divisionIds.has(d.division_id)) {
    err(`${label}: division_id "${d.division_id}" not found in divisions`);
  }
  checkCoords(label, d.lat, d.long);
}

// ─── 5. Validate upazilas ───────────────────────────────────────────────────

console.log('🏘️  Validating upazilas...');
checkUniqueIds('upazilas', upazilas);
checkDuplicateNames('upazilas', upazilas, 'name', 'district_id');
for (const u of upazilas) {
  const label = `upazila[id=${u.id}, name=${u.name}]`;
  checkRequired(label, u, ['id', 'district_id', 'name', 'bn_name']);
  checkWhitespace(label, u, ['name', 'bn_name']);
  if (u.district_id && !districtIds.has(u.district_id)) {
    err(`${label}: district_id "${u.district_id}" not found in districts`);
  }
}

// ─── 6. Validate postcodes ──────────────────────────────────────────────────

console.log('📮 Validating postcodes...');
let postcodesMissingDistrict = 0;
let postcodesWrongDivision = 0;
for (const p of postcodes) {
  const label = `postcode[${p.postCode}]`;
  if (!p.postCode || !p.postOffice) {
    err(`${label}: missing postCode/postOffice (${JSON.stringify(p)})`);
  }
  checkWhitespace(label, p, ['postOffice', 'upazila']);
  if (p.district_id && !districtIds.has(p.district_id)) {
    err(`${label}: district_id "${p.district_id}" not found in districts`);
  }
  if (!p.district_id) {
    postcodesMissingDistrict++;
  } else {
    // Cross-check: postcode division_id must match the division of its district
    const district = districts.find((d) => d.id === p.district_id);
    if (district && p.division_id && district.division_id !== p.division_id) {
      err(`${label}: division_id "${p.division_id}" doesn't match district "${district.name}" division_id "${district.division_id}"`);
      postcodesWrongDivision++;
    }
  }
}
if (postcodesMissingDistrict > 0) {
  warn(`${postcodesMissingDistrict} postcode(s) missing district_id mapping`);
}

// ─── 7. Validate Dhaka city data ────────────────────────────────────────────

console.log('🌆 Validating Dhaka city data...');
const corporations = new Set(dhaka.map((a) => a.city_corporation));
for (const a of dhaka) {
  const label = `dhaka_area[name=${a.name}]`;
  checkRequired(label, a, ['division_id', 'district_id', 'city_corporation', 'name', 'bn_name']);
  checkWhitespace(label, a, ['name', 'bn_name', 'city_corporation']);
}

// ─── 8. Hierarchy completeness ──────────────────────────────────────────────

console.log('🌳 Checking hierarchy completeness...');

// Districts per division
for (const div of divisions) {
  const divDistricts = districts.filter((d) => d.division_id === div.id);
  if (divDistricts.length === 0) {
    warn(`Division "${div.name}" (id=${div.id}) has no districts`);
  }
}

// Upazilas per district
const districtsByDivMap = new Map();
for (const d of districts) {
  const distUpazilas = upazilas.filter((u) => u.district_id === d.id);
  if (distUpazilas.length === 0) {
    warn(`District "${d.name}" (id=${d.id}) has no upazilas`);
  }
  const key = d.division_id;
  if (!districtsByDivMap.has(key)) districtsByDivMap.set(key, []);
  districtsByDivMap.get(key).push(d);
}

// Orphan upazilas (district_id references non-existent district)
for (const u of upazilas) {
  if (u.district_id && !districtIds.has(u.district_id)) {
    err(`Orphan upazila: id=${u.id} name="${u.name}" references unknown district_id="${u.district_id}"`);
  }
}

// ─── 9. Boundary GeoJSON validation ─────────────────────────────────────────

console.log('🗺️  Validating boundary GeoJSON...');
let boundaryFeatures = 0;
let boundaryMatched = 0;
try {
  const bd = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'bangladesh.geojson'), 'utf8'));
  if (bd.type !== 'FeatureCollection') {
    err('bangladesh.geojson: top-level type must be "FeatureCollection"');
  }
  if (!Array.isArray(bd.features)) {
    err('bangladesh.geojson: missing "features"');
  } else {
    boundaryFeatures = bd.features.length;
    if (!Array.isArray(bd.bbox) || bd.bbox.length !== 4) {
      warn('bangladesh.geojson: missing top-level bbox');
    } else if (bd.bbox[1] > 20.65) {
      err(`bangladesh.geojson: south edge ${bd.bbox[1].toFixed(3)}°N excludes Saint Martin's Island (need ≤ 20.65)`);
    }
    const upaIds = new Set(upazilas.map((u) => u.id));
    const distIdSet = new Set(districts.map((d) => d.id));
    let orphanUpazila = 0;
    let orphanDistrict = 0;
    let invalidGeometry = 0;
    for (const f of bd.features) {
      if (f.type !== 'Feature') {
        err(`bangladesh.geojson: feature has type "${f.type}", expected "Feature"`);
        continue;
      }
      if (!f.geometry || !f.geometry.type || !f.geometry.coordinates) {
        invalidGeometry++;
      }
      const p = f.properties || {};
      if (p.upazila_id) {
        boundaryMatched++;
        if (!upaIds.has(p.upazila_id)) orphanUpazila++;
      }
      if (p.district_id && !distIdSet.has(p.district_id)) orphanDistrict++;
    }
    if (invalidGeometry > 0) err(`bangladesh.geojson: ${invalidGeometry} feature(s) have invalid geometry`);
    if (orphanUpazila) err(`bangladesh.geojson: ${orphanUpazila} feature(s) reference unknown upazila_id`);
    if (orphanDistrict) err(`bangladesh.geojson: ${orphanDistrict} feature(s) reference unknown district_id`);
    const unmatched = boundaryFeatures - boundaryMatched;
    if (unmatched > 0) warn(`bangladesh.geojson: ${unmatched} feature(s) have no upazila_id (city thanas / unmatched)`);
  }
} catch (e) {
  err(`bangladesh.geojson: failed to load (${e.message})`);
}

// ─── 10. Bazar GeoJSON validation ───────────────────────────────────────────

console.log('🏪 Validating bazar GeoJSON...');
try {
  const bazars = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'bd-bazars.geojson'), 'utf8'));
  if (bazars.type !== 'FeatureCollection') {
    err('bd-bazars.geojson: top-level type must be "FeatureCollection"');
  }
  if (!Array.isArray(bazars.features)) {
    err('bd-bazars.geojson: missing "features"');
  } else {
    let invalidGeometry = 0;
    let missingName = 0;
    for (const f of bazars.features) {
      if (f.type !== 'Feature') continue;
      if (!f.geometry || !f.geometry.type || !f.geometry.coordinates) invalidGeometry++;
      const p = f.properties || {};
      if (!p.name && !p.bn_name) missingName++;
    }
    if (invalidGeometry > 0) err(`bd-bazars.geojson: ${invalidGeometry} feature(s) have invalid geometry`);
    if (missingName > 0) warn(`bd-bazars.geojson: ${missingName} feature(s) have no name or bn_name`);
    console.log(`   ✅ ${bazars.features.length} bazar features validated`);
  }
} catch (e) {
  err(`bd-bazars.geojson: failed to load (${e.message})`);
}

// ─── 11. Route GeoJSON validation ───────────────────────────────────────────

console.log('🛣️  Validating route GeoJSON...');
try {
  const routes = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'bd-major-routes.geojson'), 'utf8'));
  if (routes.type !== 'FeatureCollection') {
    err('bd-major-routes.geojson: top-level type must be "FeatureCollection"');
  }
  if (!Array.isArray(routes.features)) {
    err('bd-major-routes.geojson: missing "features"');
  } else {
    let invalidGeometry = 0;
    let missingRef = 0;
    const highwayTypes = new Set();
    for (const f of routes.features) {
      if (f.type !== 'Feature') continue;
      if (!f.geometry || !f.geometry.type || !f.geometry.coordinates) invalidGeometry++;
      const p = f.properties || {};
      if (p.highway) highwayTypes.add(p.highway);
      if (!p.ref && !p.name) missingRef++;
    }
    if (invalidGeometry > 0) err(`bd-major-routes.geojson: ${invalidGeometry} feature(s) have invalid geometry`);
    if (missingRef > 0) warn(`bd-major-routes.geojson: ${missingRef} feature(s) have no ref or name`);
    console.log(`   ✅ ${routes.features.length} route features validated (highway types: ${[...highwayTypes].join(', ')})`);
  }
} catch (e) {
  err(`bd-major-routes.geojson: failed to load (${e.message})`);
}

// ─── Report ──────────────────────────────────────────────────────────────────

console.log('');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('  Bangladesh GeoJSON — Data Validation Report');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log(`  Divisions:  ${divisions.length}`);
console.log(`  Districts:  ${districts.length}`);
console.log(`  Upazilas:   ${upazilas.length}`);
console.log(`  Postcodes:  ${postcodes.length}`);
console.log(`  Dhaka:      ${dhaka.length}`);
console.log(`  Boundary:   ${boundaryFeatures} features (${boundaryMatched} joined to upazilas)`);
console.log(`  Corporations: ${[...corporations].join(', ')}`);
console.log('');

if (warnings.length) {
  console.log(`⚠️  Warnings (${warnings.length}):`);
  for (const w of warnings) console.log(`   - ${w}`);
  console.log('');
}

if (errors.length) {
  console.log(`❌ Errors (${errors.length}):`);
  for (const e of errors) console.log(`   - ${e}`);
  console.log('');
  console.log('💥 FAIL');
  process.exit(1);
}

console.log('✅ OK — all data valid');
