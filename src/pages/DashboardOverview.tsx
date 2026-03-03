import { useState, useMemo, useCallback } from 'react';
import { useDashboardData } from '@/hooks/useDashboardData';
import { enrichTaeglicheStimmung, enrichPositiveMomente } from '@/lib/enrich';
import { APP_IDS } from '@/types/app';
import { LivingAppsService, extractRecordId, createRecordUrl } from '@/services/livingAppsService';
import { formatDate } from '@/lib/formatters';
import { AI_PHOTO_SCAN } from '@/config/ai-features';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, Plus, ChevronLeft, ChevronRight, Smile, Star, Zap, TrendingUp } from 'lucide-react';
import { format, startOfWeek, addDays, addWeeks, subWeeks, isToday, isSameDay, parseISO } from 'date-fns';
import { de } from 'date-fns/locale';
import { TaeglicheStimmungDialog } from '@/components/dialogs/TaeglicheStimmungDialog';
import { PositiveMomenteDialog } from '@/components/dialogs/PositiveMomenteDialog';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import type { TaeglicheStimmung, PositiveMomente } from '@/types/app';
import { StatCard } from '@/components/StatCard';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

export default function DashboardOverview() {
  const {
    aktivitaeten, stimmungskategorien, taeglicheStimmung, positiveMomente,
    aktivitaetenMap, stimmungskategorienMap,
    loading, error, fetchAll,
  } = useDashboardData();

  // All hooks before early returns
  const [weekOffset, setWeekOffset] = useState(0);
  const [activeTab, setActiveTab] = useState<'stimmung' | 'momente'>('stimmung');
  const [stimmungDialogOpen, setStimmungDialogOpen] = useState(false);
  const [momenteDialogOpen, setMomenteDialogOpen] = useState(false);
  const [editStimmung, setEditStimmung] = useState<TaeglicheStimmung | null>(null);
  const [editMoment, setEditMoment] = useState<PositiveMomente | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; type: 'stimmung' | 'moment' } | null>(null);
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);

  const enrichedTaeglicheStimmung = enrichTaeglicheStimmung(taeglicheStimmung, { stimmungskategorienMap, aktivitaetenMap });
  const enrichedPositiveMomente = enrichPositiveMomente(positiveMomente, { stimmungskategorienMap, aktivitaetenMap });

  const weekStart = useMemo(() => {
    const base = startOfWeek(new Date(), { weekStartsOn: 1 });
    return weekOffset === 0 ? base : weekOffset > 0 ? addWeeks(base, weekOffset) : subWeeks(base, Math.abs(weekOffset));
  }, [weekOffset]);

  const weekDays = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)), [weekStart]);

  const stimmungByDate = useMemo(() => {
    const map = new Map<string, TaeglicheStimmung>();
    taeglicheStimmung.forEach(s => {
      if (s.fields.eintrag_datum) map.set(s.fields.eintrag_datum, s);
    });
    return map;
  }, [taeglicheStimmung]);

  const momenteByDate = useMemo(() => {
    const map = new Map<string, PositiveMomente[]>();
    positiveMomente.forEach(m => {
      const dateStr = m.fields.moment_zeitpunkt?.split('T')[0];
      if (dateStr) {
        if (!map.has(dateStr)) map.set(dateStr, []);
        map.get(dateStr)!.push(m);
      }
    });
    return map;
  }, [positiveMomente]);

  const selectedDayStr = selectedDay ? format(selectedDay, 'yyyy-MM-dd') : null;
  const selectedStimmung = selectedDayStr ? stimmungByDate.get(selectedDayStr) : null;
  const selectedMomente = selectedDayStr ? (momenteByDate.get(selectedDayStr) ?? []) : [];

  // Mood trend chart data (last 14 days)
  const moodTrendData = useMemo(() => {
    const days = Array.from({ length: 14 }, (_, i) => {
      const d = addDays(new Date(), i - 13);
      const dateStr = format(d, 'yyyy-MM-dd');
      const entry = stimmungByDate.get(dateStr);
      const stimmungId = entry?.fields.eintrag_stimmung ? extractRecordId(entry.fields.eintrag_stimmung) : null;
      const kat = stimmungId ? stimmungskategorienMap.get(stimmungId) : null;
      return {
        day: format(d, 'EEE', { locale: de }),
        hasEntry: !!entry,
        stimmung: kat?.fields.kategorie_name ?? '',
        emoji: kat?.fields.kategorie_emoji ?? '',
        dateStr,
      };
    });
    return days;
  }, [stimmungByDate, stimmungskategorienMap]);

  // Stats
  const thisWeekEntries = useMemo(() => {
    return weekDays.filter(d => stimmungByDate.has(format(d, 'yyyy-MM-dd'))).length;
  }, [weekDays, stimmungByDate]);

  const streak = useMemo(() => {
    let s = 0;
    for (let i = 0; i < 30; i++) {
      const d = addDays(new Date(), -i);
      if (stimmungByDate.has(format(d, 'yyyy-MM-dd'))) s++;
      else break;
    }
    return s;
  }, [stimmungByDate]);

  const handleDeleteConfirm = useCallback(async () => {
    if (!deleteTarget) return;
    if (deleteTarget.type === 'stimmung') {
      await LivingAppsService.deleteTaeglicheStimmungEntry(deleteTarget.id);
    } else {
      await LivingAppsService.deletePositiveMomenteEntry(deleteTarget.id);
    }
    setDeleteTarget(null);
    fetchAll();
  }, [deleteTarget, fetchAll]);

  if (loading) return <DashboardSkeleton />;
  if (error) return <DashboardError error={error} onRetry={fetchAll} />;

  const today = new Date();
  const todayStr = format(today, 'yyyy-MM-dd');
  const todayStimmung = stimmungByDate.get(todayStr);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Dein Wohlbefinden</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{format(today, "EEEE, d. MMMM yyyy", { locale: de })}</p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => { setEditStimmung(null); setStimmungDialogOpen(true); }}
            size="sm"
            className="gap-1.5"
          >
            <Smile size={15} />
            Stimmung eintragen
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => { setEditMoment(null); setMomenteDialogOpen(true); }}
            className="gap-1.5"
          >
            <Star size={15} />
            Moment festhalten
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          title="Streak"
          value={`${streak} ${streak === 1 ? 'Tag' : 'Tage'}`}
          description="Ununterbrochen"
          icon={<Zap size={18} className="text-muted-foreground" />}
        />
        <StatCard
          title="Diese Woche"
          value={`${thisWeekEntries}/7`}
          description="Einträge"
          icon={<TrendingUp size={18} className="text-muted-foreground" />}
        />
        <StatCard
          title="Stimmungen"
          value={String(taeglicheStimmung.length)}
          description="Gesamt eingetragen"
          icon={<Smile size={18} className="text-muted-foreground" />}
        />
        <StatCard
          title="Positive Momente"
          value={String(positiveMomente.length)}
          description="Gesammelt"
          icon={<Star size={18} className="text-muted-foreground" />}
        />
      </div>

      {/* Today's Entry Banner (if not logged today) */}
      {!todayStimmung && (
        <div
          className="rounded-2xl bg-primary/5 border border-primary/20 p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 cursor-pointer hover:bg-primary/10 transition-colors"
          onClick={() => { setEditStimmung(null); setStimmungDialogOpen(true); }}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center text-xl">✨</div>
            <div>
              <p className="font-semibold text-foreground">Wie geht es dir heute?</p>
              <p className="text-sm text-muted-foreground">Du hast heute noch keine Stimmung eingetragen.</p>
            </div>
          </div>
          <Button size="sm" className="shrink-0">Jetzt eintragen</Button>
        </div>
      )}

      {/* Today's Mood if logged */}
      {todayStimmung && (() => {
        const stimmungId = todayStimmung.fields.eintrag_stimmung ? extractRecordId(todayStimmung.fields.eintrag_stimmung) : null;
        const kat = stimmungId ? stimmungskategorienMap.get(stimmungId) : null;
        return (
          <div className="rounded-2xl bg-card border border-border p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-2xl">
                {kat?.fields.kategorie_emoji || '😊'}
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider mb-0.5">Heute</p>
                <p className="font-semibold text-foreground text-lg">{kat?.fields.kategorie_name ?? 'Stimmung eingetragen'}</p>
                {todayStimmung.fields.eintrag_notizen && (
                  <p className="text-sm text-muted-foreground mt-0.5 line-clamp-1">{todayStimmung.fields.eintrag_notizen}</p>
                )}
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => { setEditStimmung(todayStimmung); setStimmungDialogOpen(true); }}
              >
                Bearbeiten
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="text-destructive hover:text-destructive"
                onClick={() => setDeleteTarget({ id: todayStimmung.record_id, type: 'stimmung' })}
              >
                Löschen
              </Button>
            </div>
          </div>
        );
      })()}

      {/* Week Calendar */}
      <div className="rounded-2xl bg-card border border-border overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div className="flex items-center gap-3">
            <h2 className="font-semibold text-foreground">Wochenübersicht</h2>
            <span className="text-sm text-muted-foreground">
              {format(weekStart, "d. MMM", { locale: de })} – {format(addDays(weekStart, 6), "d. MMM yyyy", { locale: de })}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setWeekOffset(w => w - 1)}>
              <ChevronLeft size={16} />
            </Button>
            {weekOffset !== 0 && (
              <Button variant="ghost" size="sm" className="text-xs h-8" onClick={() => setWeekOffset(0)}>Heute</Button>
            )}
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setWeekOffset(w => w + 1)}>
              <ChevronRight size={16} />
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-7">
          {weekDays.map((day) => {
            const dateStr = format(day, 'yyyy-MM-dd');
            const stimmung = stimmungByDate.get(dateStr);
            const momente = momenteByDate.get(dateStr) ?? [];
            const isSelected = selectedDay ? isSameDay(day, selectedDay) : false;
            const isT = isToday(day);
            const isFuture = day > today;
            const stimmungId = stimmung?.fields.eintrag_stimmung ? extractRecordId(stimmung.fields.eintrag_stimmung) : null;
            const kat = stimmungId ? stimmungskategorienMap.get(stimmungId) : null;

            return (
              <button
                key={dateStr}
                onClick={() => {
                  if (!isFuture) setSelectedDay(isSelected ? null : day);
                }}
                className={`
                  flex flex-col items-center gap-1.5 p-2 sm:p-3 border-r border-border last:border-r-0
                  transition-colors min-h-[90px] sm:min-h-[110px]
                  ${isFuture ? 'opacity-30 cursor-not-allowed' : 'cursor-pointer hover:bg-accent/50'}
                  ${isSelected ? 'bg-primary/10' : ''}
                `}
                disabled={isFuture}
              >
                <span className={`text-xs font-medium uppercase tracking-wide ${isT ? 'text-primary' : 'text-muted-foreground'}`}>
                  {format(day, 'EEE', { locale: de })}
                </span>
                <span className={`text-sm font-semibold w-7 h-7 flex items-center justify-center rounded-full
                  ${isT ? 'bg-primary text-primary-foreground' : 'text-foreground'}`}>
                  {format(day, 'd')}
                </span>

                {kat?.fields.kategorie_emoji ? (
                  <span className="text-xl leading-none mt-0.5">{kat.fields.kategorie_emoji}</span>
                ) : stimmung ? (
                  <div className="w-2 h-2 rounded-full bg-primary mt-1" />
                ) : !isFuture ? (
                  <div className="w-2 h-2 rounded-full bg-border mt-1" />
                ) : null}

                {momente.length > 0 && (
                  <div className="flex items-center gap-0.5 mt-auto">
                    <Star size={10} className="text-amber-400 fill-amber-400" />
                    <span className="text-xs text-muted-foreground">{momente.length}</span>
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Day Detail Panel */}
      {selectedDay && (
        <div className="rounded-2xl bg-card border border-border overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-border">
            <div>
              <h2 className="font-semibold text-foreground">
                {format(selectedDay, "EEEE, d. MMMM", { locale: de })}
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">Tagesdetails</p>
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                className="gap-1.5 text-xs"
                onClick={() => {
                  setEditStimmung(null);
                  setStimmungDialogOpen(true);
                }}
              >
                <Plus size={13} />
                Stimmung
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="gap-1.5 text-xs"
                onClick={() => {
                  setEditMoment(null);
                  setMomenteDialogOpen(true);
                }}
              >
                <Plus size={13} />
                Moment
              </Button>
            </div>
          </div>

          <div className="p-5 grid sm:grid-cols-2 gap-4">
            {/* Stimmung des Tages */}
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">Stimmung</p>
              {selectedStimmung ? (() => {
                const sid = selectedStimmung.fields.eintrag_stimmung ? extractRecordId(selectedStimmung.fields.eintrag_stimmung) : null;
                const k = sid ? stimmungskategorienMap.get(sid) : null;
                return (
                  <div className="rounded-xl bg-accent/40 p-4 space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">{k?.fields.kategorie_emoji || '😊'}</span>
                      <span className="font-semibold">{k?.fields.kategorie_name ?? '—'}</span>
                    </div>
                    {selectedStimmung.fields.eintrag_notizen && (
                      <p className="text-sm text-muted-foreground">{selectedStimmung.fields.eintrag_notizen}</p>
                    )}
                    <div className="flex gap-2 pt-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-xs h-7"
                        onClick={() => { setEditStimmung(selectedStimmung); setStimmungDialogOpen(true); }}
                      >
                        Bearbeiten
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-xs h-7 text-destructive hover:text-destructive"
                        onClick={() => setDeleteTarget({ id: selectedStimmung.record_id, type: 'stimmung' })}
                      >
                        Löschen
                      </Button>
                    </div>
                  </div>
                );
              })() : (
                <div
                  className="rounded-xl border-2 border-dashed border-border p-4 flex flex-col items-center gap-2 cursor-pointer hover:border-primary/40 hover:bg-primary/5 transition-colors"
                  onClick={() => { setEditStimmung(null); setStimmungDialogOpen(true); }}
                >
                  <Smile size={20} className="text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">Noch keine Stimmung</p>
                </div>
              )}
            </div>

            {/* Positive Momente des Tages */}
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
                Positive Momente ({selectedMomente.length})
              </p>
              <div className="space-y-2">
                {selectedMomente.map(m => {
                  const sid = m.fields.moment_stimmung ? extractRecordId(m.fields.moment_stimmung) : null;
                  const k = sid ? stimmungskategorienMap.get(sid) : null;
                  return (
                    <div key={m.record_id} className="rounded-xl bg-amber-50/50 dark:bg-amber-900/10 border border-amber-200/40 p-3 space-y-1">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-1.5">
                          <Star size={13} className="text-amber-400 fill-amber-400 shrink-0 mt-0.5" />
                          <p className="text-sm font-medium line-clamp-2">{m.fields.moment_beschreibung ?? '—'}</p>
                        </div>
                        <div className="flex gap-1 shrink-0">
                          <button
                            className="text-xs text-muted-foreground hover:text-foreground"
                            onClick={() => { setEditMoment(m); setMomenteDialogOpen(true); }}
                          >✏️</button>
                          <button
                            className="text-xs text-muted-foreground hover:text-destructive"
                            onClick={() => setDeleteTarget({ id: m.record_id, type: 'moment' })}
                          >🗑️</button>
                        </div>
                      </div>
                      {k && <p className="text-xs text-muted-foreground">{k.fields.kategorie_emoji} {k.fields.kategorie_name}</p>}
                      {m.fields.moment_dankbarkeit && (
                        <p className="text-xs text-muted-foreground italic">„{m.fields.moment_dankbarkeit}"</p>
                      )}
                    </div>
                  );
                })}
                {selectedMomente.length === 0 && (
                  <div
                    className="rounded-xl border-2 border-dashed border-border p-4 flex flex-col items-center gap-2 cursor-pointer hover:border-amber-400/40 hover:bg-amber-50/30 transition-colors"
                    onClick={() => { setEditMoment(null); setMomenteDialogOpen(true); }}
                  >
                    <Star size={20} className="text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">Keinen Moment festgehalten</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Mood Trend Chart */}
      <div className="rounded-2xl bg-card border border-border p-5">
        <h2 className="font-semibold text-foreground mb-4">Stimmungsverlauf (14 Tage)</h2>
        <div className="flex gap-1 items-end h-14">
          {moodTrendData.map((d, i) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-1">
              <div
                className={`w-full rounded-sm transition-all ${d.hasEntry ? 'bg-primary/70' : 'bg-muted'}`}
                style={{ height: d.hasEntry ? '100%' : '20%' }}
                title={d.stimmung || d.dateStr}
              />
              {d.emoji && <span className="text-base leading-none">{d.emoji}</span>}
            </div>
          ))}
        </div>
        <div className="flex justify-between mt-1">
          <span className="text-xs text-muted-foreground">{moodTrendData[0]?.day}</span>
          <span className="text-xs text-muted-foreground">{moodTrendData[moodTrendData.length - 1]?.day}</span>
        </div>
      </div>

      {/* Recent Positive Moments */}
      {positiveMomente.length > 0 && (
        <div className="rounded-2xl bg-card border border-border overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-border">
            <h2 className="font-semibold text-foreground">Letzte positive Momente</h2>
            <Button
              variant="ghost"
              size="sm"
              className="gap-1.5 text-xs"
              onClick={() => { setEditMoment(null); setMomenteDialogOpen(true); }}
            >
              <Plus size={13} />
              Hinzufügen
            </Button>
          </div>
          <div className="divide-y divide-border">
            {[...positiveMomente]
              .sort((a, b) => (b.fields.moment_zeitpunkt ?? '').localeCompare(a.fields.moment_zeitpunkt ?? ''))
              .slice(0, 5)
              .map(m => {
                const sid = m.fields.moment_stimmung ? extractRecordId(m.fields.moment_stimmung) : null;
                const k = sid ? stimmungskategorienMap.get(sid) : null;
                return (
                  <div key={m.record_id} className="flex items-start gap-3 px-5 py-4 hover:bg-accent/30 transition-colors group">
                    <div className="w-8 h-8 rounded-xl bg-amber-100 dark:bg-amber-900/20 flex items-center justify-center shrink-0 text-base">
                      {k?.fields.kategorie_emoji || '⭐'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium line-clamp-1">{m.fields.moment_beschreibung ?? '—'}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs text-muted-foreground">
                          {m.fields.moment_zeitpunkt
                            ? format(parseISO(m.fields.moment_zeitpunkt), "d. MMM HH:mm", { locale: de })
                            : '—'}
                        </span>
                        {k && (
                          <Badge variant="secondary" className="text-xs px-1.5 py-0 h-4">{k.fields.kategorie_name}</Badge>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => { setEditMoment(m); setMomenteDialogOpen(true); }}
                      >
                        <span className="text-xs">✏️</span>
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 hover:text-destructive"
                        onClick={() => setDeleteTarget({ id: m.record_id, type: 'moment' })}
                      >
                        <span className="text-xs">🗑️</span>
                      </Button>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* Empty state when no data */}
      {taeglicheStimmung.length === 0 && positiveMomente.length === 0 && (
        <div className="rounded-2xl bg-card border border-border p-12 flex flex-col items-center gap-4 text-center">
          <div className="text-5xl">🌱</div>
          <div>
            <p className="font-semibold text-foreground text-lg">Starte deine Reise</p>
            <p className="text-sm text-muted-foreground mt-1">Trage deine erste Stimmung ein und halte positive Momente fest.</p>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => { setEditStimmung(null); setStimmungDialogOpen(true); }} className="gap-1.5">
              <Smile size={15} />
              Stimmung eintragen
            </Button>
            <Button variant="outline" onClick={() => { setEditMoment(null); setMomenteDialogOpen(true); }} className="gap-1.5">
              <Star size={15} />
              Moment festhalten
            </Button>
          </div>
        </div>
      )}

      {/* Dialogs */}
      <TaeglicheStimmungDialog
        open={stimmungDialogOpen}
        onClose={() => { setStimmungDialogOpen(false); setEditStimmung(null); }}
        onSubmit={async (fields) => {
          if (editStimmung) {
            await LivingAppsService.updateTaeglicheStimmungEntry(editStimmung.record_id, fields);
          } else {
            await LivingAppsService.createTaeglicheStimmungEntry(fields);
          }
          fetchAll();
        }}
        defaultValues={editStimmung?.fields}
        stimmungskategorienList={stimmungskategorien}
        aktivitaetenList={aktivitaeten}
        enablePhotoScan={AI_PHOTO_SCAN['TaeglicheStimmung']}
      />

      <PositiveMomenteDialog
        open={momenteDialogOpen}
        onClose={() => { setMomenteDialogOpen(false); setEditMoment(null); }}
        onSubmit={async (fields) => {
          if (editMoment) {
            await LivingAppsService.updatePositiveMomenteEntry(editMoment.record_id, fields);
          } else {
            await LivingAppsService.createPositiveMomenteEntry(fields);
          }
          fetchAll();
        }}
        defaultValues={editMoment?.fields}
        stimmungskategorienList={stimmungskategorien}
        aktivitaetenList={aktivitaeten}
        enablePhotoScan={AI_PHOTO_SCAN['PositiveMomente']}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        title="Eintrag löschen"
        description="Möchtest du diesen Eintrag wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden."
        onConfirm={handleDeleteConfirm}
        onClose={() => setDeleteTarget(null)}
      />
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-9 w-36" />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}
      </div>
      <Skeleton className="h-64 rounded-2xl" />
    </div>
  );
}

function DashboardError({ error, onRetry }: { error: Error; onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 gap-4">
      <div className="w-12 h-12 rounded-2xl bg-destructive/10 flex items-center justify-center">
        <AlertCircle size={22} className="text-destructive" />
      </div>
      <div className="text-center">
        <h3 className="font-semibold text-foreground mb-1">Fehler beim Laden</h3>
        <p className="text-sm text-muted-foreground max-w-xs">{error.message}</p>
      </div>
      <Button variant="outline" size="sm" onClick={onRetry}>Erneut versuchen</Button>
    </div>
  );
}
