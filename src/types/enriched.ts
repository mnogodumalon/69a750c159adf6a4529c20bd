import type { PositiveMomente, TaeglicheStimmung } from './app';

export type EnrichedTaeglicheStimmung = TaeglicheStimmung & {
  eintrag_stimmungName: string;
  eintrag_aktivitaetenName: string;
};

export type EnrichedPositiveMomente = PositiveMomente & {
  moment_stimmungName: string;
  moment_aktivitaetenName: string;
};
