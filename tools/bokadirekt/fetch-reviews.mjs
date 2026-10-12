#!/usr/bin/env node
/**
 * Refresh src/data/reviews.json from Björn's public Bokadirekt reviews.
 *
 * Pages through the list when `nextPage` is present. Only reviews for
 * employee 315850 are kept.
 *
 * If the request fails, times out, or the payload is unusable, the committed
 * snapshot is left as-is so a build can continue.
 *
 *   node tools/bokadirekt/fetch-reviews.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const LIST_URL =
    'https://www.bokadirekt.se/api/reviews/v2/list?placeId=39252&employeeId=315850&page=1&limit=100';
export const EMPLOYEE_ID = 315850;
export const PLACE_ID = 39252;
const TIMEOUT_MS = 10_000;
const MAX_PAGES = 20;
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const OUT_FILE = path.join(ROOT, 'src/data/reviews.json');

const BROWSER_UA =
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

/** Next page URL, or null when the list is finished. Throws on an unusable value. */
export function nextPageUrl(currentUrl, payload) {
    const next = payload?.nextPage;
    if (next == null || next === false || next === '') return null;
    if (typeof next === 'number') {
        if (!Number.isInteger(next) || next < 1) {
            throw new Error('nextPage was not a usable page number.');
        }
        const url = new URL(currentUrl);
        url.searchParams.set('page', String(next));
        return url.toString();
    }
    if (typeof next === 'string') {
        const trimmed = next.trim();
        if (!trimmed) return null;
        if (/^\d+$/.test(trimmed)) {
            const url = new URL(currentUrl);
            url.searchParams.set('page', trimmed);
            return url.toString();
        }
        try {
            return new URL(trimmed, currentUrl).toString();
        } catch {
            throw new Error('nextPage was not a usable URL.');
        }
    }
    throw new Error('nextPage had an unexpected shape.');
}

function reviewScore(review) {
    const score = review?.score;
    if (typeof score !== 'number' || !Number.isFinite(score) || score < 0 || score > 5) return null;
    return score;
}

function reviewText(review) {
    if (review?.text == null) return '';
    if (typeof review.text !== 'string') return null;
    return review.text.replace(/\r\n/g, '\n').trim();
}

function reviewCreatedAt(value) {
    if (typeof value !== 'string' || !value.trim()) return null;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return null;
    return date.toISOString();
}

function authorName(author) {
    const name = author?.name;
    if (typeof name !== 'string') return null;
    const trimmed = name.trim().replace(/\s+/g, ' ');
    return trimmed || null;
}

/**
 * Keep reviews whose subject.employee.id is exactly 315850.
 * A review for Björn with a missing score, date, or name is skipped.
 */
export function reviewsFromItems(items) {
    if (!Array.isArray(items)) throw new Error('Reviews response did not include an items array.');
    const reviews = [];
    const seen = new Set();
    let skipped = 0;
    for (const item of items) {
        if (!item || typeof item !== 'object') {
            throw new Error('A review item was not an object.');
        }
        if (item.subject?.employee?.id !== EMPLOYEE_ID) continue;
        const score = reviewScore(item.review);
        const text = reviewText(item.review);
        const createdAt = reviewCreatedAt(item.createdAt);
        const name = authorName(item.author);
        if (score == null || text == null || !createdAt || !name) {
            skipped += 1;
            continue;
        }
        const review = {
            review: { score, text },
            createdAt,
            author: { name }
        };
        const key = JSON.stringify(review);
        if (seen.has(key)) continue;
        seen.add(key);
        reviews.push(review);
    }
    if (skipped > 0) {
        console.warn(
            `[bokadirekt] Skipped ${skipped} review${skipped === 1 ? '' : 's'} for employee ${EMPLOYEE_ID} with a missing score, date, or author.`
        );
    }
    const bjornItems = items.filter((item) => item?.subject?.employee?.id === EMPLOYEE_ID).length;
    if (bjornItems > 0 && reviews.length === 0) {
        throw new Error(`Reviews for employee ${EMPLOYEE_ID} were missing score, date, or author.`);
    }
    reviews.sort((a, b) => {
        const time = Date.parse(b.createdAt) - Date.parse(a.createdAt);
        if (time !== 0) return time;
        return a.author.name.localeCompare(b.author.name, 'sv');
    });
    return reviews;
}

function snapshotFromReviews(reviews) {
    return {
        source: LIST_URL,
        fetchedAt: new Date().toISOString(),
        placeId: PLACE_ID,
        employeeId: EMPLOYEE_ID,
        reviews
    };
}

function sameReviews(previousText, nextData) {
    if (!previousText) return false;
    try {
        const previous = JSON.parse(previousText);
        return JSON.stringify(previous.reviews) === JSON.stringify(nextData.reviews);
    } catch {
        return false;
    }
}

async function fetchReviewPages(fetchImpl, timeoutMs) {
    const seen = new Set();
    const items = [];
    let url = LIST_URL;
    while (url) {
        if (seen.has(url)) throw new Error('Reviews pagination repeated a page.');
        if (seen.size >= MAX_PAGES) throw new Error(`Reviews pagination exceeded ${MAX_PAGES} pages.`);
        seen.add(url);
        const response = await fetchImpl(url, {
            signal: AbortSignal.timeout(timeoutMs),
            headers: {
                Accept: 'application/json',
                'Accept-Language': 'sv-SE,sv;q=0.9,en;q=0.8',
                'User-Agent': BROWSER_UA
            }
        });
        if (!response.ok) throw new Error(`Bokadirekt responded HTTP ${response.status}`);
        let payload;
        try {
            payload = await response.json();
        } catch {
            throw new Error('Bokadirekt reviews response was not JSON.');
        }
        if (!payload || typeof payload !== 'object' || !Array.isArray(payload.items)) {
            throw new Error('Reviews response did not include an items array.');
        }
        items.push(...payload.items);
        url = nextPageUrl(url, payload);
    }
    return items;
}

/**
 * Fetch Björn's reviews and write them when they differ from the snapshot.
 * Never throws. Returns the fresh data, or null when the snapshot should be used.
 */
export async function refreshReviews({ fetchImpl = fetch, timeoutMs = TIMEOUT_MS, file = OUT_FILE } = {}) {
    try {
        const items = await fetchReviewPages(fetchImpl, timeoutMs);
        const reviews = reviewsFromItems(items);
        const data = snapshotFromReviews(reviews);
        const previous = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '';
        if (sameReviews(previous, data)) {
            console.log(`[bokadirekt] ${data.reviews.length} reviews unchanged. Using src/data/reviews.json.`);
            return data;
        }
        fs.mkdirSync(path.dirname(file), { recursive: true });
        fs.writeFileSync(file, `${JSON.stringify(data, null, 2)}\n`);
        console.log(`[bokadirekt] Wrote src/data/reviews.json (${data.reviews.length} reviews).`);
        return data;
    } catch (error) {
        const timedOut = error?.name === 'TimeoutError' || error?.name === 'AbortError';
        const reason = timedOut ? `timed out after ${timeoutMs / 1000}s` : error?.message || String(error);
        console.warn(
            `[bokadirekt] Could not refresh reviews from Bokadirekt (${reason}). Using the committed snapshot src/data/reviews.json so the build can continue.`
        );
        if (!fs.existsSync(file)) {
            console.warn('[bokadirekt] The reviews snapshot is also missing, so the reviews section cannot be rendered.');
        }
        return null;
    }
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
    await refreshReviews();
}
