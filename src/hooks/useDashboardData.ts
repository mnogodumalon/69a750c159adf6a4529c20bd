import { useState, useEffect, useMemo, useCallback } from 'react';
import type { Aktivitaeten, Stimmungskategorien, TaeglicheStimmung, PositiveMomente } from '@/types/app';
import { LivingAppsService } from '@/services/livingAppsService';

export function useDashboardData() {
  const [aktivitaeten, setAktivitaeten] = useState<Aktivitaeten[]>([]);
  const [stimmungskategorien, setStimmungskategorien] = useState<Stimmungskategorien[]>([]);
  const [taeglicheStimmung, setTaeglicheStimmung] = useState<TaeglicheStimmung[]>([]);
  const [positiveMomente, setPositiveMomente] = useState<PositiveMomente[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchAll = useCallback(async () => {
    setError(null);
    try {
      const [aktivitaetenData, stimmungskategorienData, taeglicheStimmungData, positiveMomenteData] = await Promise.all([
        LivingAppsService.getAktivitaeten(),
        LivingAppsService.getStimmungskategorien(),
        LivingAppsService.getTaeglicheStimmung(),
        LivingAppsService.getPositiveMomente(),
      ]);
      setAktivitaeten(aktivitaetenData);
      setStimmungskategorien(stimmungskategorienData);
      setTaeglicheStimmung(taeglicheStimmungData);
      setPositiveMomente(positiveMomenteData);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Fehler beim Laden der Daten'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const aktivitaetenMap = useMemo(() => {
    const m = new Map<string, Aktivitaeten>();
    aktivitaeten.forEach(r => m.set(r.record_id, r));
    return m;
  }, [aktivitaeten]);

  const stimmungskategorienMap = useMemo(() => {
    const m = new Map<string, Stimmungskategorien>();
    stimmungskategorien.forEach(r => m.set(r.record_id, r));
    return m;
  }, [stimmungskategorien]);

  return { aktivitaeten, setAktivitaeten, stimmungskategorien, setStimmungskategorien, taeglicheStimmung, setTaeglicheStimmung, positiveMomente, setPositiveMomente, loading, error, fetchAll, aktivitaetenMap, stimmungskategorienMap };
}