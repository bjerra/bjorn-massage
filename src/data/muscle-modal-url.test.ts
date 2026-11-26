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

test('muscle facts use functions that exist and fill ursprung and fäste from the attachment list', () => {
    const facts = muscleFacts(catalog, 'deltoideus');
    assert.equal(facts.latin, 'Deltoideus');
    assert.equal(facts.common, 'Deltamuskeln');
    assert.match(facts.origin, /clavicula/i);
    assert.match(facts.insertion, /tuberositas deltoidea/i);
    assert.ok(facts.functions.some((line) => line.includes('Abduktion') && line.includes('arm ut åt sidan')));
    assert.ok(facts.description.includes('Område'));
    const unknown = muscleFacts(catalog, 'not_a_muscle');
    assert.equal(unknown.origin, '');
    assert.equal(unknown.insertion, '');
});
