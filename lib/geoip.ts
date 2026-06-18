// GeoIP lookups via a MaxMind GeoLite2-City mmdb. The reader is opened lazily
// and cached as a module-level promise. If the db file is missing, every lookup
// returns null (callers fall back to demo data); we never throw.
import { existsSync } from "node:fs";
import maxmind, { type Reader, type CityResponse } from "maxmind";
import { CONFIG } from "@/lib/env";
import type { RegionCode } from "@/lib/data";

export interface GeoInfo {
  code: string;
  country: string;
  city: string;
  region: RegionCode;
}

let warned = false;
function warnOnce(msg: string, err?: unknown) {
  if (warned) return;
  warned = true;
  console.warn(msg, err ?? "");
}

let readerPromise: Promise<Reader<CityResponse> | null> | null = null;

function getReader(): Promise<Reader<CityResponse> | null> {
  if (readerPromise) return readerPromise;
  readerPromise = (async () => {
    try {
      if (!CONFIG.GEOIP_PATH || !existsSync(CONFIG.GEOIP_PATH)) {
        warnOnce(`[geoip] db not found at ${CONFIG.GEOIP_PATH}; geo lookups disabled`);
        return null;
      }
      return await maxmind.open<CityResponse>(CONFIG.GEOIP_PATH);
    } catch (err) {
      warnOnce(`[geoip] failed to open db at ${CONFIG.GEOIP_PATH}`, err);
      return null;
    }
  })();
  return readerPromise;
}

const MIDDLE_EAST = new Set([
  "IR", "TR", "SA", "AE", "IQ", "SY", "JO", "LB",
  "IL", "PS", "YE", "OM", "QA", "KW", "BH", "EG",
]);

const CONTINENT_TO_REGION: Record<string, RegionCode> = {
  AS: "AS",
  EU: "EU",
  AF: "AF",
  NA: "NA",
  SA: "SA",
  OC: "OC",
};

function resolveRegion(code: string, continentCode: string | undefined): RegionCode {
  if (code && MIDDLE_EAST.has(code)) return "ME";
  if (continentCode && CONTINENT_TO_REGION[continentCode]) {
    return CONTINENT_TO_REGION[continentCode];
  }
  return "AS";
}

// Reader.get is synchronous, but opening the db is async. Callers should
// `await warmGeoip()` once (e.g. in the /api/state handler) so the reader is
// ready before the synchronous geoLookup() calls. Until then, geoLookup returns
// null and kicks off the load in the background.
let cachedReader: Reader<CityResponse> | null = null;

export async function warmGeoip(): Promise<void> {
  cachedReader = await getReader();
}

export function geoLookup(ip: string): GeoInfo | null {
  if (!cachedReader) {
    // Kick off (or continue) lazy load for subsequent calls.
    void getReader().then((r) => {
      cachedReader = r;
    });
    return null;
  }
  try {
    const res = cachedReader.get(ip);
    if (!res) return null;
    const code = res.country?.iso_code || "";
    const country = res.country?.names?.en || "";
    const city = res.city?.names?.en || "";
    const region = resolveRegion(code, res.continent?.code);
    return { code, country, city, region };
  } catch (err) {
    warnOnce("[geoip] lookup failed", err);
    return null;
  }
}
