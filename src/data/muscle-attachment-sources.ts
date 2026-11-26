/**
 * Not imported by the site. One note per id in MUSCLE_ATTACHMENTS.
 * Base: Gray's Anatomy, 1918 (public domain). Cross-check: a modern
 * attachment list (Moore-level), not quoted.
 */

export const ATTACHMENT_SOURCES: Record<string, string> = {
    trapezius_desc:
        'Gray: övre fibrer från occiput, linea nuchalis och ligamentum nuchae till laterala clavicula. Delningen i tre pars är en undervisningsindelning.',
    trapezius_trans:
        'Gray: mellersta fibrer från C7 och övre bröstkotor till acromion och spina scapulae. Kotgränsen mot pars ascendens är inte skarp.',
    trapezius_asc:
        'Gray: nedre fibrer från nedre bröstkotor till spina scapulae via en aponeuros. Exakt kotnivå är en konvention.',
    sternocleidomastoideus:
        'Gray: manubrium och mediala clavicula till mastoid och laterala linea nuchalis superior. Stabilt.',
    levator_scapulae: 'Gray: processus transversus C1–C4 till angulus superior scapulae. Stabilt.',
    scaleni:
        'Gray: anterior C3–C6 till costa 1, medius C2–C7 till costa 1, posterior ungefär C4–C6 till costa 2. Texten sammanfattar gruppen.',
    suboccipitals:
        'Gray: rectus major/minor och obliquus superior når occiput. Obliquus inferior går bara C2–C1. Texten säger det.',
    pectoralis_major:
        'Gray: mediala clavicula, sternum, övre revbensbrosk och obliquus-aponeuros till crista tuberculi majoris. Antalet brosk varierar.',
    pectoralis_minor: 'Gray: costa 3–5 till processus coracoideus. Varianten 2–4 är vanlig och inte vald här.',
    rhomboids:
        'Gray: minor ungefär C7–T1, major ungefär T2–T5, båda till margo medialis. Texten ger spannet.',
    serratus_anterior: 'Gray: övre åtta eller nio revben till margo medialis, tyngst mot angulus inferior.',
    infraspinatus: 'Gray: fossa infraspinata till mellersta facetten på tuberculum majus. Stabilt.',
    subscapularis: 'Gray: fossa subscapularis till tuberculum minus. Stabilt.',
    deltoideus:
        'Gray: laterala tredjedelen av clavicula, acromion och spina scapulae till tuberositas deltoidea. Stabilt.',
    erector_spinae:
        'Gray: gemensam sena från sacrum, crista iliaca och ländryggens taggutskott. Iliocostalis, longissimus och spinalis fäster olika. Texten är en gruppmening.',
    multifidus:
        'Gray: sacrum, ilium och utskott till taggutskott flera nivåer högre. Nivåerna varierar. Kort gruppmening.',
    quadratus_lumborum:
        'Gray: crista iliaca och ligamentum iliolumbale till costa 12 och ländkotornas tvärutskott. Vilken ände som kallas ursprung beror på funktion. Texten följer Gray.',
    iliopsoas:
        'Gray: psoas major från ländkotor och diskar, iliacus från fossa iliaca, båda till trochanter minor. Psoas minor är utelämnad.',
    tensor_fasciae_latae:
        'Gray: SIAS och främre crista iliaca till tractus iliotibialis. Inget direkt benfäste på tibia.',
    gluteus_maximus:
        'Gray: ilium bakom linea glutea posterior, sacrum, coccyx och ligamentum sacrotuberale till tractus iliotibialis och tuberositas glutea. Stabilt.',
    gluteus_medius: 'Gray: mellan linea glutea anterior och posterior till laterala trochanter major. Stabilt.',
    piriformis: 'Gray: främre sacrum till övre trochanter major. Stabilt.',
    rectus_femoris:
        'Gray: rakt huvud från spina iliaca anterior inferior och reflekterat huvud från acetabulums övre kant, till patella och tuberositas tibiae. Stabilt.',
    hamstrings:
        'Gray: tuber ischiadicum till caput fibulae eller mediala tibia. Caput breve av biceps femoris kommer från linea aspera. Det undantaget står i texten.',
    gastrocnemius:
        'Gray: medialt huvud ovanför mediala kondylen, lateralt huvud från laterala kondylen, till calcaneus via tendo calcaneus. Stabilt.',
    soleus:
        'Gray: caput fibulae, proximala fibula, linea solei och senbågen, till calcaneus via samma sena. Stabilt.',
    tibialis_anterior:
        'Gray: laterala tibia och membrana interossea till os cuneiforme mediale och metatarsale 1. Stabilt.',
    adductor_longus: 'Gray: corpus ossis pubis till mellersta linea aspera. Stabilt.',
    adductor_magnus:
        'Gray: adduktordel från ramus pubis/ischii till linea aspera, extensordel från tuber ischiadicum till tuberculum adductorium. Båda delarna är med.',
    gracilis: 'Gray: ramus inferior ossis pubis till pes anserinus. Stabilt.',
    peroneus_longus:
        'Gray: caput och proximala laterala fibula till plantara cuneiforme mediale och metatarsale 1. Stabilt.',
    peroneus_brevis: 'Gray: distala laterala fibula till tuberositas på metatarsale 5. Stabilt.',
    latissimus_dorsi:
        'Gray: taggutskott från ungefär T7, fascia thoracolumbalis, crista iliaca och nedre revben till sulcus intertubercularis. Ett ursprung från angulus inferior scapulae är vanligt men inte konstant och är utelämnat.',
    teres_major: 'Gray: nedre margo lateralis och angulus inferior till crista tuberculi minoris. Stabilt.',
    teres_minor: 'Gray: margo lateralis ovanför teres major till nedre facetten på tuberculum majus. Stabilt.',
    supraspinatus: 'Gray: fossa supraspinata till övre facetten på tuberculum majus. Stabilt.',
    gluteus_minimus: 'Gray: mellan linea glutea anterior och inferior till främre trochanter major. Stabilt.',
    rectus_abdominis: 'Gray: crista pubica och symfysen till processus xiphoideus och cartilago costalis 5–7. Stabilt.',
    vastus_lateralis:
        'Gray: trochanter major och laterala linea aspera till patella och tuberositas tibiae. Stabilt.',
    vastus_medialis:
        'Gray: linea intertrochanterica och mediala linea aspera till patella och tuberositas tibiae. Stabilt.',
    biceps_brachii:
        'Gray: tuberculum supraglenoidale och processus coracoideus till tuberositas radii och aponeurosis bicipitalis. Stabilt.',
    triceps_brachii:
        'Gray: tuberculum infraglenoidale samt humerus ovanför och nedanför sulcus nervi radialis, till olecranon. Stabilt.',
    external_oblique: 'Gray: utsidan av costa 5–12 till crista iliaca, linea alba och ligamentum inguinale. Stabilt.',
    forearm_flexors:
        'Gray, som grupp: ytliga från epicondylus medialis, djupa från underarmsbenen. Fästena skiljer sig. Ingen lista över varje muskel.',
    forearm_extensors:
        'Gray, som grupp: ytliga från epicondylus lateralis, djupa från underarmsbenen. Fästena skiljer sig. Ingen lista över varje muskel.',
    masseter: 'Gray: arcus zygomaticus till laterala ramus och angulus. Ytlig och djup del skiljer sig lite. Texten tar båda.',
    temporalis: 'Gray: fossa temporalis och fascian till processus coronoideus och främre ramus. Stabilt.',
    lateral_pterygoid:
        'Gray: övre huvud från sphenoid till disk och kapsel, nedre huvud från lamina lateralis till collum mandibulae. Diskfästet är med.',
    medial_pterygoid: 'Gray: fossa pterygoidea och tuber maxillae till mediala ramus och angulus. Stabilt.',
    sartorius: 'Gray: spina iliaca anterior superior till pes anserinus. Stabilt.',
    splenius_capitis:
        'Gray: ligamentum nuchae och taggutskott ungefär C7–T3/T4 till mastoid och linea nuchalis. Övre bröstnivå varierar, därför utan exakt siffra.',
    splenius_cervicis:
        'Gray: taggutskott ungefär T3–T6 till tvärutskott C1–C3. Nivåerna varierar, därför utan exakt siffra.',
    semispinalis_capitis:
        'Gray: tvärutskott i nedre hals- och övre bröstrygg, och ledutskott, till occiput mellan nacklinjerna. Kortad.',
    semispinalis_cervicis: 'Gray: övre bröstkotors tvärutskott till taggutskott C2–C5, tyngst på axis. Stabilt nog för en kort mening.',
    deep_neck_flexors:
        'Gray: longus colli stannar på halskotorna, longus capitis går till basala occiput. Texten skiljer dem.',
    coracobrachialis: 'Gray: processus coracoideus till mediala mitten av humerus. Stabilt.',
    brachialis: 'Gray: distala framsidan av humerus till tuberositas ulnae och processus coronoideus. Stabilt.',
    brachioradialis: 'Gray: crista supracondylaris lateralis till distala radius. Stabilt.',
    pronator_teres: 'Gray: epicondylus medialis och processus coronoideus till laterala mitt-radius. Stabilt.',
    pronator_quadratus: 'Gray: distala främre ulna till distala främre radius. Stabilt.',
    supinator:
        'Gray: epicondylus lateralis, radiala ligament och crista supinatoris till proximala radius. Stabilt.',
    flexor_carpi_radialis:
        'Gray: epicondylus medialis till basen av metacarpale 2. Ett utskott till metacarpale 3 är vanligt och står som sådant.',
    flexor_carpi_ulnaris:
        'Gray: epicondylus medialis och proximala ulna till os pisiforme, hamatum och metacarpale 5. Stabilt.',
    extensor_carpi_radialis_longus: 'Gray: crista supracondylaris lateralis till dorsala basen av metacarpale 2. Stabilt.',
    extensor_carpi_ulnaris: 'Gray: epicondylus lateralis och bakre ulna till metacarpale 5. Stabilt.',
    internal_oblique:
        'Gray: fascia thoracolumbalis, crista iliaca och ligamentum inguinale till nedre revben, linea alba och senplattan mot pubis. Antalet revben är inte preciserat.',
    transversus_abdominis:
        'Gray: insidan av nedre revben, fascia thoracolumbalis, crista iliaca och ligamentum inguinale till linea alba och senplattan mot pubis. Inte valbar på figuren, med för fullständighet.',
    tibialis_posterior:
        'Gray: bakre tibia, fibula och membrana interossea. Huvudfäste os naviculare. Distala utskott till cuneiforme och metatarsalben varierar och är inte uppräknade.',
    extensor_digitorum_longus:
        'Gray: laterala tibiakondylen, fibula och membrana interossea till dorsalaponeuroserna på tå 2–5. Stabilt.',
    extensor_hallucis_longus: 'Gray: fibula och membrana interossea till distala falangen på stortån. Stabilt.'
};
