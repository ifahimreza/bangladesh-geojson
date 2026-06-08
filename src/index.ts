import divisionsRaw from './data/bd-divisions.json';
import districtsRaw from './data/bd-districts.json';
import upazilasRaw from './data/bd-upazilas.json';
import postcodesRaw from './data/bd-postcodes.json';
import dhakaRaw from './data/dhaka-city.json';
import {
  Division,
  District,
  Upazila,
  Postcode,
  DhakaArea,
  SearchResult,
  HierarchyDivision,
  HierarchyDistrict,
  BangladeshGeoAPI,
} from './types';

const divisions: Division[] = (divisionsRaw as { divisions: Division[] }).divisions;
const districts: District[] = (districtsRaw as { districts: District[] }).districts;
const upazilas: Upazila[] = (upazilasRaw as { upazilas: Upazila[] }).upazilas;
const postcodes: Postcode[] = (postcodesRaw as { postcodes: Postcode[] }).postcodes;
const dhaka: DhakaArea[] = (dhakaRaw as { dhaka: DhakaArea[] }).dhaka;

// ─── Precomputed lookup maps (O(1) lookups) ──────────────────────────────────

const divisionById = new Map<string, Division>(divisions.map((d) => [d.id, d]));
const districtById = new Map<string, District>(districts.map((d) => [d.id, d]));
const upazilaById = new Map<string, Upazila>(upazilas.map((u) => [u.id, u]));

const districtsByDivision = new Map<string, District[]>();
for (const d of districts) {
  const group = districtsByDivision.get(d.division_id) || [];
  group.push(d);
  districtsByDivision.set(d.division_id, group);
}

const upazilasByDistrict = new Map<string, Upazila[]>();
for (const u of upazilas) {
  const group = upazilasByDistrict.get(u.district_id) || [];
  group.push(u);
  upazilasByDistrict.set(u.district_id, group);
}

const postcodesByDistrict = new Map<string, Postcode[]>();
for (const p of postcodes) {
  const group = postcodesByDistrict.get(p.district_id) || [];
  group.push(p);
  postcodesByDistrict.set(p.district_id, group);
}

// ─── API functions ───────────────────────────────────────────────────────────

export function getDivisions(): Division[] {
  return divisions;
}

export function getDivisionById(id: string): Division | undefined {
  return divisionById.get(id);
}

export function getDistricts(): District[] {
  return districts;
}

export function getDistrictById(id: string): District | undefined {
  return districtById.get(id);
}

export function getDistrictsByDivision(divisionId: string): District[] {
  return districtsByDivision.get(divisionId) || [];
}

/** Find which division a district belongs to. */
export function getDivisionOfDistrict(districtId: string): Division | undefined {
  const district = districtById.get(districtId);
  if (!district) return undefined;
  return divisionById.get(district.division_id);
}

export function getUpazilas(): Upazila[] {
  return upazilas;
}

export function getUpazilaById(id: string): Upazila | undefined {
  return upazilaById.get(id);
}

export function getUpazilasByDistrict(districtId: string): Upazila[] {
  return upazilasByDistrict.get(districtId) || [];
}

/** Find which district an upazila belongs to. */
export function getDistrictOfUpazila(upazilaId: string): District | undefined {
  const upazila = upazilaById.get(upazilaId);
  if (!upazila) return undefined;
  return districtById.get(upazila.district_id);
}

export function getPostcodes(): Postcode[] {
  return postcodes;
}

export function getPostcodesByDistrict(districtId: string): Postcode[] {
  return postcodesByDistrict.get(districtId) || [];
}

export function getDhakaAreas(): DhakaArea[] {
  return dhaka;
}

/** Get Dhaka city areas filtered by city corporation name. */
export function getDhakaAreasByCorporation(corporation: string): DhakaArea[] {
  const q = corporation.toLowerCase();
  return dhaka.filter((a) => a.city_corporation.toLowerCase().includes(q));
}

export function search(query: string): SearchResult[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];

  const results: SearchResult[] = [];
  const matches = (s: string | undefined) => !!s && s.toLowerCase().includes(q);

  for (const d of divisions) {
    if (matches(d.name) || matches(d.bn_name)) results.push({ type: 'division', data: d });
  }
  for (const d of districts) {
    if (matches(d.name) || matches(d.bn_name)) results.push({ type: 'district', data: d });
  }
  for (const u of upazilas) {
    if (matches(u.name) || matches(u.bn_name)) results.push({ type: 'upazila', data: u });
  }
  for (const p of postcodes) {
    if (matches(p.postOffice) || matches(p.upazila) || matches(p.postCode)) {
      results.push({ type: 'postcode', data: p });
    }
  }
  for (const a of dhaka) {
    if (matches(a.name) || matches(a.bn_name)) results.push({ type: 'dhaka_area', data: a });
  }
  return results;
}

// ─── Hierarchy (cached) ─────────────────────────────────────────────────────

let hierarchyCache: HierarchyDivision[] | null = null;

export function getFullHierarchy(): HierarchyDivision[] {
  if (hierarchyCache) return hierarchyCache;

  hierarchyCache = divisions.map((division) => {
    const divDistricts: HierarchyDistrict[] = (districtsByDivision.get(division.id) || []).map(
      (district) => ({
        ...district,
        upazilas: upazilasByDistrict.get(district.id) || [],
      })
    );
    return { ...division, districts: divDistricts };
  });

  return hierarchyCache;
}

// ─── Default export ──────────────────────────────────────────────────────────

const bd: BangladeshGeoAPI = {
  getDivisions,
  getDivisionById,
  getDistricts,
  getDistrictById,
  getDistrictsByDivision,
  getDivisionOfDistrict,
  getUpazilas,
  getUpazilaById,
  getUpazilasByDistrict,
  getDistrictOfUpazila,
  getPostcodes,
  getPostcodesByDistrict,
  getDhakaAreas,
  getDhakaAreasByCorporation,
  search,
  getFullHierarchy,
};

export default bd;
export * from './types';
