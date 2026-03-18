// Abu Dhabi Emirate - Cities, Areas, and Basins

export const CITIES = ['ABU_DHABI', 'AL_DHAFRA', 'AL_AIN', 'RIYADH'] as const;
export type City = (typeof CITIES)[number];

// Areas per city
export const CITY_AREAS: Record<City, string[]> = {
  ABU_DHABI: [
    'KHALIFA_CITY',
    'MOHAMMED_BIN_ZAYED_CITY',
    'SHAKHBOUT_CITY',
    'AL_SHAMKHA',
    'AL_RAHBA',
    'AL_WATHBA',
    'AL_FALAH',
    'BANIYAS',
    'AL_REEF',
    'AL_REEM_ISLAND',
    'SAADIYAT_ISLAND',
    'YAS_ISLAND',
    'AL_MAQTAA',
    'MASDAR_CITY',
    'AL_MUSHRIF',
    'AL_KARAMAH',
    'AL_BATEEN',
    'CORNICHE',
    'TOURIST_CLUB',
    'AL_NAHYAN',
    'AL_RAWDAH',
    'BETWEEN_TWO_BRIDGES',
    'OFFICERS_CITY',
    'ZAYED_MILITARY_CITY',
    'OTHER',
  ],
  AL_DHAFRA: [
    'MADINAT_ZAYED',
    'GHAYATHI',
    'LIWA',
    'RUWAIS',
    'SILA',
    'MIRFA',
    'DELMA_ISLAND',
    'OTHER',
  ],
  AL_AIN: [
    'AL_JIMI',
    'AL_TOWAYYA',
    'AL_MUTAWAA',
    'AL_MUWAIJI',
    'AL_KHABISI',
    'AL_MAQAM',
    'AL_SAROOJ',
    'ZAKHER',
    'AL_YAHAR',
    'REMAH',
    'SWEIHAN',
    'AL_FAQA',
    'NAHEL',
    'AL_HAYER',
    'MEZYAD',
    'AL_AIN_INDUSTRIAL',
    'OTHER',
  ],
  RIYADH: [
    'AL_OLAYA',
    'AL_MALAZ',
    'AL_MURABBA',
    'AL_NASEEM',
    'AL_RAWDAH_RIYADH',
    'AL_SULAIMANIYAH',
    'AL_WOROOD',
    'AL_NAKHEEL',
    'HITTIN',
    'AL_YASMIN',
    'AL_RAHMANIYAH',
    'AL_AQIQ',
    'AL_SAHAFAH',
    'AL_NARJIS',
    'IRQAH',
    'AL_DIRAH',
    'AL_BATHA',
    'AL_SHIFA',
    'AL_AZIZIYAH',
    'OTHER',
  ],
};

// Map SNAKE_CASE to camelCase translation keys
const snakeToCamel = (s: string) =>
  s.toLowerCase().replace(/_([a-z])/g, (_, c) => c.toUpperCase());

export const CITY_TRANSLATION_KEY: Record<City, string> = {
  ABU_DHABI: 'abuDhabi',
  AL_DHAFRA: 'alDhafra',
  AL_AIN: 'alAin',
  RIYADH: 'riyadh',
};

export const areaTranslationKey = (area: string) => snakeToCamel(area);
