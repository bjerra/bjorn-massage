import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { attachRomAnalysis, compareMeasurements, registerRomAnalysis } from './rom-analysis.ts';
import { buildCatalog, movementByQuery, movementBySource, searchMovements, type MovementFile } from './rom-catalog.ts';

const data = JSON.parse(
    readFileSync(new URL('../../public/movements/data.json', import.meta.url), 'utf8')
) as MovementFile;
const catalog = buildCatalog(data);

test('every movement has a unique shareable address and a plain gloss', () => {
    const seen = new Set<string>();
    for (const movement of catalog.movements) {
        const key = `${movement.groupId}/${movement.slug}`;
        assert.equal(seen.has(key), false, key);
        seen.add(key);
        assert.ok(movement.gloss.length > 0, key);
        assert.equal(movementByQuery(catalog, movement.groupId, movement.slug)?.movementId, movement.movementId);
    }
});

test('the rail is the eight joints, top to bottom, and the jaw stays searchable', () => {
    assert.deepEqual(
        catalog.rail.map((group) => group.id),
        ['nacke', 'axel', 'armbage', 'bal', 'handled', 'hoft', 'kna', 'fotled']
    );
    const anchors = catalog.rail.map((group) => group.anchor);
    assert.deepEqual(anchors, [...anchors].sort((a, b) => a - b));
    assert.equal(catalog.groups.some((group) => group.id === 'kake' && !group.rail), true);
    assert.equal(movementBySource(catalog, 'Mandible', 'Depression')?.gloss, 'öppna munnen');
});

test('shoulder abduction is the everyday phrase for lifting the arm out to the side', () => {
    const hit = movementBySource(catalog, 'Shoulder', 'Abduction');
    assert.equal(hit?.gloss, 'arm ut åt sidan');
    assert.equal(hit?.groupId, 'axel');
    const found = searchMovements(catalog, 'lyfta armen');
    assert.equal(found[0]?.source, 'Shoulder');
    assert.equal(found[0]?.movementId, 'Abduction');
    assert.ok(found.some((movement) => movement.movementId === 'Flexion' && movement.source === 'Shoulder'));
});

test('bål keeps bröstrygg and ländrygg flexion as separate links', () => {
    const thoracic = movementBySource(catalog, 'Thoracic', 'Flexion');
    const lumbar = movementBySource(catalog, 'Lumbar', 'Flexion');
    assert.ok(thoracic && lumbar);
    assert.notEqual(thoracic.slug, lumbar.slug);
    assert.equal(thoracic.groupId, 'bal');
    assert.equal(lumbar.groupId, 'bal');
});

test('analysis compares nothing until reference ranges exist', () => {
    const result = compareMeasurements([{ jointId: 'Shoulder', movementId: 'Abduction', degrees: 90 }]);
    assert.deepEqual(result, [
        { jointId: 'Shoulder', movementId: 'Abduction', degrees: 90, range: null, status: 'unknown' }
    ]);
});

test('the analysis slot stays hidden until a later feature registers a renderer', () => {
    const host = {
        hidden: false,
        dataset: {} as DOMStringMap,
        replaceChildren() {
            this.hidden = false;
        }
    } as unknown as HTMLElement;
    attachRomAnalysis(host, { jointId: 'Shoulder', movementId: 'Abduction', measurements: [] });
    assert.equal(host.hidden, true);
    registerRomAnalysis(() => {
        host.dataset.ready = 'yes';
    });
    attachRomAnalysis(host, { jointId: 'Shoulder', movementId: 'Abduction', measurements: [] });
    assert.equal(host.hidden, false);
    assert.equal(host.dataset.ready, 'yes');
    registerRomAnalysis(null);
});
