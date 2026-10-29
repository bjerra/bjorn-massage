/**
 * Desk-muscle quiz for /muskelspel.
 *
 * Facts are shortened from the therapist flashcards: classic = Travell & Simons,
 * studied = referral reproduced in patient samples. Do not add referral areas.
 */

export type EvidenceKind = 'klassisk' | 'studerad' | 'bada' | 'svag';

export type QuestionKind = 'referral' | 'stretch';

export type Rng = () => number;

export type MuscleCard = {
    id: string;
    latin: string;
    latinDetail?: string;
    priority: boolean;
    stretchId: string;
    stretchLatin: string;
    referralPrompt: string;
    referral: string;
    stretchPrompt: string;
    stretch: string;
    where: string;
    confuse: string;
    training: string;
    evidence: EvidenceKind;
    /** Other answer labels that must not be wrong options on the referral question. */
    referralBlock: string[];
};

export type QuestionTemplate = {
    id: string;
    kind: QuestionKind;
    cardId: string;
    priority: boolean;
    prompt: string;
    lead: string;
    answerLatin: string;
    blocked: string[];
    evidenceLabel: string;
    detail: string;
};

export type QuizQuestion = {
    id: string;
    kind: QuestionKind;
    cardId: string;
    prompt: string;
    lead: string;
    answerLatin: string;
    options: string[];
    blocked: string[];
    evidenceLabel: string;
    detail: string;
};

export const QUIZ_LENGTH = 8;

export const PRIORITY_IDS = [
    'trapezius_desc',
    'levator_scapulae',
    'suboccipitales',
    'scm_sternale',
    'scm_claviculare',
    'scaleni',
    'pectoralis_minor',
    'ecrb_ecrl'
] as const;

export const DISCLAIMER_LEAD = 'Inte medicinsk rådgivning.';

export const DISCLAIMER_BODY =
    'Spelet ställer ingen diagnos och ersätter inte undersökning eller vård. Områdena är mönster som ofta associeras med muskeln i litteraturen. De visar inte att muskeln ger just din smärta. Palpation av triggerpunkter är osäker mellan undersökare, och stödet för behandlingen är svagt. Avbryt en stretch som ger stickningar, domning eller yrsel. Vid svår, ny eller oförklarad smärta, kontakta vården. Vid bröstsmärta med andnöd eller kallsvett, ring 112.';

export const DISCLAIMER = `${DISCLAIMER_LEAD} ${DISCLAIMER_BODY}`;

export const INTRO =
    'Ett spel för att känna igen områden som ofta associeras med muskler vid skrivbordsarbete, och stretchsignalerna som hör till. Namnen är latinska. Texterna är förkortade från triggerpunktslitteraturen och från små patientstudier.';

export const EVIDENCE_LEGEND: { term: string; text: string }[] = [
    {
        term: 'Klassisk referens',
        text: 'Mönster från Travell och Simons. Klinisk tradition, ritad efter observation. Inte en validerad diagnoskarta.'
    },
    {
        term: 'Studerad',
        text: 'Utstrålningen har återskapats i patientstudier, mest om spänningshuvudvärk eller lateral epikondylalgi. Studierna är små och kommer i huvudsak från en forskargrupp.'
    },
    {
        term: 'Svagt belagd',
        text: 'Den klassiska beskrivningen vilar på en tunn källa. Ta den som grov orientering.'
    }
];

export const LEAD: Record<QuestionKind, string> = {
    referral: 'Vilken muskel brukar kopplas till det här området?',
    stretch: 'Vilken muskel hör den här signalen till?'
};

const SCM_STRETCH_LATIN = 'Sternocleidomastoideus';

const SCM_STRETCH_PROMPT = 'Håll i nyckelbenet, örat bort, hakan bara en aning upp';

const SCM_STRETCH =
    'Varsamt. Håll nyckelbenet nere, luta örat bort, vrid ansiktet lätt mot sidan som stretchas och lyft hakan bara en aning. Håll 15–20 sekunder. Vid yrsel, kärlrisk eller hos äldre räcker sidoböjning. Luta inte huvudet bakåt.';

const SCM_WHERE =
    'Längs buken av något av huvudena. Pincettgrepp som lyfter muskeln från det som ligger djupare. Aldrig ett tryck rakt in i halsen.';

const SCM_CONFUSE =
    'Känner du puls, flytta dig. Tryck inte rakt in i halsen. Nya eller växande knutor ska bedömas. Yrsel är inte ett tecken på den här muskeln förrän andra orsaker har vägts in.';

const SCM_TRAINING =
    'Headset vid samtal. Undvik att sitta länge med huvudet vridet mot en sidoskärm.';

export const MUSCLE_CARDS: MuscleCard[] = [
    {
        id: 'trapezius_desc',
        latin: 'Trapezius pars descendens',
        priority: true,
        stretchId: 'trapezius_desc',
        stretchLatin: 'Trapezius pars descendens',
        referralPrompt: 'Nackens bakre yttre sida, vårtutskottet, tinningen och bakom ögat',
        referral:
            'Upp längs nackens bakre yttre sida mot vårtutskottet, tinningen och bakom ögat. I traditionen kopplas mönstret ofta till spänningshuvudvärk. I en studie av kronisk spänningshuvudvärk beskrevs nackens bakre yttre sida och, hos de flesta patienterna, tinningen. Kontrollerna rapporterade inte tinning.',
        stretchPrompt: 'Axeln tung, örat bort, blicka mot din egen armhåla',
        stretch:
            'Sitt och håll i stolskanten på sidan som stretchas, så axeln stannar nere. Böj örat bort, vrid näsan lätt mot den sidan och nicka hakan en aning. Håll 20–30 sekunder. Sidolyft med band och axellyft är huvudspåret. Stretchen är ett tillägg.',
        where: 'I mellersta buken av de övre fibrerna, på den fria övre kanten, ungefär halvvägs mellan nacken och akromion. Pincettgrepp som lyfter muskeln från första revbenet.',
        confuse:
            'Levator scapulae stretchas med näsan åt motsatt håll. Utstrålande värk i armen med domning eller svaghet kan komma från en nervrot, inte från den här kartan.',
        training: 'Håll inte telefonen mellan öra och axel.',
        evidence: 'bada',
        referralBlock: []
    },
    {
        id: 'levator_scapulae',
        latin: 'Levator scapulae',
        priority: true,
        stretchId: 'levator_scapulae',
        stretchLatin: 'Levator scapulae',
        referralPrompt: 'Nackvinkeln, skulderbladets inre kant och bakre axeln',
        referral:
            'Nackvinkeln, skulderbladets inre kant och bakre axeln. I traditionen kopplas mönstret till stel nacke med begränsad rotation. En studie av kvinnor med kronisk spänningshuvudvärk fann muskelns största utstrålningsområde bland dem som testades. Det gör inte kartan till en diagnos.',
        stretchPrompt: 'Näsan mot motsatt ficka',
        stretch:
            'Håll axeln nere, med handen i stolen eller bakom ryggen. Böj huvudet framåt, luta bort och vrid näsan mot motsatt ficka. Armbågen över huvudet på den stretchade sidan gör stretchen starkare.',
        where: 'Vid nackvinkeln, där muskeln kommer fram under framkanten av trapezius pars descendens, och strax ovanför skulderbladets övre vinkel.',
        confuse:
            'Trapezius pars descendens har motsatt rotation i stretchen. Scaleni och mm. rhomboidei kan också beskrivas mot skulderbladets inre kant. Plötslig låsning efter en rörelse kan vara en facettled.',
        training:
            'Skärm i ögonhöjd, rakt framför, så huvudet inte hålls vridet. Kopplingen till framåtskjutande huvud är en association, inte ett bevis. Res dig när du suttit länge.',
        evidence: 'klassisk',
        referralBlock: []
    },
    {
        id: 'suboccipitales',
        latin: 'Mm. suboccipitales',
        latinDetail: 'Rectus capitis posterior major et minor, obliquus capitis superior et inferior',
        priority: true,
        stretchId: 'suboccipitales',
        stretchLatin: 'Mm. suboccipitales',
        referralPrompt: 'Ett band från nackknölen över tinningbenet, ofta som ett pannband på båda sidor',
        referral:
            'Ett band från nackknölen ut över tinningbenet, ofta känt som ett dubbelsidigt pannband. I en studie hade 65 procent av personerna med kronisk spänningshuvudvärk aktiva punkter, mot ingen av kontrollerna. Latenta punkter fanns även hos en del kontroller. I ett senare material var punkterna de vanligaste, 92 procent. Den klassiska beskrivningen är djup huvudvärk som sprider sig mot öga och panna.',
        stretchPrompt: 'Förläng nackens baksida, utan att trycka hakan mot halsen',
        stretch:
            'Ligg eller sitt och nicka ett litet ja, så nackens baksida blir längre. Håll 10 sekunder och upprepa 10 gånger. Tryck inte hakan mot halsen. Det här är huvudövningen för nacken i materialet.',
        where: 'Djupt, precis under nackknölen, mellan nackknölen och C2.',
        confuse:
            'Nytt eller förändrat huvudvärksmönster, särskilt efter 50 år, ska bedömas i vården. Yrsel, dubbelseende, talsvårigheter, sväljsvårigheter, dropattacker, illamående, domning eller nystagmus betyder stopp. Undvik ihållande djupt tryck tillsammans med ytterläge i bakåtböjning och rotation. Där går en del av kotartären.',
        training:
            'Milt tryck under nackknölen i en till två minuter, med huvudet neutralt. Två tennisbollar i en socka, eller fingertopparna, när du ligger på rygg.',
        evidence: 'bada',
        referralBlock: []
    },
    {
        id: 'scm_sternale',
        latin: 'Sternocleidomastoideus, caput sternale',
        priority: true,
        stretchId: 'scm',
        stretchLatin: SCM_STRETCH_LATIN,
        referralPrompt: 'Hjässan, nackknölen, kinden, runt ögat, halsen och bröstbenet',
        referral:
            'Sternala huvudet: hjässa, nackknöl, kind, över och runt ögat, hals och bröstben. Ibland tårande eller rött öga. Studier av kronisk spänningshuvudvärk har kopplat sternocleidomastoideus till tinning, utan att skilja huvudena åt.',
        stretchPrompt: SCM_STRETCH_PROMPT,
        stretch: SCM_STRETCH,
        where: SCM_WHERE,
        confuse: SCM_CONFUSE,
        training: SCM_TRAINING,
        evidence: 'bada',
        referralBlock: []
    },
    {
        id: 'scm_claviculare',
        latin: 'Sternocleidomastoideus, caput claviculare',
        priority: true,
        stretchId: 'scm',
        stretchLatin: SCM_STRETCH_LATIN,
        referralPrompt: 'Pannan, djupt i örat och bakom örat',
        referral:
            'Klavikulära huvudet: pannan, på båda sidor om det är uttalat, djupt i örat och bakom örat. Traditionen kopplar huvudet till lägesyrsel. Det är inte ett tecken på yrsel förrän andra orsaker har vägts in. Studierna som nämner tinning skiljer inte huvudena åt.',
        stretchPrompt: SCM_STRETCH_PROMPT,
        stretch: SCM_STRETCH,
        where: SCM_WHERE,
        confuse: SCM_CONFUSE,
        training: SCM_TRAINING,
        evidence: 'bada',
        referralBlock: []
    },
    {
        id: 'scaleni',
        latin: 'Scaleni (anterior, medius, posterior)',
        priority: true,
        stretchId: 'scaleni',
        stretchLatin: 'Scaleni (anterior, medius, posterior)',
        referralPrompt: 'Bröstet, skulderbladets inre kant och armens utsida mot tumme och pekfinger',
        referral:
            'Bröstet, skulderbladets inre kant och armens utsida, ofta längs underarmens tumsida till tumme och pekfinger. Mönstret kan likna bröstsmärta, trång passage för kärl och nerver vid nyckelbenet, och nervrotssmärta.',
        stretchPrompt: 'Axeln nere, örat bort, andas i magen',
        stretch:
            'Varsamt och kort, med långsam bukandning. Sitt på handen eller håll i stolen, och luta örat bort. Främre delen: vrid näsan mot sidan som stretchas. Mellersta: titta rakt fram. Bakre: vrid näsan åt andra hållet.',
        where: 'På sidan av halsen, mellan sternocleidomastoideus och framkanten av trapezius, ovanför nyckelbenet. Den främre ligger bakom det klavikulära huvudet av sternocleidomastoideus.',
        confuse:
            'Kan likna bröstsmärta, trång passage för kärl och nerver vid nyckelbenet, och nervrotssmärta. Ansträngningsutlöst bröstsmärta, andnöd eller kallsvett: ring 112. Nattliga stickningar i tumme, pekfinger och långfinger kan vara karpaltunnel. Inget ihållande djupt tryck ovanför nyckelbenet, mellan sternocleidomastoideus och trapezius. Där går armens nervfläta och nyckelbensartären.',
        training: 'Handen på magen och några långsamma andetag när du tar paus. Musklerna arbetar mer vid bröstandning och stress.',
        evidence: 'klassisk',
        referralBlock: []
    },
    {
        id: 'pectoralis_minor',
        latin: 'Pectoralis minor',
        priority: true,
        stretchId: 'pectoralis_minor',
        stretchLatin: 'Pectoralis minor',
        referralPrompt: 'Axelns framsida, bröstet och armens insida mot lillfinger och ringfinger',
        referral:
            'Nästan samma område som pectoralis major: axelns framsida och bröstet, ner längs armens insida mot lillfinger och ringfinger. Beskrivningen är svagt belagd. Ta den som grov orientering. Pectorala mönster kan i traditionen likna hjärtbesvär.',
        stretchPrompt: 'Skulderbladet bak och ner, vrid sedan bort. En arm i dörrkarmen',
        stretch:
            'En arm i taget. Underarmen mot karmen, armbågen i eller strax över axelhöjd, kliv igenom och vrid bröstet bort. Två till tre gånger 30 sekunder. Skulderbladet bak och ner före vridningen. Inget nyp i axelns framkant. I en jämförelse hos friska vuxna gav enarmsvarianten störst längdökning av tre stretchövningar.',
        where: 'Strax nedanför korpnäbbsutskottet och längs muskeln mot fästena på revben 3–5. Palpation via armhålan, snett mot utskottet, under pectoralis major.',
        confuse:
            'Kan tränga kärl-nervbunten. Smärta när armen lyfts, eller när man ligger på sidan, kan komma från rotatorkuffen. Bröstsmärta kan vara hjärtat. Var försiktig vid korpnäbbsutskottet och i armhålan, där armens nervfläta och kärl passerar.',
        training: 'Para dörrkarmen med styrka för skulderbladet, till exempel rodd eller serratus anterior.',
        evidence: 'svag',
        referralBlock: ['Pectoralis major']
    },
    {
        id: 'ecrb_ecrl',
        latin: 'Extensor carpi radialis brevis et longus',
        latinDetail: 'ECRB et ECRL',
        priority: true,
        stretchId: 'ecrb_ecrl',
        stretchLatin: 'Extensor carpi radialis brevis et longus',
        referralPrompt: 'Yttre armbågsutskottet och underarmens ovansida mot tumsidan',
        referral:
            'Vid lateral epikondylalgi: yttre armbågsutskottet och underarmens ovansida mot tumsidan. Hos friska kontroller stannade utstrålningen i underarmen. Smärtan patienterna kände igen återskapades för extensor carpi radialis longus i 70 procent, extensor carpi radialis brevis i 65 procent, brachioradialis i 50 procent och extensor digitorum i 25 procent.',
        stretchPrompt: 'Lång armbåge, mjuk näve, handleden ner mot lillfingersidan',
        stretch:
            'Armbågen rak, handflatan ner, en mjuk näve och handleden böjd ner med en liten lutning mot lillfingret. Håll 20–30 sekunder, varsamt. Handledssträckning mot motstånd, med långsam sänkning, är huvudspåret. Håll isometriskt om det retar. Stretchen är den mjuka varianten.',
        where: 'I muskelmassan strax nedanför yttre armbågsutskottet. Extensor carpi radialis longus och brachioradialis ligger mer mot tumsidan. Extensor carpi radialis brevis ligger någon centimeter längre ner. Extensor digitorum ligger mitt på underarmen.',
        confuse:
            'Smärta precis på yttre armbågsutskottet vid grepp kan vara senbesvär, med samma typ av belastning. Ömhet ungefär fem centimeter längre ner, värre på natten, kan vara radialtunnelsyndrom. Karpaltunnel sitter på böjsidan, i tumme, pekfinger och långfinger.',
        training: 'Håll musen nära, underarmen stödd och handleden neutral.',
        evidence: 'studerad',
        referralBlock: []
    },
    {
        id: 'pectoralis_major',
        latin: 'Pectoralis major',
        priority: false,
        stretchId: 'pectoralis_major',
        stretchLatin: 'Pectoralis major',
        referralPrompt: 'Främre bröst, främre axel och armens insida. Kan likna kärlkramp',
        referral:
            'Främre bröst, främre axel och armens insida. Vänstersidigt mönster kan likna kärlkramp. Finare detaljer bör stämmas av mot Travell och Simons.',
        stretchPrompt: 'Byt armhöjd, byt fibrer',
        stretch:
            'Samma dörrkarm som för pectoralis minor, på olika höjd. Armbåge lågt, omkring 60 grader, för de klavikulära fibrerna. Omkring 90 grader för de sternala. Högre, omkring 120 grader, för de kostala.',
        where: 'I de klavikulära, sternala och kostala delarna. Lättast att nå vid den fria laterala kanten, i främre axelvecket, med pincettgrepp.',
        confuse:
            'Bröstsmärta vid ansträngning, andnöd eller kallsvett: ring 112. Punktömhet i brosket mellan revben och bröstben kan vara en broskirritation.',
        training: 'Pauser från hopkrupen sittning är komfort och omväxling. Stödet för att korrigera hållning är svagt.',
        evidence: 'klassisk',
        referralBlock: ['Pectoralis minor']
    },
    {
        id: 'rhomboidei',
        latin: 'Mm. rhomboidei (major et minor)',
        latinDetail: 'Tillsammans med trapezius pars transversa',
        priority: false,
        stretchId: 'rhomboidei',
        stretchLatin: 'Mm. rhomboidei (major et minor)',
        referralPrompt: 'Mest lokalt, en värk mellan skulderbladen',
        referral:
            'Mest lokalt, från skulderbladets inre kant in mot ryggraden, som en värk mellan skulderbladen. Trapezius pars transversa hör till samma beskrivning. Levator scapulae, scaleni och nacken kan beskrivas mot samma kant, så mönstret räcker inte ensamt.',
        stretchPrompt: 'Gör plats mellan skulderbladen',
        stretch:
            'Händerna knäppta framför bröstet, runda övre ryggen och skjut händerna framåt så skulderbladen glider isär. Håll 20–30 sekunder. Rodd är huvudspåret. Stretchen är ett tillägg, och musklerna kan kännas strama fast de är långa och trötta.',
        where: 'Längs skulderbladets inre kant, mellan skulderblad och ryggrad, djupt om trapezius pars transversa.',
        confuse:
            'Kolla nacken. Levator scapulae, scaleni och nackens leder kan beskrivas mot samma område. Värk mellan skulderbladen som inte ändras med läge, eller kommer med bröstsmärta, andnöd eller sjukdomskänsla, ska bedömas akut.',
        training: 'Tennisboll mot väggen, bredvid skulderbladet. Rörlighet i bröstryggen hör till samma egenvård.',
        evidence: 'svag',
        referralBlock: []
    }
];

const BANNED = [
    'orsakar',
    'botar',
    'diagnostiserar',
    'kappmuskeln',
    'nickmuskeln',
    'skulderbladshöjaren',
    'upper trapezius',
    'pec minor',
    'pec major'
];

export function evidenceLabel(kind: EvidenceKind): string {
    switch (kind) {
        case 'klassisk':
            return 'Klassisk referens';
        case 'studerad':
            return 'Studerad';
        case 'bada':
            return 'Klassisk referens och studerad';
        case 'svag':
            return 'Klassisk referens, svagt belagd';
    }
}

export function findBanned(text: string): string | undefined {
    const lower = text.toLowerCase();
    return BANNED.find((word) => lower.includes(word));
}

export function cardCopy(card: MuscleCard): string[] {
    return [
        card.latin,
        card.latinDetail ?? '',
        card.stretchLatin,
        card.referralPrompt,
        card.referral,
        card.stretchPrompt,
        card.stretch,
        card.where,
        card.confuse,
        card.training,
        evidenceLabel(card.evidence)
    ];
}

export function modeHelp(mode: 'quiz' | 'cards'): string {
    if (mode === 'cards') {
        return 'Säg området och signalen innan du vänder. Markera sedan om du kunde.';
    }
    return 'Åtta frågor. Ett område eller en stretchsignal, sedan muskel.';
}

export function questionKicker(index: number, total: number, kind: QuestionKind): string {
    const label = kind === 'referral' ? 'Utstrålningsområde' : 'Stretchsignal';
    return `Fråga ${index} av ${total} · ${label}`;
}

export function cardKicker(index: number, total: number): string {
    return `Kort ${index} av ${total}`;
}

export function scoreLine(correct: number, streak: number): string {
    return `${correct} rätt · ${streak} i rad`;
}

export function quizResult(correct: number, total: number, bestStreak: number): { score: string; streak: string } {
    return {
        score: `${correct} av ${total}`,
        streak: `Längsta rad den här sittningen: ${bestStreak}.`
    };
}

export function practiceResult(known: number, total: number): string {
    if (known === total && total > 0) return `Du markerade alla ${total} som kunde.`;
    return `Du markerade ${known} av ${total} som kunde.`;
}

export function feedbackText(
    question: Pick<QuizQuestion, 'kind' | 'answerLatin' | 'evidenceLabel' | 'detail'>,
    correct: boolean
): string {
    const head = correct
        ? `Ja. ${question.answerLatin}.`
        : question.kind === 'referral'
          ? `Nej. Området brukar kopplas till ${question.answerLatin}.`
          : `Nej. Signalen hör till ${question.answerLatin}.`;
    const label = question.kind === 'referral' ? ` ${question.evidenceLabel}.` : '';
    return `${head}${label} ${question.detail}`;
}

export function shuffle<T>(items: readonly T[], rng: Rng): T[] {
    const copy = [...items];
    for (let index = copy.length - 1; index > 0; index -= 1) {
        const swap = Math.floor(rng() * (index + 1));
        const current = copy[index];
        copy[index] = copy[swap];
        copy[swap] = current;
    }
    return copy;
}

export function mulberry32(seed: number): Rng {
    let state = seed >>> 0;
    return () => {
        state = (state + 0x6d2b79f5) | 0;
        let value = Math.imul(state ^ (state >>> 15), 1 | state);
        value = (value + Math.imul(value ^ (value >>> 7), 61 | value)) ^ value;
        return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
    };
}

function distractorNames(): string[] {
    return [...new Set(MUSCLE_CARDS.map((card) => card.latin))];
}

export function optionNames(blocked: readonly string[], answerLatin: string, rng: Rng): string[] {
    const ban = new Set(blocked);
    ban.add(answerLatin);
    const pool = distractorNames().filter((name) => !ban.has(name));
    if (pool.length < 3) throw new Error(`Not enough distractors for ${answerLatin}`);
    return shuffle([answerLatin, ...shuffle(pool, rng).slice(0, 3)], rng);
}

export function questionPool(cards: readonly MuscleCard[] = MUSCLE_CARDS): QuestionTemplate[] {
    const referrals: QuestionTemplate[] = cards.map((card) => ({
        id: `ref-${card.id}`,
        kind: 'referral',
        cardId: card.id,
        priority: card.priority,
        prompt: card.referralPrompt,
        lead: LEAD.referral,
        answerLatin: card.latin,
        blocked: [...new Set([card.latin, ...card.referralBlock])],
        evidenceLabel: evidenceLabel(card.evidence),
        detail: card.referral
    }));

    const seen = new Set<string>();
    const stretches: QuestionTemplate[] = [];
    for (const card of cards) {
        if (seen.has(card.stretchId)) continue;
        seen.add(card.stretchId);
        const group = cards.filter((item) => item.stretchId === card.stretchId);
        stretches.push({
            id: `str-${card.stretchId}`,
            kind: 'stretch',
            cardId: card.id,
            priority: group.some((item) => item.priority),
            prompt: card.stretchPrompt,
            lead: LEAD.stretch,
            answerLatin: card.stretchLatin,
            blocked: [...new Set(group.flatMap((item) => [item.latin, item.stretchLatin]))],
            evidenceLabel: evidenceLabel(card.evidence),
            detail: card.stretch
        });
    }

    return [...referrals, ...stretches];
}

function toQuestion(template: QuestionTemplate, rng: Rng): QuizQuestion {
    return {
        id: template.id,
        kind: template.kind,
        cardId: template.cardId,
        prompt: template.prompt,
        lead: template.lead,
        answerLatin: template.answerLatin,
        options: optionNames(template.blocked, template.answerLatin, rng),
        blocked: [...template.blocked],
        evidenceLabel: template.evidenceLabel,
        detail: template.detail
    };
}

export function buildQuiz(rng: Rng = Math.random, length = QUIZ_LENGTH): QuizQuestion[] {
    const pool = questionPool();
    const referrals = pool.filter((item) => item.kind === 'referral');
    const stretches = pool.filter((item) => item.kind === 'stretch');
    const referralTarget = Math.min(Math.floor(length / 2), referrals.length);
    const stretchTarget = Math.min(length - referralTarget, stretches.length);
    const priority = shuffle(
        referrals.filter((item) => item.priority),
        rng
    );
    const chosen: QuestionTemplate[] = priority.slice(0, Math.min(Math.max(0, referralTarget - 1), referralTarget));
    const chosenIds = new Set(chosen.map((item) => item.id));
    const restReferrals = shuffle(
        referrals.filter((item) => !chosenIds.has(item.id)),
        rng
    );
    chosen.push(...restReferrals.slice(0, referralTarget - chosen.length));
    const chosenStretch = shuffle(stretches, rng).slice(0, stretchTarget);
    let selected = [...chosen, ...chosenStretch];
    if (selected.length < length) {
        const used = new Set(selected.map((item) => item.id));
        const rest = shuffle(
            pool.filter((item) => !used.has(item.id)),
            rng
        );
        selected = [...selected, ...rest.slice(0, length - selected.length)];
    }
    return shuffle(selected, rng).map((template) => toQuestion(template, rng));
}
