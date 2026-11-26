/**
 * Short Swedish ursprung and fäste for the muscle modal.
 * Original wording from public-domain Gray's Anatomy (1918), checked against
 * a modern attachment list. Not a quotation. Source notes live in
 * muscle-attachment-sources.ts and are not imported by the site.
 */

export type MuscleAttachment = {
    origin: string;
    insertion: string;
};

export const MUSCLE_ATTACHMENTS: Record<string, MuscleAttachment> = {
    trapezius_desc: {
        origin: 'Linea nuchalis superior, protuberantia occipitalis externa och ligamentum nuchae.',
        insertion: 'Laterala tredjedelen av clavicula.'
    },
    trapezius_trans: {
        origin: 'Processus spinosus ungefär från C7 till de övre bröstkotorna.',
        insertion: 'Acromion och övre kanten av spina scapulae.'
    },
    trapezius_asc: {
        origin: 'Processus spinosus på de nedre bröstkotorna.',
        insertion: 'Mediala delen av spina scapulae, via en senplatta.'
    },
    sternocleidomastoideus: {
        origin: 'Manubrium sterni och mediala tredjedelen av clavicula.',
        insertion: 'Processus mastoideus och laterala delen av linea nuchalis superior.'
    },
    levator_scapulae: {
        origin: 'Processus transversus C1–C4.',
        insertion: 'Angulus superior scapulae och övre delen av margo medialis.'
    },
    scaleni: {
        origin: 'Tvärutskott på halskotorna. Anterior, medius och posterior tar inte samma utskott.',
        insertion: 'Costa 1 för scalenus anterior och medius. Costa 2 för scalenus posterior.'
    },
    suboccipitals: {
        origin: 'C1 och C2. Obliquus capitis inferior går bara mellan axis och atlas.',
        insertion: 'Occiput mellan linea nuchalis inferior och superior, utom obliquus capitis inferior som fäster på atlas.'
    },
    pectoralis_major: {
        origin: 'Mediala halvan av clavicula, sternum, de övre revbensbrosken och aponeurosen från obliquus externus.',
        insertion: 'Crista tuberculi majoris på humerus.'
    },
    pectoralis_minor: {
        origin: 'Costa 3–5, nära revbensbrosket.',
        insertion: 'Processus coracoideus.'
    },
    rhomboids: {
        origin: 'Ligamentum nuchae och processus spinosus C7–T5. Minor ligger högre, major lägre.',
        insertion: 'Margo medialis scapulae.'
    },
    serratus_anterior: {
        origin: 'Costa 1–8 eller 1–9, på bröstkorgens utsida.',
        insertion: 'Margo medialis scapulae, med tyngdpunkt mot angulus inferior.'
    },
    infraspinatus: {
        origin: 'Fossa infraspinata.',
        insertion: 'Tuberculum majus på humerus, mellersta facetten.'
    },
    subscapularis: {
        origin: 'Fossa subscapularis.',
        insertion: 'Tuberculum minus på humerus.'
    },
    deltoideus: {
        origin: 'Laterala tredjedelen av clavicula, acromion och spina scapulae.',
        insertion: 'Tuberositas deltoidea på humerus.'
    },
    erector_spinae: {
        origin: 'En gemensam sena från sacrum, crista iliaca och ländryggens taggutskott. Iliocostalis, longissimus och spinalis har sedan egna ursprung högre upp.',
        insertion: 'Revben, tvärutskott och, för de övre delarna, processus mastoideus. Inte ett enda gemensamt fäste.'
    },
    multifidus: {
        origin: 'Sacrum, bakre crista iliaca och tvär- eller mamillarutskott.',
        insertion: 'Processus spinosus två till fyra nivåer högre upp.'
    },
    quadratus_lumborum: {
        origin: 'Crista iliaca och ligamentum iliolumbale.',
        insertion: 'Costa 12 och processus transversus på ländkotorna.'
    },
    iliopsoas: {
        origin: 'Psoas major från ländkotornas kroppar, diskar och tvärutskott. Iliacus från fossa iliaca. Psoas minor ingår inte.',
        insertion: 'Trochanter minor.'
    },
    tensor_fasciae_latae: {
        origin: 'Spina iliaca anterior superior och främre delen av crista iliaca.',
        insertion: 'Tractus iliotibialis.'
    },
    gluteus_maximus: {
        origin: 'Ilium bakom linea glutea posterior, sacrum, coccyx och ligamentum sacrotuberale.',
        insertion: 'Tractus iliotibialis och tuberositas glutea på femur.'
    },
    gluteus_medius: {
        origin: 'Ilium mellan linea glutea anterior och posterior.',
        insertion: 'Laterala ytan av trochanter major.'
    },
    piriformis: {
        origin: 'Framsidan av sacrum.',
        insertion: 'Övre kanten av trochanter major.'
    },
    rectus_femoris: {
        origin: 'Spina iliaca anterior inferior och övre kanten av acetabulum.',
        insertion: 'Patella, och via ligamentum patellae till tuberositas tibiae.'
    },
    hamstrings: {
        origin: 'Tuber ischiadicum. Caput breve av biceps femoris är undantaget och kommer från linea aspera.',
        insertion: 'Caput fibulae för biceps femoris. Proximala mediala tibia för semitendinosus och semimembranosus.'
    },
    gastrocnemius: {
        origin: 'Ovanför den mediala kondylen på femur, och från den laterala kondylen.',
        insertion: 'Calcaneus, via tendo calcaneus.'
    },
    soleus: {
        origin: 'Caput fibulae, proximala fibula, linea solei på tibia och senbågen mellan benen.',
        insertion: 'Calcaneus, via tendo calcaneus.'
    },
    tibialis_anterior: {
        origin: 'Laterala tibia och membrana interossea.',
        insertion: 'Os cuneiforme mediale och basen av metatarsale 1.'
    },
    adductor_longus: {
        origin: 'Framsidan av corpus ossis pubis.',
        insertion: 'Mellersta tredjedelen av linea aspera.'
    },
    adductor_magnus: {
        origin: 'Adduktordelen från ramus ossis pubis och ramus ossis ischii. Den andra delen från tuber ischiadicum.',
        insertion: 'Linea aspera, och för delen från sittbenet tuberculum adductorium på femur.'
    },
    gracilis: {
        origin: 'Ramus inferior ossis pubis.',
        insertion: 'Proximala mediala tibia, i pes anserinus.'
    },
    peroneus_longus: {
        origin: 'Caput fibulae och proximala laterala fibula.',
        insertion: 'Plantart på os cuneiforme mediale och basen av metatarsale 1.'
    },
    peroneus_brevis: {
        origin: 'Distala laterala fibula.',
        insertion: 'Tuberositas på metatarsale 5.'
    },
    latissimus_dorsi: {
        origin: 'Processus spinosus från ungefär T7 och ned genom ländryggen, via fascia thoracolumbalis, samt crista iliaca och de nedre revbenen.',
        insertion: 'Sulcus intertubercularis på humerus.'
    },
    teres_major: {
        origin: 'Nedre delen av margo lateralis och angulus inferior scapulae.',
        insertion: 'Crista tuberculi minoris på humerus.'
    },
    teres_minor: {
        origin: 'Margo lateralis scapulae, ovanför teres major.',
        insertion: 'Tuberculum majus på humerus, nedre facetten.'
    },
    supraspinatus: {
        origin: 'Fossa supraspinata.',
        insertion: 'Tuberculum majus på humerus, övre facetten.'
    },
    gluteus_minimus: {
        origin: 'Ilium mellan linea glutea anterior och inferior.',
        insertion: 'Främre kanten av trochanter major.'
    },
    rectus_abdominis: {
        origin: 'Crista pubica och symphysis pubica.',
        insertion: 'Processus xiphoideus och cartilago costalis 5–7.'
    },
    vastus_lateralis: {
        origin: 'Trochanter major och laterala läppen av linea aspera.',
        insertion: 'Patella, och via ligamentum patellae till tuberositas tibiae.'
    },
    vastus_medialis: {
        origin: 'Linea intertrochanterica och mediala läppen av linea aspera.',
        insertion: 'Patella, och via ligamentum patellae till tuberositas tibiae.'
    },
    biceps_brachii: {
        origin: 'Caput longum från tuberculum supraglenoidale. Caput breve från processus coracoideus.',
        insertion: 'Tuberositas radii och, via aponeurosis bicipitalis, underarmsfascian.'
    },
    triceps_brachii: {
        origin: 'Caput longum från tuberculum infraglenoidale. Caput laterale och caput mediale från humerus baksida, på var sin sida om sulcus nervi radialis.',
        insertion: 'Olecranon.'
    },
    external_oblique: {
        origin: 'Utsidan av costa 5–12.',
        insertion: 'Crista iliaca, linea alba och ligamentum inguinale.'
    },
    forearm_flexors: {
        origin: 'De ytliga musklerna från epicondylus medialis. De djupare från radius, ulna och membrana interossea.',
        insertion: 'Handlovsben, metakarpalben eller falanger, beroende på muskel.'
    },
    forearm_extensors: {
        origin: 'De ytliga musklerna från epicondylus lateralis. De djupare från underarmens ben och membrana interossea.',
        insertion: 'Metakarpalben eller falanger, beroende på muskel.'
    },
    masseter: {
        origin: 'Arcus zygomaticus.',
        insertion: 'Laterala ytan av ramus och angulus mandibulae.'
    },
    temporalis: {
        origin: 'Fossa temporalis och fascia temporalis.',
        insertion: 'Processus coronoideus och främre kanten av ramus mandibulae.'
    },
    lateral_pterygoid: {
        origin: 'Övre huvudet från ala major ossis sphenoidalis. Nedre huvudet från lamina lateralis på processus pterygoideus.',
        insertion: 'Collum mandibulae. Övre huvudet även i käkledens kapsel och disk.'
    },
    medial_pterygoid: {
        origin: 'Fossa pterygoidea och tuber maxillae.',
        insertion: 'Mediala ytan av ramus och angulus mandibulae.'
    },
    sartorius: {
        origin: 'Spina iliaca anterior superior.',
        insertion: 'Proximala mediala tibia, i pes anserinus.'
    },
    splenius_capitis: {
        origin: 'Ligamentum nuchae och taggutskott i nedre halsryggen och övre bröstryggen.',
        insertion: 'Processus mastoideus och linea nuchalis superior.'
    },
    splenius_cervicis: {
        origin: 'Taggutskott i övre bröstryggen.',
        insertion: 'Tvärutskott på de övre halskotorna.'
    },
    semispinalis_capitis: {
        origin: 'Tvärutskott i nedre halsryggen och övre bröstryggen.',
        insertion: 'Occiput, mellan linea nuchalis superior och inferior.'
    },
    semispinalis_cervicis: {
        origin: 'Tvärutskott i övre bröstryggen.',
        insertion: 'Processus spinosus C2–C5, med tyngdpunkt på axis.'
    },
    deep_neck_flexors: {
        origin: 'Longus colli mellan kotkroppar och tvärutskott i hals- och övre bröstryggen. Longus capitis från tvärutskott på de mellersta halskotorna.',
        insertion: 'Longus colli på halskotor. Longus capitis på basala occiput.'
    },
    coracobrachialis: {
        origin: 'Processus coracoideus.',
        insertion: 'Medialsidan av humerus, ungefär mitt på skaftet.'
    },
    brachialis: {
        origin: 'Distala framsidan av humerus.',
        insertion: 'Tuberositas ulnae och processus coronoideus.'
    },
    brachioradialis: {
        origin: 'Crista supracondylaris lateralis på humerus.',
        insertion: 'Distala radius, proximalt om processus styloideus.'
    },
    pronator_teres: {
        origin: 'Epicondylus medialis och processus coronoideus på ulna.',
        insertion: 'Laterala mittpartiet av radius.'
    },
    pronator_quadratus: {
        origin: 'Distala framsidan av ulna.',
        insertion: 'Distala framsidan av radius.'
    },
    supinator: {
        origin: 'Epicondylus lateralis, ligament runt caput radii och crista supinatoris på ulna.',
        insertion: 'Proximala tredjedelen av radius.'
    },
    flexor_carpi_radialis: {
        origin: 'Epicondylus medialis.',
        insertion: 'Basen av metacarpale 2. Ett utskott till metacarpale 3 är vanligt.'
    },
    flexor_carpi_ulnaris: {
        origin: 'Epicondylus medialis samt olecranon och proximala bakre ulna.',
        insertion: 'Os pisiforme, och därifrån till hamatum och metacarpale 5.'
    },
    extensor_carpi_radialis_longus: {
        origin: 'Crista supracondylaris lateralis på humerus.',
        insertion: 'Dorsal bas av metacarpale 2.'
    },
    extensor_carpi_ulnaris: {
        origin: 'Epicondylus lateralis och bakre kanten av ulna.',
        insertion: 'Basen av metacarpale 5.'
    },
    internal_oblique: {
        origin: 'Fascia thoracolumbalis, crista iliaca och ligamentum inguinale.',
        insertion: 'De nedre revbenen, linea alba och den nedre senplattan mot pubis.'
    },
    transversus_abdominis: {
        origin: 'Insidan av de nedre revbenen, fascia thoracolumbalis, crista iliaca och ligamentum inguinale.',
        insertion: 'Linea alba och den nedre senplattan mot pubis.'
    },
    tibialis_posterior: {
        origin: 'Baksidan av tibia och fibula samt membrana interossea.',
        insertion: 'Os naviculare och närliggande ben i mellanfoten. De små distala utskotten varierar.'
    },
    extensor_digitorum_longus: {
        origin: 'Laterala tibiakondylen, fibula och membrana interossea.',
        insertion: 'Dorsalaponeuroserna till tå 2–5.'
    },
    extensor_hallucis_longus: {
        origin: 'Fibula och membrana interossea.',
        insertion: 'Distala falangen på stortån.'
    }
};
