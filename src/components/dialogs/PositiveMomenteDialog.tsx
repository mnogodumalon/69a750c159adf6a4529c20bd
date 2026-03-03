import { useState, useEffect, useRef, useCallback } from 'react';
import type { PositiveMomente, Stimmungskategorien, Aktivitaeten } from '@/types/app';
import { APP_IDS } from '@/types/app';
import { extractRecordId, createRecordUrl } from '@/services/livingAppsService';
import {
  Dialog, DialogContent, DialogHeader,
  DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Camera, CheckCircle2, FileText, ImagePlus, Loader2, Sparkles, Upload, X } from 'lucide-react';
import { fileToDataUri, extractFromPhoto } from '@/lib/ai';

interface PositiveMomenteDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (fields: PositiveMomente['fields']) => Promise<void>;
  defaultValues?: PositiveMomente['fields'];
  stimmungskategorienList: Stimmungskategorien[];
  aktivitaetenList: Aktivitaeten[];
  enablePhotoScan?: boolean;
}

export function PositiveMomenteDialog({ open, onClose, onSubmit, defaultValues, stimmungskategorienList, aktivitaetenList, enablePhotoScan = false }: PositiveMomenteDialogProps) {
  const [fields, setFields] = useState<Partial<PositiveMomente['fields']>>({});
  const [saving, setSaving] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [scanSuccess, setScanSuccess] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setFields(defaultValues ?? {});
      setPreview(null);
      setScanSuccess(false);
    }
  }, [open, defaultValues]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await onSubmit(fields as PositiveMomente['fields']);
      onClose();
    } finally {
      setSaving(false);
    }
  }

  async function handlePhotoScan(file: File) {
    setScanning(true);
    setScanSuccess(false);
    try {
      const uri = await fileToDataUri(file);
      if (file.type.startsWith('image/')) setPreview(uri);
      const schema = `{\n  "moment_zeitpunkt": string | null, // YYYY-MM-DDTHH:MM // Datum und Uhrzeit\n  "moment_beschreibung": string | null, // Beschreibung des Moments\n  "moment_stimmung": string | null, // Name des Stimmungskategorien-Eintrags (z.B. "Jonas Schmidt")\n  "moment_aktivitaeten": string | null, // Name des Aktivitäten-Eintrags (z.B. "Jonas Schmidt")\n  "moment_dankbarkeit": string | null, // Wofür bist du dankbar?\n}`;
      const raw = await extractFromPhoto<Record<string, unknown>>(uri, schema);
      setFields(prev => {
        const merged = { ...prev } as Record<string, unknown>;
        function matchName(name: string, candidates: string[]): boolean {
          const n = name.toLowerCase().trim();
          return candidates.some(c => c.toLowerCase().includes(n) || n.includes(c.toLowerCase()));
        }
        const applookupKeys = new Set<string>(["moment_stimmung", "moment_aktivitaeten"]);
        for (const [k, v] of Object.entries(raw)) {
          if (applookupKeys.has(k)) continue;
          if (v != null) merged[k] = v;
        }
        const moment_stimmungName = raw['moment_stimmung'] as string | null;
        if (moment_stimmungName) {
          const moment_stimmungMatch = stimmungskategorienList.find(r => matchName(moment_stimmungName!, [String(r.fields.kategorie_name ?? '')]));
          if (moment_stimmungMatch) merged['moment_stimmung'] = createRecordUrl(APP_IDS.STIMMUNGSKATEGORIEN, moment_stimmungMatch.record_id);
        }
        const moment_aktivitaetenName = raw['moment_aktivitaeten'] as string | null;
        if (moment_aktivitaetenName) {
          const moment_aktivitaetenMatch = aktivitaetenList.find(r => matchName(moment_aktivitaetenName!, [String(r.fields.aktivitaet_name ?? '')]));
          if (moment_aktivitaetenMatch) merged['moment_aktivitaeten'] = createRecordUrl(APP_IDS.AKTIVITAETEN, moment_aktivitaetenMatch.record_id);
        }
        return merged as Partial<PositiveMomente['fields']>;
      });
      setScanSuccess(true);
      setTimeout(() => setScanSuccess(false), 3000);
    } catch (err) {
      console.error('Scan fehlgeschlagen:', err);
    } finally {
      setScanning(false);
    }
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (f) handlePhotoScan(f);
    e.target.value = '';
  }

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file && (file.type.startsWith('image/') || file.type === 'application/pdf')) {
      handlePhotoScan(file);
    }
  }, []);

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{defaultValues ? 'Positive Momente bearbeiten' : 'Positive Momente hinzufügen'}</DialogTitle>
        </DialogHeader>

        {enablePhotoScan && (
          <div className="space-y-2">
            <div className="flex items-center gap-1.5 text-sm font-medium">
              <Sparkles className="h-4 w-4 text-primary" />
              KI-Erkennung
              <span className="text-muted-foreground font-normal">(füllt Felder automatisch aus)</span>
            </div>

            <input ref={fileInputRef} type="file" accept="image/*,application/pdf" className="hidden" onChange={handleFileSelect} />
            <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFileSelect} />

            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => !scanning && fileInputRef.current?.click()}
              className={`
                relative rounded-xl border-2 border-dashed transition-all duration-200 cursor-pointer
                ${scanning
                  ? 'border-primary/40 bg-primary/5'
                  : scanSuccess
                    ? 'border-green-500/40 bg-green-50/50 dark:bg-green-950/20'
                    : dragOver
                      ? 'border-primary bg-primary/10 scale-[1.01]'
                      : 'border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/50'
                }
              `}
            >
              {scanning ? (
                <div className="flex flex-col items-center justify-center py-8 gap-3">
                  <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center">
                    <Loader2 className="h-7 w-7 text-primary animate-spin" />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-medium">KI analysiert...</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Felder werden automatisch ausgefüllt</p>
                  </div>
                </div>
              ) : scanSuccess ? (
                <div className="flex flex-col items-center justify-center py-8 gap-3">
                  <div className="h-14 w-14 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                    <CheckCircle2 className="h-7 w-7 text-green-600 dark:text-green-400" />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-medium text-green-700 dark:text-green-400">Felder ausgefüllt!</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Prüfe die Werte und passe sie ggf. an</p>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-8 gap-3">
                  <div className="h-14 w-14 rounded-full bg-primary/8 flex items-center justify-center">
                    <ImagePlus className="h-7 w-7 text-primary/70" />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-medium">Foto oder Dokument hochladen</p>
                  </div>
                </div>
              )}

              {preview && !scanning && (
                <div className="absolute top-2 right-2">
                  <div className="relative group">
                    <img src={preview} alt="" className="h-10 w-10 rounded-md object-cover border shadow-sm" />
                    <button
                      type="button"
                      onClick={e => { e.stopPropagation(); setPreview(null); }}
                      className="absolute -top-1.5 -right-1.5 h-4 w-4 rounded-full bg-muted-foreground/80 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="h-2.5 w-2.5" />
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-2">
              <Button type="button" variant="outline" size="sm" className="flex-1 h-9 text-xs" disabled={scanning}
                onClick={e => { e.stopPropagation(); cameraInputRef.current?.click(); }}>
                <Camera className="h-3.5 w-3.5 mr-1.5" />Kamera
              </Button>
              <Button type="button" variant="outline" size="sm" className="flex-1 h-9 text-xs" disabled={scanning}
                onClick={e => { e.stopPropagation(); fileInputRef.current?.click(); }}>
                <Upload className="h-3.5 w-3.5 mr-1.5" />Foto wählen
              </Button>
              <Button type="button" variant="outline" size="sm" className="flex-1 h-9 text-xs" disabled={scanning}
                onClick={e => {
                  e.stopPropagation();
                  if (fileInputRef.current) {
                    fileInputRef.current.accept = 'application/pdf,.pdf';
                    fileInputRef.current.click();
                    setTimeout(() => { if (fileInputRef.current) fileInputRef.current.accept = 'image/*,application/pdf'; }, 100);
                  }
                }}>
                <FileText className="h-3.5 w-3.5 mr-1.5" />Dokument
              </Button>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="moment_zeitpunkt">Datum und Uhrzeit</Label>
            <Input
              id="moment_zeitpunkt"
              type="datetime-local"
              step="60"
              value={fields.moment_zeitpunkt ?? ''}
              onChange={e => setFields(f => ({ ...f, moment_zeitpunkt: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="moment_beschreibung">Beschreibung des Moments</Label>
            <Textarea
              id="moment_beschreibung"
              value={fields.moment_beschreibung ?? ''}
              onChange={e => setFields(f => ({ ...f, moment_beschreibung: e.target.value }))}
              rows={3}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="moment_stimmung">Deine Stimmung</Label>
            <Select
              value={extractRecordId(fields.moment_stimmung) ?? 'none'}
              onValueChange={v => setFields(f => ({ ...f, moment_stimmung: v === 'none' ? undefined : createRecordUrl(APP_IDS.STIMMUNGSKATEGORIEN, v) }))}
            >
              <SelectTrigger id="moment_stimmung"><SelectValue placeholder="Auswählen..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">—</SelectItem>
                {stimmungskategorienList.map(r => (
                  <SelectItem key={r.record_id} value={r.record_id}>
                    {r.fields.kategorie_name ?? r.record_id}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="moment_aktivitaeten">Zugehörige Aktivitäten</Label>
            <Select
              value={extractRecordId(fields.moment_aktivitaeten) ?? 'none'}
              onValueChange={v => setFields(f => ({ ...f, moment_aktivitaeten: v === 'none' ? undefined : createRecordUrl(APP_IDS.AKTIVITAETEN, v) }))}
            >
              <SelectTrigger id="moment_aktivitaeten"><SelectValue placeholder="Auswählen..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">—</SelectItem>
                {aktivitaetenList.map(r => (
                  <SelectItem key={r.record_id} value={r.record_id}>
                    {r.fields.aktivitaet_name ?? r.record_id}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="moment_dankbarkeit">Wofür bist du dankbar?</Label>
            <Textarea
              id="moment_dankbarkeit"
              value={fields.moment_dankbarkeit ?? ''}
              onChange={e => setFields(f => ({ ...f, moment_dankbarkeit: e.target.value }))}
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Abbrechen</Button>
            <Button type="submit" disabled={saving}>
              {saving ? 'Speichern...' : defaultValues ? 'Speichern' : 'Erstellen'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}