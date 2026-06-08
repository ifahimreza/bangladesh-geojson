/**
 * Geographic data types for Bangladesh.
 *
 * All IDs are string-encoded integers matching the source JSON files.
 * Coordinate fields (`lat`, `long`) are also strings to preserve
 * the exact formatting of the original data.
 */

/** A first-level administrative division (বিভাগ). Bangladesh has 8 divisions. */
export interface Division {
  id: string;
  name: string;
  bn_name: string;
  lat: string;
  long: string;
}

/** A second-level administrative division (জেলা). Each district belongs to a division. */
export interface District {
  id: string;
  division_id: string;
  name: string;
  bn_name: string;
  lat: string;
  long: string;
}

/** A third-level administrative division (উপজেলা). Each upazila belongs to a district. */
export interface Upazila {
  id: string;
  district_id: string;
  name: string;
  bn_name: string;
}

/** A postcode entry mapping a post office to its upazila and district. */
export interface Postcode {
  division_id: string;
  district_id: string;
  upazila: string;
  postOffice: string;
  postCode: string;
}

/** A Dhaka city area, grouped by city corporation. */
export interface DhakaArea {
  division_id: string;
  district_id: string;
  city_corporation: string;
  name: string;
  bn_name: string;
}

/** A bazar/market point of interest from OpenStreetMap. */
export interface Bazar {
  osm_id: string;
  name: string;
  bn_name: string;
  upazila_id: string;
  district_id: string;
  division_id: string;
  upazila: string;
  district: string;
  operator?: string;
  opening_hours?: string;
  wikidata?: string;
}

/** A major road/route from OpenStreetMap. */
export interface Route {
  osm_id: string;
  name: string;
  bn_name: string;
  ref: string;
  highway: 'motorway' | 'trunk' | 'primary' | 'secondary' | 'tertiary' | string;
  surface?: string;
  lanes?: string;
  oneway?: string;
}

/** The type of entity returned by a search. */
export type SearchResultType = 'division' | 'district' | 'upazila' | 'postcode' | 'dhaka_area';

/** A search result linking an entity type to its data. */
export interface SearchResult {
  type: SearchResultType;
  data: Division | District | Upazila | Postcode | DhakaArea;
}

/** An upazila within the hierarchy tree (leaf node). */
export interface HierarchyUpazila extends Upazila {}

/** A district with its child upazilas in the hierarchy tree. */
export interface HierarchyDistrict extends District {
  upazilas: HierarchyUpazila[];
}

/** A division with its child districts (and their upazilas) in the hierarchy tree. */
export interface HierarchyDivision extends Division {
  districts: HierarchyDistrict[];
}

/**
 * Complete API surface of the bangladesh-geojson package.
 * This is the type of the default export.
 */
export interface BangladeshGeoAPI {
  /** Get all 8 divisions. */
  getDivisions: () => Division[];
  /** Look up a division by its ID. O(1). */
  getDivisionById: (id: string) => Division | undefined;
  /** Get all 64 districts. */
  getDistricts: () => District[];
  /** Look up a district by its ID. O(1). */
  getDistrictById: (id: string) => District | undefined;
  /** Get districts belonging to a division. O(1). */
  getDistrictsByDivision: (divisionId: string) => District[];
  /** Find which division a district belongs to. O(1). */
  getDivisionOfDistrict: (districtId: string) => Division | undefined;
  /** Get all 492 upazilas. */
  getUpazilas: () => Upazila[];
  /** Look up an upazila by its ID. O(1). */
  getUpazilaById: (id: string) => Upazila | undefined;
  /** Get upazilas belonging to a district. O(1). */
  getUpazilasByDistrict: (districtId: string) => Upazila[];
  /** Find which district an upazila belongs to. O(1). */
  getDistrictOfUpazila: (upazilaId: string) => District | undefined;
  /** Get all 1,349 postcodes. */
  getPostcodes: () => Postcode[];
  /** Get postcodes belonging to a district. O(1). */
  getPostcodesByDistrict: (districtId: string) => Postcode[];
  /** Get all 142 Dhaka city areas. */
  getDhakaAreas: () => DhakaArea[];
  /** Get Dhaka city areas filtered by city corporation name. */
  getDhakaAreasByCorporation: (corporation: string) => DhakaArea[];
  /** Search across all entity types by name, Bengali name, or postcode. */
  search: (query: string) => SearchResult[];
  /** Build the full division → district → upazila hierarchy tree. Cached. */
  getFullHierarchy: () => HierarchyDivision[];
}
