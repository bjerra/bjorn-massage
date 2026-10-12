import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { LIST_URL, nextPageUrl, refreshReviews, reviewsFromItems } from './fetch-reviews.mjs';

const pageOne = `${LIST_URL}`;
const pageTwo = new URL(LIST_URL);
pageTwo.searchParams.set('page', '2');

function review(overrides) {
    return {
        review: { score: 5, text: 'Bra' },
        createdAt: '2026-01-02T00:00:00.000Z',
        author: { name: 'Sara R.' },
        subject: { employee: { id: 315850 } },
        ...overrides
    };
}

test('nextPage accepts a page number, a relative URL, and an empty end', () => {
    assert.equal(nextPageUrl(pageOne, { nextPage: 2 }), pageTwo.toString());
    assert.equal(nextPageUrl(pageOne, { nextPage: '/api/reviews/v2/list?page=2' }), 'https://www.bokadirekt.se/api/reviews/v2/list?page=2');
    assert.equal(nextPageUrl(pageOne, {}), null);
    assert.equal(nextPageUrl(pageOne, { nextPage: null }), null);
});

test('keeps only employee 315850 and stores the requested fields', () => {
    const reviews = reviewsFromItems([
        review({ review: { score: 5, text: '  Hej  ' }, author: { name: ' Sara  Andersson ' }, createdAt: '2026-03-01T10:00:00.000Z' }),
        review({
            review: { score: 4, text: 'Annan' },
            subject: { employee: { id: 999 } },
            author: { name: 'Nils N.' }
        }),
        review({
            review: { score: 5, text: '' },
            createdAt: '2026-04-01T10:00:00.000Z',
            author: { name: 'Daniel A.' }
        }),
        { review: { score: 5 }, createdAt: '2026-05-01T10:00:00.000Z', author: { name: 'Okänd' } }
    ]);
    assert.deepEqual(
        reviews.map((item) => item.author.name),
        ['Daniel A.', 'Sara Andersson']
    );
    assert.equal(reviews[1].review.text, 'Hej');
    assert.equal(reviews[1].createdAt, '2026-03-01T10:00:00.000Z');
    assert.equal(reviews[1].review.score, 5);
    assert.equal(reviews[0].review.text, '');
});

test('a failed fetch keeps the snapshot and does not throw', async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'reviews-'));
    const file = path.join(dir, 'reviews.json');
    const previous = {
        reviews: [review({ review: { score: 5, text: 'kvar' } })]
    };
    fs.writeFileSync(file, JSON.stringify(previous));
    const result = await refreshReviews({
        file,
        fetchImpl: async () => {
            throw new Error('HTTP 502');
        }
    });
    assert.equal(result, null);
    assert.equal(JSON.parse(fs.readFileSync(file, 'utf8')).reviews[0].review.text, 'kvar');
});

test('bad JSON keeps the snapshot', async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'reviews-'));
    const file = path.join(dir, 'reviews.json');
    fs.writeFileSync(file, '{"reviews":[{"review":{"score":5,"text":"kvar"},"createdAt":"2026-01-01T00:00:00.000Z","author":{"name":"Sara R."}}]}');
    const result = await refreshReviews({
        file,
        fetchImpl: async () => ({
            ok: true,
            json: async () => ({ nope: true })
        })
    });
    assert.equal(result, null);
    assert.match(fs.readFileSync(file, 'utf8'), /kvar/);
});

test('follows nextPage and writes a snapshot', async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'reviews-'));
    const file = path.join(dir, 'reviews.json');
    const pages = new Map([
        [
            pageOne,
            {
                items: [review({ review: { score: 5, text: 'Ett' }, createdAt: '2026-01-01T00:00:00.000Z' })],
                nextPage: 2
            }
        ],
        [
            pageTwo.toString(),
            {
                items: [
                    review({
                        review: { score: 4, text: 'Två' },
                        createdAt: '2026-02-01T00:00:00.000Z',
                        author: { name: 'Mia M.' }
                    })
                ]
            }
        ]
    ]);
    const result = await refreshReviews({
        file,
        fetchImpl: async (url, init) => {
            assert.equal(init.headers['User-Agent'].includes('Chrome'), true);
            const payload = pages.get(url);
            assert.ok(payload, url);
            return { ok: true, json: async () => payload };
        }
    });
    assert.equal(result.reviews.length, 2);
    assert.equal(result.reviews[0].review.text, 'Två');
    const written = JSON.parse(fs.readFileSync(file, 'utf8'));
    assert.equal(written.employeeId, 315850);
    assert.equal(written.reviews[1].author.name, 'Sara R.');
});
