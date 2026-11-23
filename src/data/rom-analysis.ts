/**
 * Seam for a later "ROM analysis" feature.
 *
 * The ROM page already knows which joint and movement are selected. A later
 * change can register a renderer that asks for a measured angle and compares
 * it with reference ranges. This module is the only place that comparison
 * should live. The page does not collect measurements and does not show a
 * result until a renderer is registered.
 */

export type RomMeasurement = {
    jointId: string;
    movementId: string;
    /** Degrees, as entered by the visitor. */
    degrees: number;
};

export type RomReferenceRange = {
    jointId: string;
    movementId: string;
    min: number;
    max: number;
    source?: string;
};

export type RomComparisonStatus = 'unknown' | 'inside' | 'outside';

export type RomComparison = {
    jointId: string;
    movementId: string;
    degrees: number;
    range: RomReferenceRange | null;
    status: RomComparisonStatus;
};

export type RomAnalysisContext = {
    jointId: string;
    movementId: string;
    measurements: RomMeasurement[];
};

export type RomAnalysisRenderer = (host: HTMLElement, context: RomAnalysisContext) => void;

/**
 * Empty on purpose. Filling this in is the later feature, not this page.
 */
export const referenceRanges: RomReferenceRange[] = [];

let renderer: RomAnalysisRenderer | null = null;

export function registerRomAnalysis(render: RomAnalysisRenderer | null): void {
    renderer = render;
}

export function compareMeasurements(measurements: RomMeasurement[]): RomComparison[] {
    return measurements.map((measurement) => {
        const range =
            referenceRanges.find(
                (item) => item.jointId === measurement.jointId && item.movementId === measurement.movementId
            ) ?? null;
        if (!range) {
            return { ...measurement, range: null, status: 'unknown' };
        }
        const inside = measurement.degrees >= range.min && measurement.degrees <= range.max;
        return { ...measurement, range, status: inside ? 'inside' : 'outside' };
    });
}

/**
 * Called by the ROM page whenever the selected movement changes.
 * With no renderer registered the host stays empty and hidden.
 */
export function attachRomAnalysis(host: HTMLElement | null, context: RomAnalysisContext): void {
    if (!host) return;
    host.replaceChildren();
    if (!renderer) {
        host.hidden = true;
        return;
    }
    host.hidden = false;
    renderer(host, context);
}
