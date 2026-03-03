// AUTOMATICALLY GENERATED TYPES - DO NOT EDIT

export interface Aktivitaeten {
  record_id: string;
  createdat: string;
  updatedat: string | null;
  fields: {
    aktivitaet_name?: string;
    aktivitaet_beschreibung?: string;
    aktivitaet_kategorie?: 'sport' | 'sozial' | 'kreativ' | 'natur' | 'entspannung' | 'lernen' | 'sonstiges';
  };
}

export interface Stimmungskategorien {
  record_id: string;
  createdat: string;
  updatedat: string | null;
  fields: {
    kategorie_name?: string;
    kategorie_beschreibung?: string;
    kategorie_emoji?: string;
  };
}

export interface TaeglicheStimmung {
  record_id: string;
  createdat: string;
  updatedat: string | null;
  fields: {
    eintrag_datum?: string; // Format: YYYY-MM-DD oder ISO String
    eintrag_stimmung?: string; // applookup -> URL zu 'Stimmungskategorien' Record
    eintrag_aktivitaeten?: string;
    eintrag_notizen?: string;
  };
}

export interface PositiveMomente {
  record_id: string;
  createdat: string;
  updatedat: string | null;
  fields: {
    moment_zeitpunkt?: string; // Format: YYYY-MM-DD oder ISO String
    moment_beschreibung?: string;
    moment_stimmung?: string; // applookup -> URL zu 'Stimmungskategorien' Record
    moment_aktivitaeten?: string;
    moment_dankbarkeit?: string;
  };
}

export const APP_IDS = {
  AKTIVITAETEN: '69a750a14a90d7e3986895bf',
  STIMMUNGSKATEGORIEN: '69a750a99c53392e0001a840',
  TAEGLICHE_STIMMUNG: '69a750aadef3fef6ef4c2856',
  POSITIVE_MOMENTE: '69a750abcb3d90646af3ecbe',
} as const;

// Helper Types for creating new records
export type CreateAktivitaeten = Aktivitaeten['fields'];
export type CreateStimmungskategorien = Stimmungskategorien['fields'];
export type CreateTaeglicheStimmung = TaeglicheStimmung['fields'];
export type CreatePositiveMomente = PositiveMomente['fields'];