import assert from 'node:assert/strict';
import test from 'node:test';
import {
    DISCLAIMER,
    EVIDENCE_LEGEND,
    INTRO,
    LEAD,
    MUSCLE_CARDS,
    PRIORITY_IDS,
    QUIZ_LENGTH,
    buildQuiz,
    cardCopy,
    evidenceLabel,
    feedbackText,
    findBanned,
    modeHelp,
    mulberry32,
    optionNames,
    practiceResult,
    questionKicker,
    questionPool,
    quizResult,
    scoreLine
} from './muskelspel.ts';

const PRIORITY_BITS: Record<(typeof PRIORITY_IDS)[number], string[]> = {
    trapezius_desc: ['tinning', 'vårtutskott'],
    levator_scapulae: ['nackvinkel', 'skulderblad'],
    suboccipitales: ['pannband', 'nackknöl'],
    scm_sternale: ['ögat', 'kind'],
    scm_claviculare: ['pannan', 'örat'],
    scaleni: ['tumme', 'pekfinger'],
    pectoralis_minor: ['lillfinger', 'insida'],
    ecrb_ecrl: ['armbågsutskott', 'underarm']
};

test('the eight priority muscles are present and named in Latin', () => {
    assert.deepEqual(
        MUSCLE_CARDS.filter((card) => card.priority).map((card) => card.id),
        [...PRIORITY_IDS]
    );
    for (const id of PRIORITY_IDS) {
        const card = MUSCLE_CARDS.find((item) => item.id === id);
        assert.ok(card, id);
        assert.equal(findBanned(card.latin), undefined, card.latin);
        assert.equal(findBanned(card.stretchLatin), undefined, card.stretchLatin);
        for (const bit of PRIORITY_BITS[id]) {
            assert.ok(
                `${card.referralPrompt} ${card.referral}`.toLowerCase().includes(bit),
                `${id} should mention ${bit}`
            );
        }
        for (const field of [card.referral, card.stretch, card.where, card.confuse, card.training, card.stretchPrompt]) {
            assert.ok(field.trim().length > 0, id);
        }
    }
});

test('public copy avoids causal claims and Swedish muscle names', () => {
    const texts = [
        DISCLAIMER,
        INTRO,
        ...EVIDENCE_LEGEND.flatMap((item) => [item.term, item.text]),
        ...Object.values(LEAD),
        modeHelp('quiz'),
        modeHelp('cards'),
        ...MUSCLE_CARDS.flatMap((card) => cardCopy(card))
    ];
    for (const text of texts) {
        assert.equal(findBanned(text), undefined, text);
    }
    assert.match(DISCLAIMER, /Inte medicinsk rådgivning/);
    assert.match(DISCLAIMER, /diagnos/);
    assert.match(DISCLAIMER, /112/);
});

test('SCM heads share one stretch and pec maps are not marked wrong against each other', () => {
    const heads = MUSCLE_CARDS.filter((card) => card.stretchId === 'scm');
    assert.equal(heads.length, 2);
    assert.equal(heads[0].stretchPrompt, heads[1].stretchPrompt);
    assert.equal(heads[0].stretch, heads[1].stretch);
    assert.equal(heads[0].stretchLatin, 'Sternocleidomastoideus');
    assert.notEqual(heads[0].referralPrompt, heads[1].referralPrompt);

    const minor = MUSCLE_CARDS.find((card) => card.id === 'pectoralis_minor');
    const major = MUSCLE_CARDS.find((card) => card.id === 'pectoralis_major');
    assert.ok(minor && major);
    assert.ok(minor.referralBlock.includes(major.latin));
    assert.ok(major.referralBlock.includes(minor.latin));
});

test('every card can be asked, and stretch questions are unique', () => {
    const pool = questionPool();
    assert.equal(new Set(pool.map((item) => item.id)).size, pool.length);
    const referrals = pool.filter((item) => item.kind === 'referral');
    const stretches = pool.filter((item) => item.kind === 'stretch');
    assert.deepEqual(
        referrals.map((item) => item.cardId),
        MUSCLE_CARDS.map((card) => card.id)
    );
    assert.equal(new Set(stretches.map((item) => item.prompt)).size, stretches.length);
    assert.ok(stretches.some((item) => item.id === 'str-scm'));
    for (const template of pool) {
        for (const correct of [true, false]) {
            const text = feedbackText(template, correct);
            assert.equal(findBanned(text), undefined, text);
            assert.ok(text.includes(template.answerLatin));
        }
    }
});

test('options keep the answer, drop blocked neighbours, and stay inside the deck', () => {
    const known = new Set(MUSCLE_CARDS.flatMap((card) => [card.latin, card.stretchLatin]));
    const minor = questionPool().find((item) => item.id === 'ref-pectoralis_minor');
    const scm = questionPool().find((item) => item.id === 'str-scm');
    assert.ok(minor && scm);
    for (let seed = 1; seed <= 24; seed += 1) {
        const rng = mulberry32(seed);
        const minorOptions = optionNames(minor.blocked, minor.answerLatin, rng);
        assert.ok(minorOptions.includes('Pectoralis minor'));
        assert.ok(!minorOptions.includes('Pectoralis major'));
        const scmOptions = optionNames(scm.blocked, scm.answerLatin, mulberry32(seed + 100));
        assert.ok(scmOptions.includes('Sternocleidomastoideus'));
        assert.ok(!scmOptions.some((name) => name.includes('caput')));
        assert.ok(scmOptions.every((name) => known.has(name)));
    }
});

test('a round is eight mixed questions and the same seed repeats', () => {
    const first = buildQuiz(mulberry32(7));
    const again = buildQuiz(mulberry32(7));
    assert.deepEqual(first, again);
    assert.notDeepEqual(first, buildQuiz(mulberry32(8)));
    assert.equal(first.length, QUIZ_LENGTH);
    assert.equal(first.filter((item) => item.kind === 'referral').length, 4);
    assert.equal(first.filter((item) => item.kind === 'stretch').length, 4);

    const known = new Set(MUSCLE_CARDS.flatMap((card) => [card.latin, card.stretchLatin]));
    for (let seed = 1; seed <= 20; seed += 1) {
        for (const question of buildQuiz(mulberry32(seed))) {
            assert.equal(new Set(question.options).size, 4);
            assert.ok(question.options.includes(question.answerLatin));
            assert.ok(question.options.every((name) => known.has(name)));
            for (const blocked of question.blocked) {
                if (blocked !== question.answerLatin) assert.ok(!question.options.includes(blocked));
            }
            assert.equal(question.lead, LEAD[question.kind]);
        }
    }
});

test('score and mode copy stay short and Swedish', () => {
    assert.equal(scoreLine(2, 2), '2 rätt · 2 i rad');
    assert.deepEqual(quizResult(6, 8, 4), {
        score: '6 av 8',
        streak: 'Längsta rad den här sittningen: 4.'
    });
    assert.equal(practiceResult(10, 10), 'Du markerade alla 10 som kunde.');
    assert.equal(practiceResult(1, 10), 'Du markerade 1 av 10 som kunde.');
    assert.equal(questionKicker(3, 8, 'stretch'), 'Fråga 3 av 8 · Stretchsignal');
    assert.equal(evidenceLabel('svag'), 'Klassisk referens, svagt belagd');
    assert.match(modeHelp('cards'), /vänd/);
});
