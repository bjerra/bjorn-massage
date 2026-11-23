import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { muscleFacts, buildCatalog, type MovementFile } from './rom-catalog.ts';
import { hashWithModal, readModalMuscle } from './muscle-modal-url.ts';

const data = JSON.parse(
    readFileSync(new URL('../../public/movements/data.json', import.meta.url), 'utf8')
) as MovementFile;
const catalog = buildCatalog(data);

test('the modal hash can sit beside the map selection and Back can remove only the modal', () => {
    const open = hashWithModal('#muscle=trapezius_desc', 'trapezius_desc');
    assert.equal(readModalMuscle(open), 'trapezius_desc');
    assert.equal(new URLSearchParams(open.slice(1)).get('muscle'), 'trapezius_desc');
    const closed = hashWithModal(open, null);
    assert.equal(readModalMuscle(closed), '');
    assert.equal(new URLSearchParams(closed.slice(1)).get('muscle'), 'trapezius_desc');
});

test('muscle facts use functions that exist and skip ursprung and fäste when the data has none', () => {
    const facts = muscleFacts(catalog, 'deltoideus');
    assert.equal(facts.latin, 'Deltoideus');
    assert.equal(facts.common, 'Deltamuskeln');
    assert.equal(facts.origin, '');
    assert.equal(facts.insertion, '');
    assert.ok(facts.functions.some((line) => line.includes('Abduktion') && line.includes('arm ut åt sidan')));
    assert.ok(facts.description.includes('Område'));
});
