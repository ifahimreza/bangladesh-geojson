#!/usr/bin/env node
/**
 * Data validation for bangladesh-geojson.
 * Run: node scripts/validate-data.js
 *
 * Checks (per CLAUDE.md):
 *  1. Files load and have the expected root key.
 *  2. Required fields (id, name, bn_name) are present.
 *  3. district.division_id and upazila.district_id reference real records.
 *  4. lat/long are within Bangladesh bounds (lat 20.5–26.7, long 88.0–92.8).
 *  5. No duplicate IDs within a file.
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

function checkUniqueIds(label, items) {
  const seen = new Set();
  for (const item of items) {
    if (seen.has(item.id)) {
      err(`${label}: duplicate id "${item.id}"`);
    }
    seen.add(item.id);
  }
}

// 1. Load files and check root keys
let divisions, districts, upazilas, postcodes;
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

// 2. Validate divisions
checkUniqueIds('divisions', divisions);
const divisionIds = new Set(divisions.map((d) => d.id));
for (const d of divisions) {
  const label = `division[id=${d.id}]`;
  checkRequired(label, d, ['id', 'name', 'bn_name', 'lat', 'long']);
  checkCoords(label, d.lat, d.long);
}

// 3. Validate districts
checkUniqueIds('districts', districts);
const districtIds = new Set(districts.map((d) => d.id));
for (const d of districts) {
  const label = `district[id=${d.id}, name=${d.name}]`;
  checkRequired(label, d, ['id', 'division_id', 'name', 'bn_name', 'lat', 'long']);
  if (d.division_id && !divisionIds.has(d.division_id)) {
    err(`${label}: division_id "${d.division_id}" not found in divisions`);
  }
  checkCoords(label, d.lat, d.long);
}

// 4. Validate upazilas
checkUniqueIds('upazilas', upazilas);
for (const u of upazilas) {
  const label = `upazila[id=${u.id}, name=${u.name}]`;
  checkRequired(label, u, ['id', 'district_id', 'name', 'bn_name']);
  if (u.district_id && !districtIds.has(u.district_id)) {
    err(`${label}: district_id "${u.district_id}" not found in districts`);
  }
}

// 5. Postcodes — referential integrity
const districtMap = new Map(districts.map((d) => [d.id, d]));
for (const p of postcodes) {
  const label = `postcode[${p.postCode || 'unknown'}, ${p.postOffice || 'unknown'}]`;
  if (!p.postCode || !p.postOffice) {
    err(`${label}: missing postCode/postOffice (${JSON.stringify(p)})`);
  }
  if (!p.district_id) {
    err(`${label}: missing required field "district_id"`);
  } else if (!districtMap.has(p.district_id)) {
    err(`${label}: district_id "${p.district_id}" not found in districts`);
  } else {
    const parentDistrict = districtMap.get(p.district_id);
    if (p.division_id && p.division_id !== parentDistrict.division_id) {
      err(
        `${label}: division_id "${p.division_id}" does not match district[id=${p.district_id}].division_id "${parentDistrict.division_id}"`
      );
    }
  }
}

// Boundary GeoJSON — bbox + join integrity
let boundaryFeatures = 0;
let boundaryMatched = 0;
try {
  const bd = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'bangladesh.geojson'), 'utf8'));
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
    for (const f of bd.features) {
      const p = f.properties || {};
      if (p.upazila_id) {
        boundaryMatched++;
        if (!upaIds.has(p.upazila_id)) orphanUpazila++;
      }
      if (p.district_id && !distIdSet.has(p.district_id)) orphanDistrict++;
    }
    if (orphanUpazila) err(`bangladesh.geojson: ${orphanUpazila} feature(s) reference unknown upazila_id`);
    if (orphanDistrict) err(`bangladesh.geojson: ${orphanDistrict} feature(s) reference unknown district_id`);
    const unmatched = boundaryFeatures - boundaryMatched;
    if (unmatched > 0) warn(`bangladesh.geojson: ${unmatched} feature(s) have no upazila_id (city thanas / unmatched)`);
  }
} catch (e) {
  err(`bangladesh.geojson: failed to load (${e.message})`);
}

// Report
console.log('Bangladesh GeoJSON — data validation');
console.log('-------------------------------------');
console.log(`divisions: ${divisions.length}`);
console.log(`districts: ${districts.length}`);
console.log(`upazilas:  ${upazilas.length}`);
console.log(`postcodes: ${postcodes.length}`);
console.log(`boundary:  ${boundaryFeatures} features (${boundaryMatched} joined to upazilas)`);
console.log('');

if (warnings.length) {
  console.log(`Warnings (${warnings.length}):`);
  for (const w of warnings) console.log(`  - ${w}`);
  console.log('');
}

if (errors.length) {
  console.log(`Errors (${errors.length}):`);
  for (const e of errors) console.log(`  - ${e}`);
  console.log('');
  console.log('FAIL');
  process.exit(1);
}

console.log('OK — all data valid');
