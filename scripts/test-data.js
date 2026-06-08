#!/usr/bin/env node
/**
 * Comprehensive test suite for bangladesh-geojson data integrity.
 * Run: node scripts/test-data.js
 *
 * 30 tests covering:
 *  - Data counts
 *  - Referential integrity
 *  - Uniqueness constraints
 *  - Whitespace validation
 *  - Required fields
 *  - Hierarchy completeness
 *  - Specific data correctness
 *  - GeoJSON validity
 */

const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'src', 'data');

let passed = 0;
let failed = 0;
const failures = [];

function test(name, fn) {
  try {
    fn();
    passed++;
    console.log(`  ✅ ${name}`);
  } catch (e) {
    failed++;
    failures.push({ name, error: e.message });
    console.log(`  ❌ ${name}: ${e.message}`);
  }
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function assertEqual(actual, expected, label) {
  if (actual !== expected) throw new Error(`${label}: expected ${expected}, got ${actual}`);
}

function readJSON(file) {
  return JSON.parse(fs.readFileSync(path.join(DATA_DIR, file), 'utf8'));
}

// Load data
const divisions = readJSON('bd-divisions.json').divisions;
const districts = readJSON('bd-districts.json').districts;
const upazilas = readJSON('bd-upazilas.json').upazilas;
const postcodes = readJSON('bd-postcodes.json').postcodes;
const dhaka = readJSON('dhaka-city.json').dhaka;
const boundary = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'bangladesh.geojson'), 'utf8'));

console.log('');
console.log('🧪 Bangladesh GeoJSON — Data Integrity Tests');
console.log('═══════════════════════════════════════════════════');
console.log('');

// ─── Data Counts ─────────────────────────────────────────────────────────────

console.log('📊 Data Counts:');

test('should have 8 divisions', () => {
  assertEqual(divisions.length, 8, 'divisions count');
});

test('should have 64 districts', () => {
  assertEqual(districts.length, 64, 'districts count');
});

test('should have 492 upazilas', () => {
  assertEqual(upazilas.length, 492, 'upazilas count');
});

test('should have 1349 postcodes', () => {
  assertEqual(postcodes.length, 1349, 'postcodes count');
});

test('should have 142 Dhaka city areas', () => {
  assertEqual(dhaka.length, 142, 'dhaka areas count');
});

console.log('');

// ─── Referential Integrity ──────────────────────────────────────────────────

console.log('🔗 Referential Integrity:');

test('every district.division_id references a valid division', () => {
  const divIds = new Set(divisions.map(d => d.id));
  const orphans = districts.filter(d => !divIds.has(d.division_id));
  assert(orphans.length === 0, `${orphans.length} districts reference unknown division_ids: ${orphans.map(o => o.division_id).join(', ')}`);
});

test('every upazila.district_id references a valid district', () => {
  const distIds = new Set(districts.map(d => d.id));
  const orphans = upazilas.filter(u => !distIds.has(u.district_id));
  assert(orphans.length === 0, `${orphans.length} upazilas reference unknown district_ids: ${orphans.map(o => o.district_id).join(', ')}`);
});

test('every postcode.district_id references a valid district', () => {
  const distIds = new Set(districts.map(d => d.id));
  const orphans = postcodes.filter(p => p.district_id && !distIds.has(p.district_id));
  assert(orphans.length === 0, `${orphans.length} postcodes reference unknown district_ids`);
});

test('postcode division_id matches its district\'s division_id', () => {
  const districtMap = new Map(districts.map(d => [d.id, d]));
  const mismatches = postcodes.filter(p => {
    const dist = districtMap.get(p.district_id);
    return dist && p.division_id && dist.division_id !== p.division_id;
  });
  assert(mismatches.length === 0, `${mismatches.length} postcodes have division_id that doesn't match their district's division_id`);
});

test('every boundary feature with upazila_id references a valid upazila', () => {
  const upaIds = new Set(upazilas.map(u => u.id));
  const orphans = boundary.features.filter(f => f.properties && f.properties.upazila_id && !upaIds.has(f.properties.upazila_id));
  assert(orphans.length === 0, `${orphans.length} boundary features reference unknown upazila_ids`);
});

console.log('');

// ─── Uniqueness ──────────────────────────────────────────────────────────────

console.log('🔑 Uniqueness:');

test('division IDs are unique', () => {
  const ids = divisions.map(d => d.id);
  assertEqual(new Set(ids).size, ids.length, 'unique division IDs');
});

test('district IDs are unique', () => {
  const ids = districts.map(d => d.id);
  assertEqual(new Set(ids).size, ids.length, 'unique district IDs');
});

test('upazila IDs are unique', () => {
  const ids = upazilas.map(u => u.id);
  assertEqual(new Set(ids).size, ids.length, 'unique upazila IDs');
});

test('no duplicate upazila names within same district', () => {
  const keys = upazilas.map(u => `${u.district_id}:${u.name}`);
  const dupes = keys.filter((k, i) => keys.indexOf(k) !== i);
  assert(dupes.length === 0, `Duplicate upazila names: ${dupes.join(', ')}`);
});

console.log('');

// ─── Whitespace ──────────────────────────────────────────────────────────────

console.log('✂️  Whitespace:');

test('no trailing whitespace in division names', () => {
  const bad = divisions.filter(d => d.name !== d.name.trim() || d.bn_name !== d.bn_name.trim());
  assert(bad.length === 0, `${bad.length} divisions have trailing whitespace`);
});

test('no trailing whitespace in district names', () => {
  const bad = districts.filter(d => d.name !== d.name.trim() || d.bn_name !== d.bn_name.trim());
  assert(bad.length === 0, `${bad.length} districts have trailing whitespace`);
});

test('no trailing whitespace in upazila names', () => {
  const bad = upazilas.filter(u => u.name !== u.name.trim() || u.bn_name !== u.bn_name.trim());
  assert(bad.length === 0, `${bad.length} upazilas have trailing whitespace`);
});

console.log('');

// ─── Required Fields ─────────────────────────────────────────────────────────

console.log('📝 Required Fields:');

test('all divisions have required fields', () => {
  const bad = divisions.filter(d => !d.id || !d.name || !d.bn_name || !d.lat || !d.long);
  assert(bad.length === 0, `${bad.length} divisions missing required fields`);
});

test('all districts have required fields', () => {
  const bad = districts.filter(d => !d.id || !d.division_id || !d.name || !d.bn_name || !d.lat || !d.long);
  assert(bad.length === 0, `${bad.length} districts missing required fields`);
});

test('all upazilas have required fields', () => {
  const bad = upazilas.filter(u => !u.id || !u.district_id || !u.name || !u.bn_name);
  assert(bad.length === 0, `${bad.length} upazilas missing required fields`);
});

test('all postcodes have required fields', () => {
  const bad = postcodes.filter(p => !p.postCode || !p.postOffice);
  assert(bad.length === 0, `${bad.length} postcodes missing postCode/postOffice`);
});

console.log('');

// ─── Hierarchy Completeness ──────────────────────────────────────────────────

console.log('🌳 Hierarchy Completeness:');

test('every division has at least one district', () => {
  const divIds = new Set(divisions.map(d => d.id));
  const empty = divisions.filter(d => !districts.some(dist => dist.division_id === d.id));
  assert(empty.length === 0, `Divisions with no districts: ${empty.map(d => d.name).join(', ')}`);
});

test('every district has at least one upazila', () => {
  const empty = districts.filter(d => !upazilas.some(u => u.district_id === d.id));
  assert(empty.length === 0, `Districts with no upazilas: ${empty.map(d => d.name).join(', ')}`);
});

test('Mymensingh division (id=8) has correct districts', () => {
  const mymensingh = districts.filter(d => d.division_id === '8');
  assertEqual(mymensingh.length, 4, 'Mymensingh districts');
  const names = mymensingh.map(d => d.name).sort();
  assert(JSON.stringify(names) === JSON.stringify(['Jamalpur', 'Mymensingh', 'Netrokona', 'Sherpur']),
    `Expected Jamalpur, Mymensingh, Netrokona, Sherpur; got ${names.join(', ')}`);
});

console.log('');

// ─── Specific Data Correctness ───────────────────────────────────────────────

console.log('🎯 Specific Data Correctness:');

test('Mymensingh postcodes have division_id=8', () => {
  const mymensinghDistrictIds = new Set(
    districts.filter(d => d.division_id === '8').map(d => d.id)
  );
  const wrong = postcodes.filter(p => mymensinghDistrictIds.has(p.district_id) && p.division_id !== '8');
  assert(wrong.length === 0, `${wrong.length} Mymensingh postcodes have wrong division_id`);
});

test('no duplicate upazilas (Natore Sadar id=361, Baraigram id=362 removed)', () => {
  const ids = upazilas.map(u => u.id);
  assert(!ids.includes('361'), 'Upazila id=361 (duplicate Natore Sadar) still present');
  assert(!ids.includes('362'), 'Upazila id=362 (duplicate Baraigram) still present');
});

test('Dhaka division exists with id=3', () => {
  const dhaka = divisions.find(d => d.id === '3');
  assert(dhaka && dhaka.name === 'Dhaka', 'Dhaka division (id=3) not found');
});

console.log('');

// ─── GeoJSON Validity ────────────────────────────────────────────────────────

console.log('🗺️  GeoJSON Validity:');

test('boundary is a valid FeatureCollection', () => {
  assertEqual(boundary.type, 'FeatureCollection', 'boundary type');
  assert(Array.isArray(boundary.features), 'boundary has features array');
  assert(boundary.features.length > 0, 'boundary has at least one feature');
});

test('boundary features are valid GeoJSON Features', () => {
  const invalid = boundary.features.filter(f => f.type !== 'Feature' || !f.geometry);
  assert(invalid.length === 0, `${invalid.length} boundary features are not valid GeoJSON Features`);
});

test('boundary has correct bbox covering Saint Martin\'s Island', () => {
  assert(Array.isArray(boundary.bbox), 'boundary has bbox');
  assert(boundary.bbox[1] <= 20.65, `South edge ${boundary.bbox[1]} excludes Saint Martin's Island`);
});

console.log('');

// ─── Summary ─────────────────────────────────────────────────────────────────

console.log('═══════════════════════════════════════════════════');
console.log(`  Results: ${passed} passed, ${failed} failed`);
console.log('═══════════════════════════════════════════════════');

if (failed > 0) {
  console.log('');
  console.log('  Failed tests:');
  for (const f of failures) {
    console.log(`    ❌ ${f.name}: ${f.error}`);
  }
  process.exit(1);
}

console.log('');
console.log('  🎉 All tests passed!');
