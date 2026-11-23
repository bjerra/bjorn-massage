/**
 * Joints, plain-language glosses and search for the ROM page.
 * Movement roles still come from public/movements/data.json.
 * The eight buttons are the ones a visitor can point at on the figure.
 * Käkled stays searchable, without a button, so those rows are not dropped.
 */

export type MovementFile = {
    labels: {
        joints: Record<string, { sv: string; en?: string }>;
        movements: Record<string, { sv: string; en?: string }>;
    };
    movements: Record<string, Record<string, { labelSv?: string; primeMovers?: string[]; synergists?: string[] }>>;
    muscles: Array<{ id: string; nameSv?: string; latinName?: string; commonNameSv?: string | null; noSvg?: boolean }>;
};

export type RomGroupId = 'nacke' | 'axel' | 'armbage' | 'handled' | 'bal' | 'hoft' | 'kna' | 'fotled' | 'kake';

export type RomGroup = {
    id: RomGroupId;
    label: string;
    /** Fraction down the figure, 0 at the top of the drawing. Ignored when rail is false. */
    anchor: number;
    rail: boolean;
    sources: string[];
};

export type RomMovement = {
    groupId: RomGroupId;
    groupLabel: string;
    source: string;
    sourceLabel: string;
    movementId: string;
    slug: string;
    /** Anatomical name, for example "Abduktion". */
    term: string;
    /** Everyday phrase, for example "arm ut åt sidan". */
    gloss: string;
    title: string;
    aliases: string[];
    primeMovers: string[];
    synergists: string[];
};

export type RomCatalog = {
    groups: RomGroup[];
    rail: RomGroup[];
    movements: RomMovement[];
    byKey: Map<string, RomMovement>;
    musclesById: Map<string, MovementFile['muscles'][number]>;
};

const WRIST: Record<string, string> = {
    flexor_carpi_radialis: 'forearm_flexors',
    flexor_carpi_ulnaris: 'forearm_flexors',
    extensor_carpi_radialis_longus: 'forearm_extensors',
    extensor_carpi_ulnaris: 'forearm_extensors'
};

export const GROUPS: RomGroup[] = [
    { id: 'nacke', label: 'Nacke', anchor: 0.12, rail: true, sources: ['Cervical'] },
    { id: 'axel', label: 'Axel', anchor: 0.23, rail: true, sources: ['Shoulder', 'Scapula'] },
    { id: 'armbage', label: 'Armbåge', anchor: 0.35, rail: true, sources: ['Elbow', 'Forearm'] },
    { id: 'bal', label: 'Bål', anchor: 0.46, rail: true, sources: ['Thoracic', 'Lumbar'] },
    { id: 'handled', label: 'Handled', anchor: 0.56, rail: true, sources: ['Wrist'] },
    { id: 'hoft', label: 'Höft', anchor: 0.66, rail: true, sources: ['Hip'] },
    { id: 'kna', label: 'Knä', anchor: 0.78, rail: true, sources: ['Knee'] },
    { id: 'fotled', label: 'Fotled', anchor: 0.9, rail: true, sources: ['Ankle', 'Foot'] },
    { id: 'kake', label: 'Käke', anchor: 0.08, rail: false, sources: ['Mandible'] }
];

const SOURCE_SLUG: Record<string, string> = {
    Cervical: 'hals',
    Thoracic: 'brost',
    Lumbar: 'land',
    Scapula: 'skulderblad',
    Shoulder: 'axel',
    Elbow: 'armbage',
    Forearm: 'underarm',
    Wrist: 'handled',
    Hip: 'hoft',
    Knee: 'kna',
    Ankle: 'fotled',
    Foot: 'fot',
    Mandible: 'kake'
};

const TERM_SLUG: Record<string, string> = {
    Abduction: 'abduktion',
    Adduction: 'adduktion',
    ContralateralRotation: 'rotation-motsatt',
    Depression: 'depression',
    Dorsiflexion: 'dorsalflexion',
    DownwardRotation: 'nedatrotation',
    Elevation: 'elevation',
    Eversion: 'eversion',
    Extension: 'extension',
    ExternalRotation: 'utatrotation',
    Flexion: 'flexion',
    HorizontalAbduction: 'horisontell-abduktion',
    HorizontalAdduction: 'horisontell-adduktion',
    InternalRotation: 'inatrotation',
    Inversion: 'inversion',
    IpsilateralLateralFlexion: 'lateralflexion',
    IpsilateralRotation: 'rotation-samma',
    LateralDeviation: 'sidoforskjutning',
    Plantarflexion: 'plantarflexion',
    Pronation: 'pronation',
    Protraction: 'protraktion',
    Protrusion: 'protrusion',
    RadialDeviation: 'radialdeviation',
    Retraction: 'retraktion',
    Supination: 'supination',
    UlnarDeviation: 'ulnardeviation',
    UpwardRotation: 'uppatrotation'
};

/** Everyday phrase shown after the anatomical term. Keyed by source.movement. */
const GLOSS: Record<string, string> = {
    'Cervical.Flexion': 'haka mot bröstet',
    'Cervical.Extension': 'titta upp',
    'Cervical.IpsilateralRotation': 'vrida huvudet åt samma sida',
    'Cervical.ContralateralRotation': 'vrida huvudet åt motsatt sida',
    'Cervical.IpsilateralLateralFlexion': 'luta huvudet åt sidan',
    'Thoracic.Flexion': 'runda övre ryggen',
    'Thoracic.Extension': 'sträcka bröstryggen',
    'Thoracic.IpsilateralRotation': 'vrida bröstryggen åt samma sida',
    'Thoracic.ContralateralRotation': 'vrida bröstryggen åt motsatt sida',
    'Thoracic.IpsilateralLateralFlexion': 'luta bröstryggen åt sidan',
    'Lumbar.Flexion': 'böja ländryggen framåt',
    'Lumbar.Extension': 'svanka',
    'Lumbar.IpsilateralRotation': 'vrida ländryggen åt samma sida',
    'Lumbar.ContralateralRotation': 'vrida ländryggen åt motsatt sida',
    'Lumbar.IpsilateralLateralFlexion': 'luta ländryggen åt sidan',
    'Scapula.Elevation': 'lyfta skuldran',
    'Scapula.Depression': 'sänka skuldran',
    'Scapula.Protraction': 'skuldran framåt',
    'Scapula.Retraction': 'skuldran bakåt',
    'Scapula.UpwardRotation': 'skulderbladet vrids uppåt',
    'Scapula.DownwardRotation': 'skulderbladet vrids nedåt',
    'Shoulder.Abduction': 'arm ut åt sidan',
    'Shoulder.Adduction': 'arm in mot kroppen',
    'Shoulder.Flexion': 'arm framåt',
    'Shoulder.Extension': 'arm bakåt',
    'Shoulder.ExternalRotation': 'vrida armen utåt',
    'Shoulder.InternalRotation': 'vrida armen inåt',
    'Shoulder.HorizontalAbduction': 'arm ut åt sidan i axelhöjd',
    'Shoulder.HorizontalAdduction': 'arm in över kroppen',
    'Elbow.Flexion': 'böja armbågen',
    'Elbow.Extension': 'sträcka armbågen',
    'Forearm.Pronation': 'handflatan nedåt',
    'Forearm.Supination': 'handflatan uppåt',
    'Wrist.Flexion': 'böja handleden framåt',
    'Wrist.Extension': 'böja handleden bakåt',
    'Wrist.RadialDeviation': 'handleden mot tummen',
    'Wrist.UlnarDeviation': 'handleden mot lillfingret',
    'Hip.Flexion': 'ben framåt',
    'Hip.Extension': 'ben bakåt',
    'Hip.Abduction': 'ben ut åt sidan',
    'Hip.Adduction': 'ben in mot kroppen',
    'Hip.ExternalRotation': 'vrida benet utåt',
    'Hip.InternalRotation': 'vrida benet inåt',
    'Knee.Flexion': 'böja knät',
    'Knee.Extension': 'sträcka knät',
    'Knee.InternalRotation': 'vrida underbenet inåt',
    'Ankle.Dorsiflexion': 'foten uppåt',
    'Ankle.Plantarflexion': 'foten nedåt, som att stå på tå',
    'Foot.Inversion': 'fotsulan inåt',
    'Foot.Eversion': 'fotsulan utåt',
    'Mandible.Depression': 'öppna munnen',
    'Mandible.Elevation': 'stänga munnen',
    'Mandible.LateralDeviation': 'käken åt sidan',
    'Mandible.Protrusion': 'käken framåt',
    'Mandible.Retraction': 'käken bakåt'
};

const ALIASES: Record<string, string[]> = {
    'Shoulder.Abduction': ['lyfta armen', 'lyfta armen åt sidan', 'arm ut åt sidan', 'arm åt sidan'],
    'Shoulder.Flexion': ['lyfta armen framåt', 'arm framåt', 'arm uppåt'],
    'Shoulder.Extension': ['arm bakåt', 'föra armen bakåt'],
    'Shoulder.Adduction': ['arm in mot kroppen', 'föra armen in'],
    'Shoulder.ExternalRotation': ['vrida armen utåt'],
    'Shoulder.InternalRotation': ['vrida armen inåt'],
    'Scapula.Elevation': ['lyfta axlarna', 'rycka på axlarna', 'lyfta skuldran'],
    'Scapula.Depression': ['sänka axlarna', 'sänka skuldran'],
    'Scapula.Retraction': ['dra ihop skulderbladen', 'skulderblad bakåt'],
    'Scapula.Protraction': ['skulderblad framåt'],
    'Elbow.Flexion': ['böja armen', 'böja armbågen'],
    'Elbow.Extension': ['sträcka armen', 'sträcka armbågen'],
    'Forearm.Pronation': ['handflatan ned', 'vrida handflatan ned'],
    'Forearm.Supination': ['handflatan upp', 'vrida handflatan upp'],
    'Wrist.Flexion': ['böja handleden'],
    'Wrist.Extension': ['böja handleden bakåt'],
    'Cervical.Flexion': ['haka mot bröstet', 'nicka', 'böja nacken'],
    'Cervical.Extension': ['titta upp', 'böja nacken bakåt'],
    'Cervical.IpsilateralRotation': ['vrida nacken', 'titta åt sidan', 'vrida huvudet'],
    'Cervical.ContralateralRotation': ['vrida nacken', 'titta åt sidan', 'vrida huvudet'],
    'Cervical.IpsilateralLateralFlexion': ['luta huvudet', 'luta nacken'],
    'Lumbar.Flexion': ['böja ryggen', 'runda ryggen'],
    'Lumbar.Extension': ['svanka', 'räta på ryggen'],
    'Hip.Flexion': ['lyfta benet', 'ben framåt'],
    'Hip.Extension': ['ben bakåt'],
    'Hip.Abduction': ['ben ut åt sidan', 'lyfta benet åt sidan'],
    'Knee.Flexion': ['böja knät', 'böja knäet'],
    'Knee.Extension': ['sträcka knät', 'sträcka knäet'],
    'Ankle.Dorsiflexion': ['foten upp', 'tårna upp'],
    'Ankle.Plantarflexion': ['stå på tå', 'foten ned', 'trampa ner'],
    'Mandible.Depression': ['öppna munnen', 'gapa'],
    'Mandible.Elevation': ['stänga munnen', 'bita ihop']
};

export function norm(value: string): string {
    return (value || '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/\p{M}/gu, '')
        .replace(/[^a-z0-9]+/g, '');
}

function termFor(data: MovementFile, movementId: string): string {
    return data.labels.movements[movementId]?.sv || movementId;
}

export function buildCatalog(data: MovementFile): RomCatalog {
    const musclesById = new Map(data.muscles.map((muscle) => [muscle.id, muscle]));
    const movements: RomMovement[] = [];
    for (const group of GROUPS) {
        const rows: Array<{ source: string; movementId: string }> = [];
        for (const source of group.sources) {
            const table = data.movements[source];
            if (!table) continue;
            for (const movementId of Object.keys(table)) rows.push({ source, movementId });
        }
        const baseCount: Record<string, number> = {};
        for (const row of rows) {
            const base = TERM_SLUG[row.movementId] || norm(row.movementId);
            baseCount[base] = (baseCount[base] || 0) + 1;
        }
        for (const row of rows) {
            const base = TERM_SLUG[row.movementId] || norm(row.movementId);
            const slug = baseCount[base] > 1 ? `${SOURCE_SLUG[row.source] || norm(row.source)}-${base}` : base;
            const key = `${row.source}.${row.movementId}`;
            const gloss = GLOSS[key] || '';
            const term = termFor(data, row.movementId);
            const sourceLabel = data.labels.joints[row.source]?.sv || row.source;
            const entry = data.movements[row.source][row.movementId];
            const showSource = group.sources.length > 1;
            movements.push({
                groupId: group.id,
                groupLabel: group.label,
                source: row.source,
                sourceLabel,
                movementId: row.movementId,
                slug,
                term,
                gloss,
                title: showSource ? `${sourceLabel}: ${term}` : term,
                aliases: (ALIASES[key] || []).map(norm).filter(Boolean),
                primeMovers: entry.primeMovers || [],
                synergists: entry.synergists || []
            });
        }
    }
    const byKey = new Map<string, RomMovement>();
    for (const movement of movements) {
        byKey.set(`${movement.groupId}/${movement.slug}`, movement);
        byKey.set(`${movement.source}.${movement.movementId}`, movement);
    }
    return {
        groups: GROUPS,
        rail: GROUPS.filter((group) => group.rail),
        movements,
        byKey,
        musclesById
    };
}

export function movementByQuery(catalog: RomCatalog, groupId: string, slug: string): RomMovement | null {
    if (!groupId || !slug) return null;
    return catalog.byKey.get(`${groupId}/${slug}`) || null;
}

export function movementBySource(catalog: RomCatalog, source: string, movementId: string): RomMovement | null {
    return catalog.byKey.get(`${source}.${movementId}`) || null;
}

export type PaintLists = {
    listPrime: string[];
    listSyn: string[];
    primePaint: string[];
    synPaint: string[];
};

/** Wrist muscles share one shape on the map. The list still names the specific muscle. */
export function paintLists(prime: string[], syn: string[]): PaintLists {
    const hide = new Set<string>();
    prime.concat(syn).forEach((id) => {
        if (WRIST[id]) hide.add(WRIST[id]);
    });
    const paint = new Map<string, number>();
    function add(ids: string[], rank: number) {
        ids.forEach((id) => {
            const target = WRIST[id] || id;
            if ((paint.get(target) || 0) < rank) paint.set(target, rank);
        });
    }
    add(prime, 2);
    add(syn, 1);
    const primePaint: string[] = [];
    const synPaint: string[] = [];
    paint.forEach((rank, id) => {
        if (rank === 2) primePaint.push(id);
        else synPaint.push(id);
    });
    return {
        listPrime: prime.filter((id) => !hide.has(id)),
        listSyn: syn.filter((id) => !hide.has(id)),
        primePaint,
        synPaint
    };
}

export function searchMovements(catalog: RomCatalog, query: string): RomMovement[] {
    const q = norm(query);
    if (q.length < 3) return [];
    const scored = catalog.movements
        .map((movement) => ({ movement, score: scoreMovement(q, movement) }))
        .filter((row) => row.score > 0)
        .sort((a, b) => b.score - a.score || a.movement.title.localeCompare(b.movement.title, 'sv'));
    return scored.slice(0, 8).map((row) => row.movement);
}

function scoreMovement(query: string, movement: RomMovement): number {
    if (movement.aliases.some((alias) => alias === query)) return 100;
    const gloss = norm(movement.gloss);
    const title = norm(movement.title + movement.term + movement.groupLabel);
    if (gloss && (gloss === query || gloss.includes(query))) return 86;
    if (movement.aliases.some((alias) => alias.includes(query) || query.includes(alias))) return 80;
    if (title.includes(query)) return 70;
    return 0;
}

export function muscleLatin(catalog: RomCatalog, id: string, override?: string): string {
    if (override) return override;
    const muscle = catalog.musclesById.get(id);
    return muscle?.latinName || muscle?.nameSv || id.replace(/_/g, ' ');
}

export function muscleCommon(catalog: RomCatalog, id: string): string {
    const name = catalog.musclesById.get(id)?.commonNameSv;
    if (!name) return '';
    return name.charAt(0).toUpperCase() + name.slice(1);
}

export function muscleOffMap(catalog: RomCatalog, id: string): boolean {
    return !!catalog.musclesById.get(id)?.noSvg;
}
