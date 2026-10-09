/**
 * Muscle region paths + trigger point markers.
 * Matches bodyOutline viewBox: 0 0 120 340
 */

export type MuscleRegion = 'cervical' | 'shoulder' | 'thoracic' | 'lumbar' | 'hip' | 'knee' | 'ankle' | 'face' | 'mandible';

export const REGION_COLORS: Record<MuscleRegion, { stroke: string; fill: string }> = {
  cervical:  { stroke: '#0D9488', fill: '#F0FDFA' },
  shoulder:  { stroke: '#6366F1', fill: '#EEF2FF' },
  thoracic:  { stroke: '#D97706', fill: '#FFFBEB' },
  lumbar:    { stroke: '#EA580C', fill: '#FFF7ED' },
  hip:       { stroke: '#9333EA', fill: '#FAF5FF' },
  knee:      { stroke: '#2563EB', fill: '#EFF6FF' },
  ankle:     { stroke: '#E11D48', fill: '#FFF1F2' },
  face:      { stroke: '#DB2777', fill: '#FDF2F8' },
  mandible:      { stroke: '#DB2777', fill: '#FDF2F8' },
};

export const EXTRA_REGION_COLORS: Record<string, string> = {
  scapula:  '#0891B2',
  forearm:  '#059669',
  lumbar:   '#EA580C',
  thoracic: '#D97706',
};

export interface MusclePathData {
  id:       string;
  region:   MuscleRegion;
  front?:   string;
  back?:    string;
  tpMarkers: {
    id:     string;
    view:   'front' | 'back';
    cx:     number;
    cy:     number;
    region?: string;
  }[];
}

export const MUSCLE_PATHS: MusclePathData[] = [

  // ── FACE ──────────────────────────────────────────────────────────────────

  {
    id: 'temporalis',
    region: 'face',
    // Fan-shaped temple muscle, both sides of skull
    front: `M45 13 C43 15 42 19 43 25 L49 26 L52 18 L51 12 Z
            M75 13 C77 15 78 19 77 25 L71 26 L68 18 L69 12 Z`,
    tpMarkers: [
      { id: 'TP1', region: 'face', view: 'front', cx: 44, cy: 20 },
      { id: 'TP2', region: 'face', view: 'front', cx: 76, cy: 20 },
    ],
  },

  {
    id: 'masseter',
    region: 'face',
    // Jaw / cheek muscle bilaterally
    front: `M46 28 L46 38 L54 39 L55 27 Z
            M74 28 L74 38 L66 39 L65 27 Z`,
    tpMarkers: [
      { id: 'TP1', region: 'face', view: 'front', cx: 50, cy: 33 },
      { id: 'TP2', region: 'face', view: 'front', cx: 70, cy: 33 },
    ],
  },

  // ── CERVICAL ──────────────────────────────────────────────────────────────

  {
    id: 'sternocleidomastoideus',
    region: 'cervical',
    front: `M54 45 C51 49 49 53 48 59 L53 61 C54 55 56 51 57 47 Z
            M66 45 C69 49 71 53 72 59 L67 61 C66 55 64 51 63 47 Z`,
    tpMarkers: [
      { id: 'TP1',
    region: 'cervical', view: 'front', cx: 50, cy: 54 },
      { id: 'TP2',
    region: 'cervical', view: 'front', cx: 70, cy: 54 },
    ],
  },

  {
    id: 'scaleni',
    region: 'cervical',
    front: `M53 45 C50 47 48 51 47 57 L52 59 C53 53 55 49 56 46 Z
            M67 45 C70 47 72 51 73 57 L68 59 C67 53 65 49 64 46 Z`,
    tpMarkers: [
      { id: 'TP1',
    region: 'cervical', view: 'front', cx: 49, cy: 52 },
      { id: 'TP2',
    region: 'cervical', view: 'front', cx: 71, cy: 52 },
    ],
  },

  {
    id: 'suboccipitals',
    region: 'cervical',
    back: `M50 22 L50 35 L60 37 L70 35 L70 22 L60 20 Z`,
    tpMarkers: [
      { id: 'TP1',
    region: 'cervical', view: 'back', cx: 60, cy: 29 },
    ],
  },

  {
    id: 'trapezius_desc',
    region: 'cervical',
    back: `M55 45 C46 49 35 56 29 66 L35 70 C41 61 50 55 58 51 Z
           M65 45 C74 49 85 56 91 66 L85 70 C79 61 70 55 62 51 Z`,
    tpMarkers: [
      { id: 'TP1',
    region: 'cervical', view: 'back', cx: 33, cy: 66 },
      { id: 'TP2',
    region: 'cervical', view: 'back', cx: 87, cy: 66 },
    ],
  },

  {
    id: 'trapezius_trans',
    region: 'cervical',
    back: `M35 70 L33 90 L60 94 L87 90 L85 70 L60 74 Z`,
    tpMarkers: [
      { id: 'TP1',
    region: 'cervical', view: 'back', cx: 60, cy: 82 },
    ],
  },

  {
    id: 'trapezius_asc',
    region: 'cervical',
    back: `M33 90 L31 118 L46 126 L60 128 L74 126 L89 118 L87 90 L60 94 Z`,
    tpMarkers: [
      { id: 'TP1',
    region: 'cervical', view: 'back', cx: 60, cy: 112 },
    ],
  },

  {
    id: 'levator_scapulae',
    region: 'cervical',
    back: `M55 45 C49 49 43 55 39 64 L44 68 C48 59 54 53 58 48 Z
           M65 45 C71 49 77 55 81 64 L76 68 C72 59 66 53 62 48 Z`,
    tpMarkers: [
      { id: 'TP1',
    region: 'cervical', view: 'back', cx: 41, cy: 66 },
      { id: 'TP2',
    region: 'cervical', view: 'back', cx: 79, cy: 66 },
    ],
  },

  // ── SHOULDER / CHEST ──────────────────────────────────────────────────────

  {
    id: 'deltoideus',
    region: 'shoulder',
    front: `M17 72 C13 76 11 82 11 90 L17 108 L25 106 L25 88 L23 74 Z
            M103 72 C107 76 109 82 109 90 L103 108 L95 106 L95 88 L97 74 Z`,
    back:  `M17 72 C13 76 11 82 11 90 L17 108 L25 106 L25 88 L23 74 Z
            M103 72 C107 76 109 82 109 90 L103 108 L95 106 L95 88 L97 74 Z`,
    tpMarkers: [
      { id: 'TP1',
    region: 'cervical', view: 'front', cx: 15, cy: 90 },
      { id: 'TP1',
    region: 'cervical', view: 'front', cx: 105, cy: 90 },
      { id: 'TP2',
    region: 'cervical', view: 'back',  cx: 15, cy: 90 },
      { id: 'TP2',
    region: 'cervical', view: 'back',  cx: 105, cy: 90 },
    ],
  },

  {
    id: 'pectoralis_major',
    region: 'shoulder',
    front: `M35 65 C32 72 31 84 33 98 L47 102 L54 82 L56 65 Z
            M85 65 C88 72 89 84 87 98 L73 102 L66 82 L64 65 Z`,
    tpMarkers: [
      { id: 'TP1',
    region: 'cervical', view: 'front', cx: 37, cy: 74 },
      { id: 'TP2',
    region: 'cervical', view: 'front', cx: 37, cy: 88 },
      { id: 'TP1',
    region: 'cervical', view: 'front', cx: 83, cy: 74 },
    ],
  },

  {
    id: 'pectoralis_minor',
    region: 'shoulder',
    front: `M38 70 C34 78 34 94 38 102 L48 98 L50 78 Z
            M82 70 C86 78 86 94 82 102 L72 98 L70 78 Z`,
    tpMarkers: [
      { id: 'TP1',
    region: 'cervical', view: 'front', cx: 38, cy: 80 },
      { id: 'TP2',
    region: 'cervical', view: 'front', cx: 82, cy: 80 },
    ],
  },

  {
    id: 'serratus_anterior',
    region: 'shoulder',
    front: `M31 86 C26 94 25 108 28 120 L36 122 L38 106 L36 88 Z
            M89 86 C94 94 95 108 92 120 L84 122 L82 106 L84 88 Z`,
    tpMarkers: [
      { id: 'TP1',
    region: 'cervical', view: 'front', cx: 28, cy: 106 },
      { id: 'TP1',
    region: 'cervical', view: 'front', cx: 92, cy: 106 },
    ],
  },

  {
    id: 'rhomboids',
    region: 'shoulder',
    back: `M44 88 L42 118 L60 122 L78 118 L76 88 L60 92 Z`,
    tpMarkers: [
      { id: 'TP1',
    region: 'cervical', view: 'back', cx: 60, cy: 106 },
    ],
  },

  {
    id: 'infraspinatus',
    region: 'shoulder',
    back: `M35 92 L33 118 L48 124 L60 126 L60 94 L47 90 Z
           M85 92 L87 118 L72 124 L60 126 L60 94 L73 90 Z`,
    tpMarkers: [
      { id: 'TP1',
    region: 'cervical', view: 'back', cx: 39, cy: 108 },
      { id: 'TP2',
    region: 'cervical', view: 'back', cx: 81, cy: 108 },
    ],
  },

  {
    id: 'subscapularis',
    region: 'shoulder',
    front: `M29 76 C24 84 23 98 26 112 L36 114 L38 96 L34 78 Z
            M91 76 C96 84 97 98 94 112 L84 114 L82 96 L86 78 Z`,
    tpMarkers: [
      { id: 'TP1',
    region: 'cervical', view: 'front', cx: 26, cy: 96 },
      { id: 'TP1',
    region: 'cervical', view: 'front', cx: 94, cy: 96 },
    ],
  },

  // ── THORACIC / LUMBAR ─────────────────────────────────────────────────────

  {
    id: 'erector_spinae',
    region: 'thoracic',
    back: `M48 92 L44 168 L56 170 L58 94 Z
           M72 92 L76 168 L64 170 L62 94 Z`,
    tpMarkers: [
      { id: 'TP1',
    region: 'cervical', view: 'back', cx: 48, cy: 150 },
      { id: 'TP2',
    region: 'cervical', view: 'back', cx: 72, cy: 114 },
    ],
  },

  {
    id: 'multifidus',
    region: 'thoracic',
    back: `M54 122 L52 168 L60 170 L60 124 Z
           M66 122 L68 168 L60 170 L60 124 Z`,
    tpMarkers: [
      { id: 'TP1',
    region: 'cervical', view: 'back', cx: 60, cy: 154 },
    ],
  },

  {
    id: 'quadratus_lumborum',
    region: 'lumbar',
    back: `M46 128 L42 168 L56 172 L58 132 Z
           M74 128 L78 168 L64 172 L62 132 Z`,
    tpMarkers: [
      { id: 'TP1',
    region: 'cervical', view: 'back', cx: 44, cy: 146 },
      { id: 'TP2',
    region: 'cervical', view: 'back', cx: 76, cy: 158 },
    ],
  },

  // ── HIP ───────────────────────────────────────────────────────────────────

  {
    id: 'iliopsoas',
    region: 'hip',
    front: `M44 156 L38 180 L50 182 L54 160 Z
            M76 156 L82 180 L70 182 L66 160 Z`,
    tpMarkers: [
      { id: 'TP1',
    region: 'cervical', view: 'front', cx: 42, cy: 170 },
      { id: 'TP1',
    region: 'cervical', view: 'front', cx: 78, cy: 170 },
    ],
  },

  {
    id: 'tensor_fasciae_latae',
    region: 'hip',
    front: `M28 186 C24 196 23 210 26 224 L34 226 L38 210 L36 188 Z
            M92 186 C96 196 97 210 94 224 L86 226 L82 210 L84 188 Z`,
    tpMarkers: [
      { id: 'TP1',
    region: 'cervical', view: 'front', cx: 26, cy: 208 },
      { id: 'TP1',
    region: 'cervical', view: 'front', cx: 94, cy: 208 },
    ],
  },

  {
    id: 'gluteus_maximus',
    region: 'hip',
    back: `M26 186 C22 196 22 214 26 228 L40 236 L54 232 L56 196 L42 188 Z
           M94 186 C98 196 98 214 94 228 L80 236 L66 232 L64 196 L78 188 Z`,
    tpMarkers: [
      { id: 'TP1',
    region: 'cervical', view: 'back', cx: 28, cy: 208 },
      { id: 'TP2',
    region: 'cervical', view: 'back', cx: 32, cy: 224 },
      { id: 'TP1',
    region: 'cervical', view: 'back', cx: 92, cy: 208 },
      { id: 'TP2',
    region: 'cervical', view: 'back', cx: 88, cy: 224 },
    ],
  },

  {
    id: 'gluteus_medius',
    region: 'hip',
    back: `M26 172 C22 180 22 194 28 204 L42 210 L52 198 L52 174 L38 170 Z
           M94 172 C98 180 98 194 92 204 L78 210 L68 198 L68 174 L82 170 Z`,
    tpMarkers: [
      { id: 'TP1',
    region: 'cervical', view: 'back', cx: 26, cy: 184 },
      { id: 'TP2',
    region: 'cervical', view: 'back', cx: 30, cy: 198 },
      { id: 'TP1',
    region: 'cervical', view: 'back', cx: 94, cy: 184 },
      { id: 'TP2',
    region: 'cervical', view: 'back', cx: 90, cy: 198 },
    ],
  },

  {
    id: 'piriformis',
    region: 'hip',
    back: `M36 216 C32 226 33 238 38 244 L50 246 L54 236 L52 218 Z
           M84 216 C88 226 87 238 82 244 L70 246 L66 236 L68 218 Z`,
    tpMarkers: [
      { id: 'TP1',
    region: 'cervical', view: 'back', cx: 38, cy: 230 },
      { id: 'TP1',
    region: 'cervical', view: 'back', cx: 82, cy: 230 },
    ],
  },

  {
    id: 'sartorius',
    region: 'hip',
    // Long diagonal strap muscle — ASIS to medial knee
    front: `M30 186 C28 206 32 232 40 258 L44 256 C36 230 32 206 34 186 Z
            M90 186 C92 206 88 232 80 258 L76 256 C84 230 88 206 86 186 Z`,
    tpMarkers: [
      { id: 'TP1', region: 'hip', view: 'front', cx: 32, cy: 210 },
      { id: 'TP2', region: 'hip', view: 'front', cx: 88, cy: 210 },
    ],
  },

  // ── KNEE ──────────────────────────────────────────────────────────────────

  {
    id: 'rectus_femoris',
    region: 'hip',
    front: `M36 194 C32 206 30 230 32 254 L40 258 L46 254 L46 196 Z
            M84 194 C88 206 90 230 88 254 L80 258 L74 254 L74 196 Z`,
    tpMarkers: [
      { id: 'TP1',
    region: 'cervical', view: 'front', cx: 34, cy: 226 },
      { id: 'TP1',
    region: 'cervical', view: 'front', cx: 86, cy: 226 },
    ],
  },

  {
    id: 'hamstrings',
    region: 'hip',
    back: `M36 232 C30 246 28 268 30 286 L40 290 L50 284 L52 234 Z
           M84 232 C90 246 92 268 90 286 L80 290 L70 284 L68 234 Z`,
    tpMarkers: [
      { id: 'TP1',
    region: 'cervical', view: 'back', cx: 32, cy: 260 },
      { id: 'TP2',
    region: 'cervical', view: 'back', cx: 38, cy: 260 },
      { id: 'TP1',
    region: 'cervical', view: 'back', cx: 88, cy: 260 },
      { id: 'TP2',
    region: 'cervical', view: 'back', cx: 82, cy: 260 },
    ],
  },

  // ── ANKLE ─────────────────────────────────────────────────────────────────

  {
    id: 'gastrocnemius',
    region: 'ankle',
    back: `M30 288 C26 302 24 318 26 330 L36 334 L42 330 L44 290 Z
           M90 288 C94 302 96 318 94 330 L84 334 L78 330 L76 290 Z`,
    tpMarkers: [
      { id: 'TP1',
    region: 'cervical', view: 'back', cx: 28, cy: 308 },
      { id: 'TP2',
    region: 'cervical', view: 'back', cx: 32, cy: 308 },
      { id: 'TP1',
    region: 'cervical', view: 'back', cx: 92, cy: 308 },
      { id: 'TP2',
    region: 'cervical', view: 'back', cx: 88, cy: 308 },
    ],
  },

  {
    id: 'soleus',
    region: 'ankle',
    back: `M26 316 C22 326 22 336 26 340 L36 340 L40 336 L40 318 Z
           M94 316 C98 326 98 336 94 340 L84 340 L80 336 L80 318 Z`,
    tpMarkers: [
      { id: 'TP1',
    region: 'cervical', view: 'back', cx: 26, cy: 328 },
      { id: 'TP1',
    region: 'cervical', view: 'back', cx: 94, cy: 328 },
    ],
  },

  {
    id: 'tibialis_anterior',
    region: 'ankle',
    front: `M32 258 C28 272 26 298 28 318 L36 320 L40 316 L40 260 Z
            M88 258 C92 272 94 298 92 318 L84 320 L80 316 L80 260 Z`,
    tpMarkers: [
      { id: 'TP1',
    region: 'cervical', view: 'front', cx: 30, cy: 288 },
      { id: 'TP1',
    region: 'cervical', view: 'front', cx: 90, cy: 288 },
    ],
  },

];

export function getMusclePathById(id: string): MusclePathData | undefined {
  return MUSCLE_PATHS.find(m => m.id === id);
}
