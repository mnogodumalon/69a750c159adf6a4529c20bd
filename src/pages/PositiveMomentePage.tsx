import { useState, useEffect } from 'react';
import { LivingAppsService, extractRecordId, createRecordUrl } from '@/services/livingAppsService';
import type { PositiveMomente, Stimmungskategorien, Aktivitaeten } from '@/types/app';
import { APP_IDS } from '@/types/app';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table, TableBody, TableCell, TableHead,
  TableHeader, TableRow,
} from '@/components/ui/table';
import { Pencil, Trash2, Plus, Search } from 'lucide-react';
import { PositiveMomenteDialog } from '@/components/dialogs/PositiveMomenteDialog';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { PageShell } from '@/components/PageShell';
import { AI_PHOTO_SCAN } from '@/config/ai-features';
import { format, parseISO } from 'date-fns';
import { de } from 'date-fns/locale';

function formatDate(d?: string) {
  if (!d) return '—';
  try { return format(parseISO(d), 'dd.MM.yyyy', { locale: de }); } catch { return d; }
}

export default function PositiveMomentePage() {
  const [records, setRecords] = useState<PositiveMomente[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<PositiveMomente | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<PositiveMomente | null>(null);
  const [stimmungskategorienList, setStimmungskategorienList] = useState<Stimmungskategorien[]>([]);
  const [aktivitaetenList, setAktivitaetenList] = useState<Aktivitaeten[]>([]);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    setLoading(true);
    try {
      const [mainData, stimmungskategorienData, aktivitaetenData] = await Promise.all([
        LivingAppsService.getPositiveMomente(),
        LivingAppsService.getStimmungskategorien(),
        LivingAppsService.getAktivitaeten(),
      ]);
      setRecords(mainData);
      setStimmungskategorienList(stimmungskategorienData);
      setAktivitaetenList(aktivitaetenData);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate(fields: PositiveMomente['fields']) {
    await LivingAppsService.createPositiveMomenteEntry(fields);
    await loadData();
    setDialogOpen(false);
  }

  async function handleUpdate(fields: PositiveMomente['fields']) {
    if (!editingRecord) return;
    await LivingAppsService.updatePositiveMomenteEntry(editingRecord.record_id, fields);
    await loadData();
    setEditingRecord(null);
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    await LivingAppsService.deletePositiveMomenteEntry(deleteTarget.record_id);
    setRecords(prev => prev.filter(r => r.record_id !== deleteTarget.record_id));
    setDeleteTarget(null);
  }

  function getStimmungskategorienDisplayName(url?: string) {
    if (!url) return '—';
    const id = extractRecordId(url);
    return stimmungskategorienList.find(r => r.record_id === id)?.fields.kategorie_name ?? '—';
  }

  function getAktivitaetenDisplayName(url?: string) {
    if (!url) return '—';
    const id = extractRecordId(url);
    return aktivitaetenList.find(r => r.record_id === id)?.fields.aktivitaet_name ?? '—';
  }

  const filtered = records.filter(r => {
    if (!search) return true;
    const s = search.toLowerCase();
    return Object.values(r.fields).some(v => {
      if (v == null) return false;
      if (Array.isArray(v)) return v.some(item => typeof item === 'object' && item !== null && 'label' in item ? String((item as any).label).toLowerCase().includes(s) : String(item).toLowerCase().includes(s));
      if (typeof v === 'object' && 'label' in (v as any)) return String((v as any).label).toLowerCase().includes(s);
      return String(v).toLowerCase().includes(s);
    });
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <PageShell
      title="Positive Momente"
      subtitle={`${records.length} Positive Momente im System`}
      action={
        <Button onClick={() => setDialogOpen(true)} className="shrink-0">
          <Plus className="h-4 w-4 mr-2" /> Hinzufügen
        </Button>
      }
    >
      <div className="relative w-full max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Positive Momente suchen..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>
      <div className="rounded-lg border bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Datum und Uhrzeit</TableHead>
              <TableHead>Beschreibung des Moments</TableHead>
              <TableHead>Deine Stimmung</TableHead>
              <TableHead>Zugehörige Aktivitäten</TableHead>
              <TableHead>Wofür bist du dankbar?</TableHead>
              <TableHead className="w-24">Aktionen</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map(record => (
              <TableRow key={record.record_id} className="hover:bg-muted/50 transition-colors">
                <TableCell className="text-muted-foreground">{formatDate(record.fields.moment_zeitpunkt)}</TableCell>
                <TableCell className="max-w-xs"><span className="truncate block">{record.fields.moment_beschreibung ?? '—'}</span></TableCell>
                <TableCell>{getStimmungskategorienDisplayName(record.fields.moment_stimmung)}</TableCell>
                <TableCell>{getAktivitaetenDisplayName(record.fields.moment_aktivitaeten)}</TableCell>
                <TableCell className="max-w-xs"><span className="truncate block">{record.fields.moment_dankbarkeit ?? '—'}</span></TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => setEditingRecord(record)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => setDeleteTarget(record)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-16 text-muted-foreground">
                  {search ? 'Keine Ergebnisse gefunden.' : 'Noch keine Positive Momente. Jetzt hinzufügen!'}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <PositiveMomenteDialog
        open={dialogOpen || !!editingRecord}
        onClose={() => { setDialogOpen(false); setEditingRecord(null); }}
        onSubmit={editingRecord ? handleUpdate : handleCreate}
        defaultValues={editingRecord?.fields}
        stimmungskategorienList={stimmungskategorienList}
        aktivitaetenList={aktivitaetenList}
        enablePhotoScan={AI_PHOTO_SCAN['PositiveMomente']}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Positive Momente löschen"
        description="Soll dieser Eintrag wirklich gelöscht werden? Diese Aktion kann nicht rückgängig gemacht werden."
      />
    </PageShell>
  );
}