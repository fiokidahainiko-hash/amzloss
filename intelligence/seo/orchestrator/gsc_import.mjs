/* AmzLoss SEO Intelligence — GSC Feed Import & Validation Pipeline
   1. Reads raw GSC export JSON
   2. Validates structure, dates, metrics, relationships
   3. Rejects malformed records
   4. Marks feed as IMPORTED/LIVE
   5. Records metadata (import timestamp, date range, property, row count)
   6. Generates post-import report
   7. Updates feed_registry.json

   The imported feed is stored back to gsc_feed.json as validated+enriched data.
   The original raw export can be kept separately for audit purposes. */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { setFeedMetadata, getFeedMetadata, saveFeedRegistry, PROVENANCE, getProvenance, loadFeedRegistry } from "./provenance.mjs";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const DATA_DIR = path.join(__dirname, "../data/");
const GSC_FEED_PATH = path.join(DATA_DIR, "gsc_feed.json");
const GSC_RAW_PATH = path.join(DATA_DIR, "gsc_raw.json");

/* ---------- GSC JSON Schema Validation ---------- */
const REQUIRED_QUERY_FIELDS = ["query", "clicks", "impressions", "ctr", "position"];

export function validateGSCSchema(data) {
  const errors = [];
  if (!data || typeof data !== "object") {
    errors.push({ code: "INVALID_ROOT", message: "GSC feed must be a JSON object", row: null });
    return { valid: false, errors };
  }
  if (!Array.isArray(data.queries)) {
    errors.push({ code: "MISSING_QUERIES", message: "gsc_feed.queries must be an array", row: null });
    return { valid: false, errors };
  }
  return { valid: true, errors: [] };
}

export function validateGSCRecord(record, index) {
  const errors = [];

  if (typeof record !== "object" || record === null) {
    errors.push({ code: "INVALID_RECORD", message: "Record must be an object", row: index });
    return errors;
  }

  /* Required fields */
  for (const field of REQUIRED_QUERY_FIELDS) {
    if (record[field] === undefined) {
      errors.push({ code: "MISSING_FIELD", message: `Missing required field: ${field}`, row: index });
    }
  }

  /* Type checks */
  if (record.query !== undefined && typeof record.query !== "string") {
    errors.push({ code: "INVALID_TYPE", message: "query must be a string", row: index });
  }
  if (record.query !== undefined && record.query.trim().length === 0) {
    errors.push({ code: "EMPTY_QUERY", message: "query cannot be empty", row: index });
  }

  for (const field of ["clicks", "impressions"]) {
    if (record[field] !== undefined && (typeof record[field] !== "number" || record[field] < 0)) {
      errors.push({ code: "INVALID_TYPE", message: `${field} must be a non-negative number`, row: index });
    }
  }

  if (record.ctr !== undefined) {
    if (typeof record.ctr !== "number" || record.ctr < 0 || record.ctr > 1) {
      errors.push({ code: "INVALID_CTR", message: "ctr must be a number between 0 and 1", row: index });
    }
  }

  if (record.position !== undefined) {
    if (typeof record.position !== "number" || record.position < 1 || record.position > 1000) {
      errors.push({ code: "INVALID_POSITION", message: "position must be a number between 1 and 1000", row: index });
    }
  }

  /* Cross-field consistency */
  if (typeof record.clicks === "number" && typeof record.impressions === "number") {
    if (record.clicks > record.impressions) {
      errors.push({ code: "IMPOSSIBLE_VALUE", message: "clicks cannot exceed impressions", row: index });
    }
  }

  if (typeof record.ctr === "number" && typeof record.impressions === "number" && record.impressions > 0) {
    const computedCtr = record.clicks / record.impressions;
    if (Math.abs(record.ctr - computedCtr) > 0.001) {
      errors.push({ code: "CTR_MISMATCH", message: "ctr does not match clicks/impressions ratio", row: index });
    }
  }

  /* Date validation */
  if (record.date !== undefined) {
    if (typeof record.date !== "string") {
      errors.push({ code: "INVALID_DATE", message: "date must be ISO string YYYY-MM-DD", row: index });
    } else {
      const d = new Date(record.date);
      if (isNaN(d.getTime())) {
        errors.push({ code: "INVALID_DATE", message: `Invalid date format: ${record.date}`, row: index });
      }
    }
  }

  /* Page URL validation */
  if (record.page !== undefined && typeof record.page !== "string") {
    errors.push({ code: "INVALID_TYPE", message: "page must be a string URL", row: index });
  }

  return errors;
}

export function validateGCSStructure(data) {
  /* Validates the full feed: schema + record-level validation */
  const schemaResult = validateGSCSchema(data);
  if (!schemaResult.valid) return schemaResult;

  const allErrors = [];
  const validatedRecords = [];
  let skipped = 0;

  for (let i = 0; i < data.queries.length; i++) {
    const recordErrors = validateGSCRecord(data.queries[i], i);
    if (recordErrors.length > 0) {
      allErrors.push(...recordErrors);
      skipped++;
    } else {
      validatedRecords.push(data.queries[i]);
    }
  }

  return {
    valid: allErrors.length === 0,
    total_records: data.queries.length,
    accepted_records: validatedRecords.length,
    skipped_records: skipped,
    errors: allErrors.slice(0, 50), /* cap at 50 errors shown */
    validated_queries: validatedRecords
  };
}

/* ---------- GSC Import Pipeline ---------- */
export async function importGSCFeed({ feedPath, source = "google_search_console", propertyUrl = null } = {}) {
  const inputPath = feedPath || GSC_FEED_PATH;

  /* Step 1: Read raw file */
  if (!fs.existsSync(inputPath)) {
    return { ok: false, error: `File not found: ${inputPath}`, phase: "FILE_READ" };
  }

  let rawData;
  try {
    rawData = JSON.parse(fs.readFileSync(inputPath, "utf-8"));
  } catch (e) {
    return { ok: false, error: `Invalid JSON: ${e.message}`, phase: "PARSE" };
  }

  /* Step 2: Validate structure */
  const validation = validateGCSStructure(rawData);
  if (!validation.valid) {
    return {
      ok: false,
      error: `Validation failed: ${validation.errors[0]?.message}`,
      phase: "VALIDATION",
      validation
    };
  }

  /* Step 3: Compute metadata */
  const queries = validation.validated_queries;
  const dates = queries
    .map(q => q.date)
    .filter(Boolean)
    .sort();
  const allDates = queries.flatMap(q => q.dates || [])
    .filter(d => typeof d === "string");

  const impressionValues = queries.map(q => q.impressions).filter(n => typeof n === "number");
  const clickValues = queries.map(q => q.clicks).filter(n => typeof n === "number");
  const positionValues = queries.map(q => q.position).filter(n => typeof n === "number");

  const totalImpressions = impressionValues.reduce((s, v) => s + v, 0);
  const totalClicks = clickValues.reduce((s, v) => s + v, 0);
  const avgCtr = totalImpressions > 0 ? totalClicks / totalImpressions : 0;
  const avgPosition = positionValues.length > 0
    ? positionValues.reduce((s, v) => s + v, 0) / positionValues.length
    : null;

  /* Step 4: Build enriched feed with provenance metadata */
  const enrichedFeed = {
    meta: {
      source,
      provenance: source === "google_search_console" ? PROVENANCE.IMPORTED : getProvenance(source),
      imported_at: new Date().toISOString(),
      property_url: propertyUrl || null,
      date_range: dates.length >= 2
        ? { start: dates[0], end: dates[dates.length - 1] }
        : (dates.length === 1 ? { start: dates[0], end: dates[0] } : null),
      total_queries: queries.length,
      total_pages: [...new Set(queries.map(q => q.page).filter(Boolean))].length,
      total_clicks: totalClicks,
      total_impressions: totalImpressions,
      avg_ctr: avgCtr,
      avg_position: avgPosition,
      validated: true,
      validation_summary: {
        accepted: validation.accepted_records,
        skipped: validation.skipped_records
      }
    },
    queries,
    pages: Object.entries(
      queries.reduce((acc, q) => {
        if (!q.page) return acc;
        if (!acc[q.page]) acc[q.page] = { url: q.page, queries: 0, impressions: 0, clicks: 0 };
        acc[q.page].queries++;
        acc[q.page].impressions += q.impressions || 0;
        acc[q.page].clicks += q.clicks || 0;
        return acc;
      }, {})
    ).map(([, v]) => v),
    countries: [...new Set(queries.map(q => q.country).filter(Boolean))],
    devices: [...new Set(queries.map(q => q.device).filter(Boolean))]
  };

  /* Step 5: Backup original raw file */
  const rawBackup = rawData.meta?.provenance === PROVENANCE.TEST
    ? fs.readFileSync(inputPath, "utf-8")
    : null;
  if (rawBackup && rawBackup !== JSON.stringify(rawData)) {
    fs.writeFileSync(GSC_RAW_PATH, rawBackup, "utf-8");
  }

  /* Step 6: Write validated+enriched feed */
  fs.writeFileSync(GSC_FEED_PATH, JSON.stringify(enrichedFeed, null, 2), "utf-8");

  /* Step 7: Update feed registry */
  setFeedMetadata("gsc", {
    key: "gsc",
    path: GSC_FEED_PATH,
    provenance: enrichedFeed.meta.provenance,
    description: `Google Search Console data for ${propertyUrl || "unknown property"}`,
    imported_at: enrichedFeed.meta.imported_at,
    date_range: enrichedFeed.meta.date_range,
    property_url: propertyUrl,
    rows: queries.length,
    source,
    validated: true
  });
  saveFeedRegistry();

  /* Step 8: Save and return */
  return {
    ok: true,
    meta: enrichedFeed.meta,
    skipped: validation.skipped_records,
    total_records: validation.total_records
  };
}

/* ---------- Feed Status ---------- */
export function getGSCFeedStatus() {
  loadFeedRegistry();
  const meta = getFeedMetadata("gsc");
  if (!meta) return { status: "NO_FEED", provenance: PROVENANCE.UNAVAILABLE };

  const hasFeed = fs.existsSync(GSC_FEED_PATH);
  if (!hasFeed) return { status: "FILE_MISSING", provenance: PROVENANCE.UNAVAILABLE };

  const feed = JSON.parse(fs.readFileSync(GSC_FEED_PATH, "utf-8"));
  const feedMeta = feed.meta || {};

  const provenance = feedMeta.provenance || getProvenance(feedMeta.source);

  if (provenance === PROVENANCE.TEST) return { status: "TEST_DATA", provenance, meta: feedMeta };
  if (provenance === PROVENANCE.IMPORTED) return { status: "IMPORTED", provenance, meta: feedMeta };
  if (provenance === PROVENANCE.LIVE) return { status: "LIVE", provenance, meta: feedMeta };
  return { status: "UNKNOWN", provenance, meta: feedMeta };
}

export { loadFeedRegistry } from "./provenance.mjs";