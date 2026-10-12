import assert from 'node:assert/strict';
import test from 'node:test';
import { publicReviewText, ratingSummary, reviewDate, reviewerName, visibleReviews, type GuestReview } from './reviews.ts';

function review(text: string, createdAt: string, name = 'Sara R.', score = 5): GuestReview {
    return { review: { score, text }, createdAt, author: { name } };
}

test('reviewer names keep the first name and a last initial', () => {
    assert.equal(reviewerName('Sara R.'), 'Sara R.');
    assert.equal(reviewerName('Sara Andersson'), 'Sara A.');
    assert.equal(reviewerName('malin L.'), 'malin L.');
    assert.equal(reviewerName('Johnvianney O.'), 'Johnvianney O.');
    assert.equal(reviewerName('Mary Ann Smith'), 'Mary S.');
});

test('dates use Swedish in Europe/Stockholm', () => {
    assert.equal(reviewDate('2026-10-11T06:01:34.000Z'), '11 oktober 2026');
    assert.equal(reviewDate('2026-01-15T23:30:00.000Z'), '16 januari 2026');
});

test('average counts every review and the list skips empty text', () => {
    const reviews = [
        review('', '2026-10-11T06:01:34.000Z', 'Daniel A.'),
        review('Hej', '2026-10-02T17:56:23.000Z', 'Sara Andersson'),
        review('   ', '2026-09-01T12:00:00.000Z', 'Lena S.'),
        review('Äldre', '2026-02-27T18:16:39.000Z', 'malin L.', 4)
    ];
    assert.equal(ratingSummary(reviews)?.label, '4,8 av 5 · 4 omdömen');
    const visible = visibleReviews(reviews);
    assert.deepEqual(
        visible.map((item) => item.authorName),
        ['Sara A.', 'malin L.']
    );
    assert.equal(visible[0].dateLabel, '2 oktober 2026');
});

test('one review uses the singular', () => {
    assert.equal(ratingSummary([review('Hej', '2026-01-01T00:00:00.000Z')])?.label, '5,0 av 5 · 1 omdöme');
});

test('public text drops phone numbers and email addresses', () => {
    assert.equal(publicReviewText('Mejla sara@example.com eller ring 070-123 45 67.'), 'Mejla eller ring.');
    assert.equal(publicReviewText('Bra massage'), 'Bra massage');
});
