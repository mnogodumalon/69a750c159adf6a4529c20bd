import type { EnrichedPositiveMomente, EnrichedTaeglicheStimmung } from '@/types/enriched';
import type { Aktivitaeten, PositiveMomente, Stimmungskategorien, TaeglicheStimmung } from '@/types/app';
import { extractRecordId } from '@/services/livingAppsService';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function resolveDisplay(url: string | undefined, map: Map<string, any>, ...fields: string[]): string {
  if (!url) return '';
  const id = extractRecordId(url);
  if (!id) return '';
  const r = map.get(id);
  if (!r) return '';
  return fields.map(f => String(r.fields[f] ?? '')).join(' ').trim();
}

interface TaeglicheStimmungMaps {
  stimmungskategorienMap: Map<string, Stimmungskategorien>;
  aktivitaetenMap: Map<string, Aktivitaeten>;
}

export function enrichTaeglicheStimmung(
  taeglicheStimmung: TaeglicheStimmung[],
  maps: TaeglicheStimmungMaps
): EnrichedTaeglicheStimmung[] {
  return taeglicheStimmung.map(r => ({
    ...r,
    eintrag_stimmungName: resolveDisplay(r.fields.eintrag_stimmung, maps.stimmungskategorienMap, 'kategorie_name'),
    eintrag_aktivitaetenName: resolveDisplay(r.fields.eintrag_aktivitaeten, maps.aktivitaetenMap, 'aktivitaet_name'),
  }));
}

interface PositiveMomenteMaps {
  stimmungskategorienMap: Map<string, Stimmungskategorien>;
  aktivitaetenMap: Map<string, Aktivitaeten>;
}

export function enrichPositiveMomente(
  positiveMomente: PositiveMomente[],
  maps: PositiveMomenteMaps
): EnrichedPositiveMomente[] {
  return positiveMomente.map(r => ({
    ...r,
    moment_stimmungName: resolveDisplay(r.fields.moment_stimmung, maps.stimmungskategorienMap, 'kategorie_name'),
    moment_aktivitaetenName: resolveDisplay(r.fields.moment_aktivitaeten, maps.aktivitaetenMap, 'aktivitaet_name'),
  }));
}
