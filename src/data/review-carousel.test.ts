import assert from 'node:assert/strict';
import test from 'node:test';
import { nextIndex, shouldAutoAdvance, swipeDirection, type AutoAdvanceState } from './review-carousel.ts';

const idle: AutoAdvanceState = {
    count: 8,
    reducedMotion: false,
    hovered: false,
    focused: false,
    hidden: false,
    touching: false
};

test('next index wraps in both directions', () => {
    assert.equal(nextIndex(0, 8, 1), 1);
    assert.equal(nextIndex(7, 8, 1), 0);
    assert.equal(nextIndex(0, 8, -1), 7);
});

test('auto-advance pauses for hover, focus, a hidden tab, touch, and reduced motion', () => {
    assert.equal(shouldAutoAdvance(idle), true);
    assert.equal(shouldAutoAdvance({ ...idle, count: 1 }), false);
    assert.equal(shouldAutoAdvance({ ...idle, hovered: true }), false);
    assert.equal(shouldAutoAdvance({ ...idle, focused: true }), false);
    assert.equal(shouldAutoAdvance({ ...idle, hidden: true }), false);
    assert.equal(shouldAutoAdvance({ ...idle, touching: true }), false);
    assert.equal(shouldAutoAdvance({ ...idle, reducedMotion: true }), false);
});

test('swipe ignores short and vertical moves', () => {
    assert.equal(swipeDirection(-80, 10), 1);
    assert.equal(swipeDirection(80, 10), -1);
    assert.equal(swipeDirection(-20, 0), 0);
    assert.equal(swipeDirection(-80, 90), 0);
});
