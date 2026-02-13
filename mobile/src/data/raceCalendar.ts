/**
 * HYROX Race Calendar — Complete 2025/26 season.
 * Sources: hyrox.com, roxradar.com, hellohyrox.com (verified Feb 2026)
 */

export type RaceRegion = 'north_america' | 'europe' | 'asia_pacific' | 'south_america';
export type RaceStatus = 'confirmed' | 'tbd';

export interface HyroxRace {
  id: string;
  city: string;
  country: string;
  region: RaceRegion;
  date: string | null;       // ISO 'YYYY-MM-DD', null = TBD
  dateEnd: string | null;    // Multi-day events
  status: RaceStatus;
  label: string;
  specialDesignation: string | null;
}

export const RACE_REGIONS: Record<RaceRegion, string> = {
  north_america: 'North America',
  europe: 'Europe',
  asia_pacific: 'Asia Pacific',
  south_america: 'South America',
};

export const RACE_CALENDAR: HyroxRace[] = [
  // ═══════════════════════════════════════════════════════════
  // NORTH AMERICA — USA
  // ═══════════════════════════════════════════════════════════
  {
    id: 'boston-2025',
    city: 'Boston',
    country: 'USA',
    region: 'north_america',
    date: '2025-09-26',
    dateEnd: '2025-09-28',
    status: 'confirmed',
    label: 'HYROX Boston',
    specialDesignation: null,
  },
  {
    id: 'atlanta-2025',
    city: 'Atlanta',
    country: 'USA',
    region: 'north_america',
    date: '2025-10-31',
    dateEnd: '2025-11-02',
    status: 'confirmed',
    label: 'HYROX Atlanta',
    specialDesignation: null,
  },
  {
    id: 'chicago-2025',
    city: 'Chicago',
    country: 'USA',
    region: 'north_america',
    date: '2025-11-14',
    dateEnd: '2025-11-16',
    status: 'confirmed',
    label: 'HYROX Chicago',
    specialDesignation: null,
  },
  {
    id: 'dallas-2025',
    city: 'Dallas',
    country: 'USA',
    region: 'north_america',
    date: '2025-11-21',
    dateEnd: '2025-11-23',
    status: 'confirmed',
    label: 'HYROX Dallas',
    specialDesignation: null,
  },
  {
    id: 'anaheim-2025',
    city: 'Anaheim',
    country: 'USA',
    region: 'north_america',
    date: '2025-12-12',
    dateEnd: '2025-12-14',
    status: 'confirmed',
    label: 'HYROX Anaheim',
    specialDesignation: null,
  },
  {
    id: 'phoenix-2026',
    city: 'Phoenix',
    country: 'USA',
    region: 'north_america',
    date: '2026-01-29',
    dateEnd: '2026-02-01',
    status: 'confirmed',
    label: 'HYROX Phoenix',
    specialDesignation: 'Elite 15 Major',
  },
  {
    id: 'las-vegas-2026',
    city: 'Las Vegas',
    country: 'USA',
    region: 'north_america',
    date: '2026-02-20',
    dateEnd: '2026-02-22',
    status: 'confirmed',
    label: 'HYROX Las Vegas',
    specialDesignation: null,
  },
  {
    id: 'dc-2026',
    city: 'Washington D.C.',
    country: 'USA',
    region: 'north_america',
    date: '2026-03-07',
    dateEnd: '2026-03-08',
    status: 'confirmed',
    label: 'HYROX D.C.',
    specialDesignation: 'Americas Regional',
  },
  {
    id: 'houston-2026',
    city: 'Houston',
    country: 'USA',
    region: 'north_america',
    date: '2026-03-26',
    dateEnd: '2026-03-29',
    status: 'confirmed',
    label: 'HYROX Houston',
    specialDesignation: null,
  },
  {
    id: 'miami-2026',
    city: 'Miami Beach',
    country: 'USA',
    region: 'north_america',
    date: '2026-04-03',
    dateEnd: '2026-04-05',
    status: 'confirmed',
    label: 'HYROX Miami Beach',
    specialDesignation: null,
  },
  {
    id: 'nyc-2026',
    city: 'New York City',
    country: 'USA',
    region: 'north_america',
    date: '2026-05-28',
    dateEnd: '2026-06-07',
    status: 'confirmed',
    label: 'HYROX NYC',
    specialDesignation: null,
  },

  // ═══════════════════════════════════════════════════════════
  // NORTH AMERICA — Canada
  // ═══════════════════════════════════════════════════════════
  {
    id: 'toronto-2025',
    city: 'Toronto',
    country: 'Canada',
    region: 'north_america',
    date: '2025-10-03',
    dateEnd: '2025-10-05',
    status: 'confirmed',
    label: 'HYROX Toronto',
    specialDesignation: null,
  },
  {
    id: 'vancouver-2025',
    city: 'Vancouver',
    country: 'Canada',
    region: 'north_america',
    date: '2025-12-20',
    dateEnd: '2025-12-21',
    status: 'confirmed',
    label: 'HYROX Vancouver',
    specialDesignation: null,
  },
  {
    id: 'ottawa-2026',
    city: 'Ottawa',
    country: 'Canada',
    region: 'north_america',
    date: '2026-05-16',
    dateEnd: '2026-05-17',
    status: 'confirmed',
    label: 'HYROX Ottawa',
    specialDesignation: null,
  },

  // ═══════════════════════════════════════════════════════════
  // EUROPE — Germany
  // ═══════════════════════════════════════════════════════════
  {
    id: 'hamburg-2025',
    city: 'Hamburg',
    country: 'Germany',
    region: 'europe',
    date: '2025-10-02',
    dateEnd: '2025-10-05',
    status: 'confirmed',
    label: 'HYROX Hamburg',
    specialDesignation: 'Elite 15 Major',
  },
  {
    id: 'stuttgart-2025',
    city: 'Stuttgart',
    country: 'Germany',
    region: 'europe',
    date: '2025-10-31',
    dateEnd: '2025-11-02',
    status: 'confirmed',
    label: 'HYROX Stuttgart',
    specialDesignation: null,
  },
  {
    id: 'frankfurt-2025',
    city: 'Frankfurt',
    country: 'Germany',
    region: 'europe',
    date: '2025-12-12',
    dateEnd: '2025-12-14',
    status: 'confirmed',
    label: 'HYROX Frankfurt',
    specialDesignation: null,
  },
  {
    id: 'cologne-2026',
    city: 'Cologne',
    country: 'Germany',
    region: 'europe',
    date: '2026-04-16',
    dateEnd: '2026-04-19',
    status: 'confirmed',
    label: 'HYROX Cologne',
    specialDesignation: null,
  },
  {
    id: 'berlin-2026',
    city: 'Berlin',
    country: 'Germany',
    region: 'europe',
    date: '2026-05-22',
    dateEnd: '2026-05-31',
    status: 'confirmed',
    label: 'HYROX Berlin',
    specialDesignation: null,
  },

  // ═══════════════════════════════════════════════════════════
  // EUROPE — France
  // ═══════════════════════════════════════════════════════════
  {
    id: 'paris-expo-2025',
    city: 'Paris',
    country: 'France',
    region: 'europe',
    date: '2025-10-22',
    dateEnd: '2025-10-26',
    status: 'confirmed',
    label: 'HYROX Paris (Expo)',
    specialDesignation: null,
  },
  {
    id: 'bordeaux-2025',
    city: 'Bordeaux',
    country: 'France',
    region: 'europe',
    date: '2025-11-20',
    dateEnd: '2025-11-23',
    status: 'confirmed',
    label: 'HYROX Bordeaux',
    specialDesignation: null,
  },
  {
    id: 'nice-2026',
    city: 'Nice',
    country: 'France',
    region: 'europe',
    date: '2026-02-12',
    dateEnd: '2026-02-15',
    status: 'confirmed',
    label: 'HYROX Nice',
    specialDesignation: null,
  },
  {
    id: 'toulouse-2026',
    city: 'Toulouse',
    country: 'France',
    region: 'europe',
    date: '2026-03-19',
    dateEnd: '2026-03-22',
    status: 'confirmed',
    label: 'HYROX Toulouse',
    specialDesignation: null,
  },
  {
    id: 'paris-gp-2026',
    city: 'Paris',
    country: 'France',
    region: 'europe',
    date: '2026-04-23',
    dateEnd: '2026-04-26',
    status: 'confirmed',
    label: 'HYROX Paris (Grand Palais)',
    specialDesignation: null,
  },
  {
    id: 'lyon-2026',
    city: 'Lyon',
    country: 'France',
    region: 'europe',
    date: '2026-05-20',
    dateEnd: '2026-05-24',
    status: 'confirmed',
    label: 'HYROX Lyon',
    specialDesignation: null,
  },

  // ═══════════════════════════════════════════════════════════
  // EUROPE — UK & Ireland
  // ═══════════════════════════════════════════════════════════
  {
    id: 'birmingham-2025',
    city: 'Birmingham',
    country: 'UK',
    region: 'europe',
    date: '2025-10-22',
    dateEnd: '2025-10-26',
    status: 'confirmed',
    label: 'HYROX Birmingham',
    specialDesignation: null,
  },
  {
    id: 'dublin-2025',
    city: 'Dublin',
    country: 'Ireland',
    region: 'europe',
    date: '2025-11-13',
    dateEnd: '2025-11-16',
    status: 'confirmed',
    label: 'HYROX Dublin',
    specialDesignation: null,
  },
  {
    id: 'london-excel-2025',
    city: 'London',
    country: 'UK',
    region: 'europe',
    date: '2025-12-04',
    dateEnd: '2025-12-07',
    status: 'confirmed',
    label: 'HYROX London (ExCeL)',
    specialDesignation: null,
  },
  {
    id: 'manchester-2026',
    city: 'Manchester',
    country: 'UK',
    region: 'europe',
    date: '2026-01-21',
    dateEnd: '2026-01-25',
    status: 'confirmed',
    label: 'HYROX Manchester',
    specialDesignation: null,
  },
  {
    id: 'glasgow-2026',
    city: 'Glasgow',
    country: 'UK',
    region: 'europe',
    date: '2026-03-11',
    dateEnd: '2026-03-15',
    status: 'confirmed',
    label: 'HYROX Glasgow',
    specialDesignation: null,
  },
  {
    id: 'london-emea-2026',
    city: 'London',
    country: 'UK',
    region: 'europe',
    date: '2026-03-20',
    dateEnd: '2026-03-22',
    status: 'confirmed',
    label: 'HYROX London (Olympia)',
    specialDesignation: 'EMEA Regional',
  },
  {
    id: 'cardiff-2026',
    city: 'Cardiff',
    country: 'Wales',
    region: 'europe',
    date: '2026-04-29',
    dateEnd: '2026-05-04',
    status: 'confirmed',
    label: 'HYROX Cardiff',
    specialDesignation: null,
  },

  // ═══════════════════════════════════════════════════════════
  // EUROPE — Italy
  // ═══════════════════════════════════════════════════════════
  {
    id: 'verona-2025',
    city: 'Verona',
    country: 'Italy',
    region: 'europe',
    date: '2025-12-05',
    dateEnd: '2025-12-07',
    status: 'confirmed',
    label: 'HYROX Verona',
    specialDesignation: null,
  },
  {
    id: 'turin-2026',
    city: 'Turin',
    country: 'Italy',
    region: 'europe',
    date: '2026-01-30',
    dateEnd: '2026-02-01',
    status: 'confirmed',
    label: 'HYROX Turin',
    specialDesignation: null,
  },
  {
    id: 'bologna-2026',
    city: 'Bologna',
    country: 'Italy',
    region: 'europe',
    date: '2026-04-04',
    dateEnd: '2026-04-05',
    status: 'confirmed',
    label: 'HYROX Bologna',
    specialDesignation: null,
  },
  {
    id: 'rimini-2026',
    city: 'Rimini',
    country: 'Italy',
    region: 'europe',
    date: '2026-05-29',
    dateEnd: '2026-05-31',
    status: 'confirmed',
    label: 'HYROX Rimini',
    specialDesignation: null,
  },

  // ═══════════════════════════════════════════════════════════
  // EUROPE — Spain
  // ═══════════════════════════════════════════════════════════
  {
    id: 'valencia-2025',
    city: 'Valencia',
    country: 'Spain',
    region: 'europe',
    date: '2025-10-17',
    dateEnd: '2025-10-19',
    status: 'confirmed',
    label: 'HYROX Valencia',
    specialDesignation: null,
  },
  {
    id: 'madrid-2025',
    city: 'Madrid',
    country: 'Spain',
    region: 'europe',
    date: '2025-11-27',
    dateEnd: '2025-11-30',
    status: 'confirmed',
    label: 'HYROX Madrid',
    specialDesignation: null,
  },
  {
    id: 'bilbao-2026',
    city: 'Bilbao',
    country: 'Spain',
    region: 'europe',
    date: '2026-02-07',
    dateEnd: '2026-02-08',
    status: 'confirmed',
    label: 'HYROX Bilbao',
    specialDesignation: null,
  },
  {
    id: 'malaga-2026',
    city: 'Málaga',
    country: 'Spain',
    region: 'europe',
    date: '2026-04-16',
    dateEnd: '2026-04-19',
    status: 'confirmed',
    label: 'HYROX Málaga',
    specialDesignation: null,
  },
  {
    id: 'barcelona-2026',
    city: 'Barcelona',
    country: 'Spain',
    region: 'europe',
    date: '2026-05-14',
    dateEnd: '2026-05-17',
    status: 'confirmed',
    label: 'HYROX Barcelona',
    specialDesignation: null,
  },

  // ═══════════════════════════════════════════════════════════
  // EUROPE — Belgium
  // ═══════════════════════════════════════════════════════════
  {
    id: 'gent-2025',
    city: 'Gent',
    country: 'Belgium',
    region: 'europe',
    date: '2025-12-12',
    dateEnd: '2025-12-14',
    status: 'confirmed',
    label: 'HYROX Gent',
    specialDesignation: null,
  },
  {
    id: 'mechelen-2026',
    city: 'Mechelen',
    country: 'Belgium',
    region: 'europe',
    date: '2026-03-26',
    dateEnd: '2026-03-29',
    status: 'confirmed',
    label: 'HYROX Mechelen',
    specialDesignation: null,
  },

  // ═══════════════════════════════════════════════════════════
  // EUROPE — Netherlands
  // ═══════════════════════════════════════════════════════════
  {
    id: 'utrecht-2025',
    city: 'Utrecht',
    country: 'Netherlands',
    region: 'europe',
    date: '2025-11-28',
    dateEnd: '2025-11-30',
    status: 'confirmed',
    label: 'HYROX Utrecht',
    specialDesignation: null,
  },
  {
    id: 'amsterdam-2026',
    city: 'Amsterdam',
    country: 'Netherlands',
    region: 'europe',
    date: '2026-01-21',
    dateEnd: '2026-01-25',
    status: 'confirmed',
    label: 'HYROX Amsterdam',
    specialDesignation: null,
  },
  {
    id: 'rotterdam-2026',
    city: 'Rotterdam',
    country: 'Netherlands',
    region: 'europe',
    date: '2026-04-15',
    dateEnd: '2026-04-19',
    status: 'confirmed',
    label: 'HYROX Rotterdam',
    specialDesignation: null,
  },
  {
    id: 'heerenveen-2026',
    city: 'Heerenveen',
    country: 'Netherlands',
    region: 'europe',
    date: '2026-05-14',
    dateEnd: '2026-05-17',
    status: 'confirmed',
    label: 'HYROX Heerenveen',
    specialDesignation: null,
  },

  // ═══════════════════════════════════════════════════════════
  // EUROPE — Poland
  // ═══════════════════════════════════════════════════════════
  {
    id: 'poznan-2025',
    city: 'Poznan',
    country: 'Poland',
    region: 'europe',
    date: '2025-12-13',
    dateEnd: '2025-12-14',
    status: 'confirmed',
    label: 'HYROX Poznan',
    specialDesignation: null,
  },
  {
    id: 'katowice-2026',
    city: 'Katowice',
    country: 'Poland',
    region: 'europe',
    date: '2026-02-21',
    dateEnd: '2026-02-22',
    status: 'confirmed',
    label: 'HYROX Katowice',
    specialDesignation: null,
  },
  {
    id: 'warsaw-2026',
    city: 'Warsaw',
    country: 'Poland',
    region: 'europe',
    date: '2026-04-16',
    dateEnd: '2026-04-19',
    status: 'confirmed',
    label: 'HYROX Warsaw',
    specialDesignation: 'Elite 15 Major',
  },

  // ═══════════════════════════════════════════════════════════
  // EUROPE — Nordics, Baltics & Others
  // ═══════════════════════════════════════════════════════════
  {
    id: 'stockholm-2025',
    city: 'Stockholm',
    country: 'Sweden',
    region: 'europe',
    date: '2025-12-19',
    dateEnd: '2025-12-21',
    status: 'confirmed',
    label: 'HYROX Stockholm',
    specialDesignation: null,
  },
  {
    id: 'st-gallen-2026',
    city: 'St Gallen',
    country: 'Switzerland',
    region: 'europe',
    date: '2026-01-16',
    dateEnd: '2026-01-18',
    status: 'confirmed',
    label: 'HYROX St Gallen',
    specialDesignation: null,
  },
  {
    id: 'vienna-2026',
    city: 'Vienna',
    country: 'Austria',
    region: 'europe',
    date: '2026-02-06',
    dateEnd: '2026-02-08',
    status: 'confirmed',
    label: 'HYROX Vienna',
    specialDesignation: null,
  },
  {
    id: 'copenhagen-2026',
    city: 'Copenhagen',
    country: 'Denmark',
    region: 'europe',
    date: '2026-03-13',
    dateEnd: '2026-03-15',
    status: 'confirmed',
    label: 'HYROX Copenhagen',
    specialDesignation: null,
  },
  {
    id: 'lisbon-2026',
    city: 'Lisbon',
    country: 'Portugal',
    region: 'europe',
    date: '2026-05-01',
    dateEnd: '2026-05-03',
    status: 'confirmed',
    label: 'HYROX Lisbon',
    specialDesignation: null,
  },
  {
    id: 'helsinki-2026',
    city: 'Helsinki',
    country: 'Finland',
    region: 'europe',
    date: '2026-05-09',
    dateEnd: '2026-05-10',
    status: 'confirmed',
    label: 'HYROX Helsinki',
    specialDesignation: null,
  },
  {
    id: 'riga-2026',
    city: 'Riga',
    country: 'Latvia',
    region: 'europe',
    date: '2026-05-30',
    dateEnd: '2026-05-31',
    status: 'confirmed',
    label: 'HYROX Riga',
    specialDesignation: null,
  },
  {
    id: 'stockholm-wc-2026',
    city: 'Stockholm',
    country: 'Sweden',
    region: 'europe',
    date: '2026-06-18',
    dateEnd: '2026-06-21',
    status: 'confirmed',
    label: 'HYROX Stockholm',
    specialDesignation: 'World Championships',
  },

  // ═══════════════════════════════════════════════════════════
  // ASIA PACIFIC — Australia & NZ
  // ═══════════════════════════════════════════════════════════
  {
    id: 'perth-2025',
    city: 'Perth',
    country: 'Australia',
    region: 'asia_pacific',
    date: '2025-09-05',
    dateEnd: '2025-09-07',
    status: 'confirmed',
    label: 'HYROX Perth',
    specialDesignation: null,
  },
  {
    id: 'melbourne-2025',
    city: 'Melbourne',
    country: 'Australia',
    region: 'asia_pacific',
    date: '2025-12-11',
    dateEnd: '2025-12-14',
    status: 'confirmed',
    label: 'HYROX Melbourne',
    specialDesignation: 'Elite 15 Major',
  },
  {
    id: 'auckland-2026',
    city: 'Auckland',
    country: 'New Zealand',
    region: 'asia_pacific',
    date: '2026-01-29',
    dateEnd: '2026-02-01',
    status: 'confirmed',
    label: 'HYROX Auckland',
    specialDesignation: null,
  },
  {
    id: 'brisbane-apac-2026',
    city: 'Brisbane',
    country: 'Australia',
    region: 'asia_pacific',
    date: '2026-04-09',
    dateEnd: '2026-04-12',
    status: 'confirmed',
    label: 'HYROX Brisbane',
    specialDesignation: 'APAC Regional',
  },

  // ═══════════════════════════════════════════════════════════
  // ASIA PACIFIC — India
  // ═══════════════════════════════════════════════════════════
  {
    id: 'mumbai-2025',
    city: 'Mumbai',
    country: 'India',
    region: 'asia_pacific',
    date: '2025-09-07',
    dateEnd: null,
    status: 'confirmed',
    label: 'HYROX Mumbai',
    specialDesignation: null,
  },
  {
    id: 'bengaluru-2026',
    city: 'Bengaluru',
    country: 'India',
    region: 'asia_pacific',
    date: '2026-04-11',
    dateEnd: null,
    status: 'confirmed',
    label: 'HYROX Bengaluru',
    specialDesignation: null,
  },

  // ═══════════════════════════════════════════════════════════
  // ASIA PACIFIC — East & Southeast Asia
  // ═══════════════════════════════════════════════════════════
  {
    id: 'seoul-2025',
    city: 'Seoul',
    country: 'South Korea',
    region: 'asia_pacific',
    date: '2025-11-08',
    dateEnd: '2025-11-09',
    status: 'confirmed',
    label: 'HYROX Seoul',
    specialDesignation: null,
  },
  {
    id: 'singapore-expo-2025',
    city: 'Singapore',
    country: 'Singapore',
    region: 'asia_pacific',
    date: '2025-11-29',
    dateEnd: '2025-11-30',
    status: 'confirmed',
    label: 'HYROX Singapore (Expo)',
    specialDesignation: null,
  },
  {
    id: 'osaka-2026',
    city: 'Osaka',
    country: 'Japan',
    region: 'asia_pacific',
    date: '2026-01-30',
    dateEnd: '2026-02-01',
    status: 'confirmed',
    label: 'HYROX Osaka',
    specialDesignation: null,
  },
  {
    id: 'bangkok-2026',
    city: 'Bangkok',
    country: 'Thailand',
    region: 'asia_pacific',
    date: '2026-03-20',
    dateEnd: '2026-03-22',
    status: 'confirmed',
    label: 'HYROX Bangkok',
    specialDesignation: null,
  },
  {
    id: 'singapore-2026',
    city: 'Singapore',
    country: 'Singapore',
    region: 'asia_pacific',
    date: '2026-04-03',
    dateEnd: '2026-04-05',
    status: 'confirmed',
    label: 'HYROX Singapore',
    specialDesignation: null,
  },
  {
    id: 'hong-kong-2026',
    city: 'Hong Kong',
    country: 'Hong Kong',
    region: 'asia_pacific',
    date: '2026-05-08',
    dateEnd: '2026-05-10',
    status: 'confirmed',
    label: 'HYROX Hong Kong',
    specialDesignation: null,
  },
  {
    id: 'incheon-2026',
    city: 'Incheon',
    country: 'South Korea',
    region: 'asia_pacific',
    date: '2026-05-15',
    dateEnd: '2026-05-17',
    status: 'confirmed',
    label: 'HYROX Incheon',
    specialDesignation: null,
  },

  // ═══════════════════════════════════════════════════════════
  // SOUTH AMERICA & MEXICO — Mexico
  // ═══════════════════════════════════════════════════════════
  {
    id: 'acapulco-2025',
    city: 'Acapulco',
    country: 'Mexico',
    region: 'south_america',
    date: '2025-09-06',
    dateEnd: '2025-09-07',
    status: 'confirmed',
    label: 'HYROX Acapulco',
    specialDesignation: null,
  },
  {
    id: 'mexico-city-2025',
    city: 'Mexico City',
    country: 'Mexico',
    region: 'south_america',
    date: '2025-11-07',
    dateEnd: '2025-11-09',
    status: 'confirmed',
    label: 'HYROX Mexico City',
    specialDesignation: null,
  },
  {
    id: 'guadalajara-2026',
    city: 'Guadalajara',
    country: 'Mexico',
    region: 'south_america',
    date: '2026-02-07',
    dateEnd: '2026-02-08',
    status: 'confirmed',
    label: 'HYROX Guadalajara',
    specialDesignation: null,
  },
  {
    id: 'cancun-2026',
    city: 'Cancún',
    country: 'Mexico',
    region: 'south_america',
    date: '2026-03-13',
    dateEnd: '2026-03-15',
    status: 'confirmed',
    label: 'HYROX Cancún',
    specialDesignation: null,
  },
  {
    id: 'monterrey-2026',
    city: 'Monterrey',
    country: 'Mexico',
    region: 'south_america',
    date: '2026-04-18',
    dateEnd: '2026-04-19',
    status: 'confirmed',
    label: 'HYROX Monterrey',
    specialDesignation: null,
  },
  {
    id: 'puebla-2026',
    city: 'Puebla',
    country: 'Mexico',
    region: 'south_america',
    date: '2026-06-30',
    dateEnd: null,
    status: 'confirmed',
    label: 'HYROX Puebla',
    specialDesignation: null,
  },

  // ═══════════════════════════════════════════════════════════
  // SOUTH AMERICA & MEXICO — Brazil & Argentina
  // ═══════════════════════════════════════════════════════════
  {
    id: 'sao-paulo-2025',
    city: 'São Paulo',
    country: 'Brazil',
    region: 'south_america',
    date: '2025-09-20',
    dateEnd: null,
    status: 'confirmed',
    label: 'HYROX São Paulo',
    specialDesignation: null,
  },
  {
    id: 'rio-de-janeiro-2025',
    city: 'Rio de Janeiro',
    country: 'Brazil',
    region: 'south_america',
    date: '2025-11-29',
    dateEnd: null,
    status: 'confirmed',
    label: 'HYROX Rio de Janeiro',
    specialDesignation: null,
  },
  {
    id: 'fortaleza-2026',
    city: 'Fortaleza',
    country: 'Brazil',
    region: 'south_america',
    date: '2026-02-28',
    dateEnd: null,
    status: 'confirmed',
    label: 'HYROX Fortaleza',
    specialDesignation: null,
  },
  {
    id: 'sao-paulo-2026',
    city: 'São Paulo',
    country: 'Brazil',
    region: 'south_america',
    date: '2026-04-25',
    dateEnd: null,
    status: 'confirmed',
    label: 'HYROX São Paulo',
    specialDesignation: null,
  },
  {
    id: 'buenos-aires-2026',
    city: 'Buenos Aires',
    country: 'Argentina',
    region: 'south_america',
    date: null,
    dateEnd: null,
    status: 'tbd',
    label: 'HYROX Buenos Aires',
    specialDesignation: null,
  },
];

/**
 * Groups races by region and sorts: confirmed by date ascending, TBD at bottom.
 */
export function getRacesByRegion(): Record<RaceRegion, HyroxRace[]> {
  const grouped: Record<RaceRegion, HyroxRace[]> = {
    north_america: [],
    europe: [],
    asia_pacific: [],
    south_america: [],
  };

  for (const race of RACE_CALENDAR) {
    grouped[race.region].push(race);
  }

  for (const region of Object.keys(grouped) as RaceRegion[]) {
    grouped[region].sort((a, b) => {
      if (!a.date && !b.date) return 0;
      if (!a.date) return 1;
      if (!b.date) return -1;
      return a.date.localeCompare(b.date);
    });
  }

  return grouped;
}

/**
 * Checks whether today falls on the race date(s).
 */
export function isRaceDay(race: HyroxRace): boolean {
  if (!race.date) return false;

  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  if (race.dateEnd) {
    return todayStr >= race.date && todayStr <= race.dateEnd;
  }
  return todayStr === race.date;
}
