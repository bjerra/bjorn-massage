/** How long each review stays before the card advances. */
export const REVIEW_ADVANCE_MS = 6000;

export interface AutoAdvanceState {
    count: number;
    reducedMotion: boolean;
    hovered: boolean;
    focused: boolean;
    hidden: boolean;
    touching: boolean;
}

export function nextIndex(current: number, count: number, step: number): number {
    if (count < 1) return 0;
    return (current + step + count * 8) % count;
}

/** Auto-advance only while the card is idle, visible, and motion is allowed. */
export function shouldAutoAdvance(state: AutoAdvanceState): boolean {
    return (
        state.count > 1 &&
        !state.reducedMotion &&
        !state.hovered &&
        !state.focused &&
        !state.hidden &&
        !state.touching
    );
}

/** Horizontal swipe. 1 is the next review, -1 the previous, 0 is not a swipe. */
export function swipeDirection(dx: number, dy: number, threshold = 48): -1 | 0 | 1 {
    if (Math.abs(dx) < threshold || Math.abs(dx) <= Math.abs(dy)) return 0;
    return dx < 0 ? 1 : -1;
}
