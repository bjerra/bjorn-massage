import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { ATTACHMENT_SOURCES } from './muscle-attachment-sources.ts';
import { MUSCLE_ATTACHMENTS } from './muscle-attachments.ts';
import { buildCatalog, muscleFacts, type MovementFile } from './rom-catalog.ts';

const data = JSON.parse(
    readFileSync(new URL('../../public/movements/data.json', import.meta.url), 'utf8')
) as MovementFile;
const catalog = buildCatalog(data);
const exercises = JSON.parse(
    readFileSync(new URL('../../public/exercises/index.json', import.meta.url), 'utf8')
) as { exercises: Array<{ muscleIds?: string[] }> };

function selectableIds(): string[] {
    const ids = new Set<string>();
    for (const muscle of data.muscles) {
        if (!muscle.noSvg) ids.add(muscle.id);
    }
    const listed = new Set<string>();
    for (const joint of Object.values(data.movements)) {
        for (const movement of Object.values(joint)) {
            for (const id of [...(movement.primeMovers || []), ...(movement.synergists || [])]) listed.add(id);
        }
    }
    for (const exercise of exercises.exercises) {
        for (const id of exercise.muscleIds || []) listed.add(id);
    }
    for (const id of listed) {
        if (catalog.musclesById.get(id)?.noSvg) ids.add(id);
    }
    return [...ids].sort();
}

test('every selectable muscle has ursprung, fäste and a source note', () => {
    const ids = selectableIds();
    assert.ok(ids.length >= 60, `expected the drawn muscles plus the off-figure list, got ${ids.length}`);
    assert.equal(ids.includes('transversus_abdominis'), false);
    assert.equal(ids.includes('hamstrings'), true);
    assert.equal(ids.includes('brachialis'), true);
    for (const id of ids) {
        const facts = muscleFacts(catalog, id);
        assert.ok(facts.origin.length > 0, `${id} origin`);
        assert.ok(facts.insertion.length > 0, `${id} insertion`);
        assert.equal(MUSCLE_ATTACHMENTS[id]?.origin, facts.origin, id);
        assert.ok((ATTACHMENT_SOURCES[id] || '').trim().length > 0, `${id} source`);
    }
});

test('attachment notes stay off the public text and cover every written muscle', () => {
    for (const [id, text] of Object.entries(MUSCLE_ATTACHMENTS)) {
        assert.ok(text.origin.endsWith('.'), id);
        assert.ok(text.insertion.endsWith('.'), id);
        assert.equal(text.origin.includes('bota'), false, id);
        assert.equal(text.insertion.includes('bota'), false, id);
        assert.ok((ATTACHMENT_SOURCES[id] || '').includes('Gray'), `${id} source`);
    }
    for (const id of Object.keys(ATTACHMENT_SOURCES)) {
        assert.ok(MUSCLE_ATTACHMENTS[id], `source without text: ${id}`);
    }
});
