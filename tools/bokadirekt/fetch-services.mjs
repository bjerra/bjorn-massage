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

const SWEDISH_MONTHS = ['jan', 'feb', 'mar', 'apr', 'maj', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'dec'];

/** Round half up, including x.5, for positive and negative amounts. */
export function roundHalfUp(value) {
    if (!Number.isFinite(value)) return null;
    const sign = value < 0 ? -1 : 1;
    return sign * Math.floor(Math.abs(value) + 0.5);
}

function formatSek(amount) {
    const grouped = new Intl.NumberFormat('sv-SE', { maximumFractionDigits: 0 })
        .format(amount)
        .replace(/\u202f/g, '\u00a0');
    return `${grouped}\u00a0kr`;
}

/**
 * Sale price: discountPrice when Bokadirekt set one, otherwise
 * round-half-up(price * (1 - discountPercent/100)).
 */
export function campaignPrice(price, offer) {
    if (offer?.discountPrice != null && offer.discountPrice !== '') {
        const discount = Number(offer.discountPrice);
        if (Number.isFinite(discount)) return roundHalfUp(discount);
    }
    const percent = Number(offer?.discountPercent);
    if (!Number.isFinite(price) || !Number.isFinite(percent)) return null;
    return roundHalfUp((price * (100 - percent)) / 100);
}

/** Bokadirekt's "till 25 okt": the end instant's calendar date in Stockholm. */
export function campaignEndLabel(endUnix) {
    const parts = new Intl.DateTimeFormat('sv-SE', {
        timeZone: 'Europe/Stockholm',
        day: 'numeric',
        month: 'numeric'
    }).formatToParts(new Date(endUnix * 1000));
    const day = parts.find((part) => part.type === 'day')?.value;
    const month = Number(parts.find((part) => part.type === 'month')?.value);
    if (!day || !SWEDISH_MONTHS[month - 1]) return '';
    return `till ${day} ${SWEDISH_MONTHS[month - 1]}`;
}

function campaignsForPlace(state, placeId) {
    const key = String(placeId);
    const fromPlace = state.place?.[key]?.campaigns ?? state.place?.[Number(key)]?.campaigns;
    const fromSsr = state.ssrPlace?.campaigns;
    const merged = new Map();
    for (const list of [fromPlace, fromSsr]) {
        if (!Array.isArray(list)) continue;
        for (const campaign of list) {
            if (!campaign || campaign.id == null) continue;
            const id = String(campaign.id);
            if (!merged.has(id)) merged.set(id, campaign);
        }
    }
    return [...merged.values()];
}

function campaignIsActive(campaign, nowSec) {
    if (Number(campaign?.status) !== 1) return false;
    const start = Number(campaign.startDate);
    const end = Number(campaign.endDate);
    if (!Number.isFinite(start) || !Number.isFinite(end)) return false;
    return nowSec >= start && nowSec < end;
}

function normalizeSpace(value) {
    return String(value || '')
        .replace(/\u00a0/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

/** "Kampanjpris till 25 okt" printed next to a service name in the place HTML. */
function pageCampaignPhrase(html, serviceName, serviceNames) {
    let from = 0;
    while (from < html.length) {
        const at = html.indexOf(serviceName, from);
        if (at < 0) return null;
        const slice = html.slice(at + serviceName.length, at + serviceName.length + 700);
        const match = slice.match(/Kampanjpris till\s+([^<]+)/);
        if (match) {
            const before = slice.slice(0, match.index);
            const blocked = serviceNames.some((name) => name !== serviceName && before.includes(name));
            if (!blocked) return normalizeSpace(`Kampanjpris till ${match[1]}`);
        }
        from = at + serviceName.length;
    }
    return null;
}

function applyPageCampaignLabels(html, data) {
    const names = data.services.map((service) => service.name);
    for (const service of data.services) {
        if (!service.campaign) continue;
        const expected = `Kampanjpris ${service.campaign.endLabel}`;
        const page = pageCampaignPhrase(html, service.name, names);
        if (!page) {
            console.warn(
                `[bokadirekt] No "Kampanjpris till ..." text for ${service.name}. Using the computed label "${service.campaign.endLabel}".`
            );
            continue;
        }
        if (normalizeSpace(page) !== normalizeSpace(expected)) {
            console.warn(
                `[bokadirekt] Campaign label for ${service.name} computed as "${expected}" but the page says "${page}". Using the page text.`
            );
            service.campaign.endLabel = normalizeSpace(page).replace(/^Kampanjpris\s+/i, '');
        }
    }
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
export function servicesFromState(state, nowMs = Date.now()) {
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

    const nowSec = nowMs / 1000;
    const offersByService = new Map();
    for (const campaign of campaignsForPlace(state, placeId)) {
        if (!campaignIsActive(campaign, nowSec)) continue;
        for (const offer of campaign.services || []) {
            const key = String(offer?.id ?? '');
            if (!wanted.has(key)) continue;
            const list = offersByService.get(key) ?? [];
            list.push({ campaign, offer });
            offersByService.set(key, list);
        }
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
        const campaign = settings.hidePrice ? null : activeCampaignFor(service, offersByService.get(id));
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
            bookingUrl,
            campaign
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

function activeCampaignFor(service, offers) {
    if (!offers?.length) return null;
    let best = null;
    for (const { campaign, offer } of offers) {
        const price = campaignPrice(service.price, offer);
        const endLabel = campaignEndLabel(Number(campaign.endDate));
        if (price == null || !endLabel) {
            console.warn(`[bokadirekt] Skipping campaign ${campaign.id} on ${service.name}: no sale price or end date.`);
            continue;
        }
        if (best && price > best.price) continue;
        best = {
            id: campaign.id,
            name: campaign.name || '',
            startDate: Number(campaign.startDate),
            endDate: Number(campaign.endDate),
            price,
            priceLabel: formatSek(price),
            endLabel
        };
    }
    if (best) {
        console.log(
            `[bokadirekt] ${service.name}: ${service.priceLabel || service.price} → ${best.priceLabel} (Kampanj ${best.endLabel}).`
        );
    }
    return best;
}

export function servicesFromHtml(html, nowMs = Date.now()) {
    const marker = 'window.__PRELOADED_STATE__ =';
    const at = html.indexOf(marker);
    if (at < 0) throw new Error('Could not find window.__PRELOADED_STATE__ on the place page.');
    const data = servicesFromState(parseJsonValue(html, at + marker.length), nowMs);
    applyPageCampaignLabels(html, data);
    return data;
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
