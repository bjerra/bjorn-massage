/** Hash key for the open muscle modal. Distinct from the map's `#muscle=` selection. */
export const MODAL_HASH_KEY = 'muskel';

export function readModalMuscle(hash: string): string {
    const params = new URLSearchParams((hash || '').replace(/^#/, ''));
    return params.get(MODAL_HASH_KEY) || '';
}

export function hashWithModal(hash: string, id: string | null): string {
    const params = new URLSearchParams((hash || '').replace(/^#/, ''));
    if (id) params.set(MODAL_HASH_KEY, id);
    else params.delete(MODAL_HASH_KEY);
    const next = params.toString();
    return next ? `#${next}` : '';
}
