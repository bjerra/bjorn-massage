#!/usr/bin/env node
/**
 * Refresh src/data/services.json from Björn's public Bokadirekt listing.
 *
 * One request per run: the Neoskin place page. There is no public API; the
 * server-rendered HTML contains window.__PRELOADED_STATE__.
 *
 * If the request fails, times out, or the page no longer has Björn's services,
 * the committed snapshot is left as-is so a build can continue.
 *
 *   node tools/bokadirekt/fetch-services.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const PLACE_URL = 'https://www.bokadirekt.se/places/neoskin-39252';
const EMPLOYEE_ID = '315850';
const TIMEOUT_MS = 10_000;
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const OUT_FILE = path.join(ROOT, 'src/data/services.json');

const BROWSER_UA =
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

/** Read one JSON value starting at `from` (whitespace allowed) and return { value, end }. */
export function parseJsonValue(text, from) {
    let i = from;
    while (i < text.length && /\s/.test(text[i])) i++;
    const opener = text[i];
    if (opener !== '{' && opener !== '[') {
        throw new Error('Preloaded state was not a JSON object.');
    }
    let depth = 0;
    let inString = false;
    let escape = false;
    for (let j = i; j < text.length; j++) {
        const c = text[j];
        if (inString) {
            if (escape) escape = false;
            else if (c === '\\') escape = true;
            else if (c === '"') inString = false;
            continue;
        }
        if (c === '"') inString = true;
        else if (c === '{' || c === '[') depth++;
        else if (c === '}' || c === ']') {
            depth--;
            if (depth === 0) {
                const slice = text.slice(i, j + 1);
                return JSON.parse(slice);
            }
        }
    }
    throw new Error('Preloaded state JSON was truncated.');
}

function summarize(description) {
    const text = String(description || '')
        .replace(/\s+/g, ' ')
        .trim();
    if (text.length <= 280) return text;
    const sentences = text.split(/(?<=[.!?])\s+/);
    let out = '';
    for (const sentence of sentences) {
        const next = out ? `${out} ${sentence}` : sentence;
        if (next.length > 280 && out) return out;
        out = next;
    }
    if (out.length <= 280) return out;
    const cut = out.slice(0, 277);
    const lastSpace = cut.lastIndexOf(' ');
    return `${(lastSpace > 140 ? cut.slice(0, lastSpace) : cut).trim()}…`;
}

/**
 * Björn's active services, in Bokadirekt category order.
 * Services listed on the employee but missing from the catalog are skipped.
 */
export function servicesFromState(state) {
    const employees = state?.employees?.all;
    const catalog = state?.services?.all;
    const categories = state?.serviceCategories?.all;
    if (!employees || !catalog || !categories) {
        throw new Error('Preloaded state is missing employees, services, or categories.');
    }
    const employee = employees[EMPLOYEE_ID] ?? employees[Number(EMPLOYEE_ID)];
    if (!employee?.about || !Array.isArray(employee.services)) {
        throw new Error(`Employee ${EMPLOYEE_ID} was not found.`);
    }
    const name = String(employee.about.name || '');
    if (!name.includes('Björn')) {
        throw new Error(`Employee ${EMPLOYEE_ID} is named "${name}", not Björn.`);
    }
    if (employee.services.length === 0) {
        throw new Error(`Employee ${EMPLOYEE_ID} has no services.`);
    }

    const place = state.ssrPlace ?? Object.values(state.place ?? {})[0];
    const placeId = place?.id ?? 39252;
    const placeSlug = `${place?.about?.slug || 'neoskin'}-${placeId}`;
    const wanted = new Set(employee.services.map((id) => String(id)));
    const ordered = [];
    const seen = new Set();

    const categoryList = Object.values(categories)
        .filter((category) => category && category.active !== false && Array.isArray(category.services))
        .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

    for (const category of categoryList) {
        for (const serviceId of category.services) {
            const key = String(serviceId);
            if (!wanted.has(key) || seen.has(key)) continue;
            seen.add(key);
            ordered.push({ id: key, category: category.name || '' });
        }
    }
    for (const serviceId of employee.services) {
        const key = String(serviceId);
        if (seen.has(key)) continue;
        seen.add(key);
        ordered.push({ id: key, category: '' });
    }

    const services = [];
    for (const { id, category } of ordered) {
        const service = catalog[id];
        if (!service) {
            console.warn(`[bokadirekt] Skipping service ${id}: listed for Björn but missing from the catalog.`);
            continue;
        }
        if (service.extra?.inactive) {
            console.warn(`[bokadirekt] Skipping service ${id}: inactive.`);
            continue;
        }
        const slug = service.about?.slug;
        const settings = service.about?.settings ?? {};
        const bookingUrl = slug
            ? `https://www.bokadirekt.se/boka-tjanst/${placeSlug}/${slug}-${service.id}`
            : `https://www.bokadirekt.se/places/${placeSlug}`;
        const description = String(service.about?.description || '').trim();
        services.push({
            id: service.id,
            name: service.name,
            price: service.price,
            priceLabel: service.priceLabel || '',
            durationSeconds: service.duration,
            durationLabel: service.durationLabel || '',
            description,
            summary: summarize(description),
            slug: slug || '',
            showFrom: Boolean(settings.showFrom),
            hidePrice: Boolean(settings.hidePrice),
            hideDuration: Boolean(settings.hideDuration),
            category,
            bookingUrl
        });
    }

    if (services.length === 0) {
        throw new Error(`No active services found for ${name}.`);
    }

    return {
        source: PLACE_URL,
        fetchedAt: new Date().toISOString(),
        placeId,
        placeSlug,
        employeeId: Number(EMPLOYEE_ID),
        employeeName: name,
        services
    };
}

export function servicesFromHtml(html) {
    const marker = 'window.__PRELOADED_STATE__ =';
    const at = html.indexOf(marker);
    if (at < 0) throw new Error('Could not find window.__PRELOADED_STATE__ on the place page.');
    return servicesFromState(parseJsonValue(html, at + marker.length));
}

function sameServices(previousText, nextData) {
    if (!previousText) return false;
    try {
        const previous = JSON.parse(previousText);
        return JSON.stringify(previous.services) === JSON.stringify(nextData.services);
    } catch {
        return false;
    }
}

async function fetchPlaceHtml(fetchImpl, timeoutMs) {
    const response = await fetchImpl(PLACE_URL, {
        signal: AbortSignal.timeout(timeoutMs),
        headers: {
            Accept: 'text/html,application/xhtml+xml',
            'Accept-Language': 'sv-SE,sv;q=0.9,en;q=0.8',
            'User-Agent': BROWSER_UA
        }
    });
    if (!response.ok) throw new Error(`Bokadirekt responded HTTP ${response.status}`);
    return response.text();
}

/**
 * Fetch Björn's services and write them when they differ from the snapshot.
 * Never throws. Returns the fresh data, or null when the snapshot should be used.
 */
export async function refreshServices({ fetchImpl = fetch, timeoutMs = TIMEOUT_MS, file = OUT_FILE } = {}) {
    try {
        const html = await fetchPlaceHtml(fetchImpl, timeoutMs);
        const data = servicesFromHtml(html);
        const previous = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '';
        if (sameServices(previous, data)) {
            console.log(`[bokadirekt] ${data.services.length} services unchanged. Using src/data/services.json.`);
            return data;
        }
        fs.mkdirSync(path.dirname(file), { recursive: true });
        fs.writeFileSync(file, `${JSON.stringify(data, null, 2)}\n`);
        console.log(`[bokadirekt] Wrote src/data/services.json (${data.services.length} services).`);
        return data;
    } catch (error) {
        const timedOut = error?.name === 'TimeoutError' || error?.name === 'AbortError';
        const reason = timedOut ? `timed out after ${timeoutMs / 1000}s` : error?.message || String(error);
        console.warn(
            `[bokadirekt] Could not refresh services from Bokadirekt (${reason}). Using the committed snapshot src/data/services.json so the build can continue.`
        );
        if (!fs.existsSync(file)) {
            console.warn('[bokadirekt] The snapshot file is also missing, so the services list cannot be rendered.');
        }
        return null;
    }
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
    await refreshServices();
}
