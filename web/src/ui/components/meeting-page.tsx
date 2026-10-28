import { useCallback, useEffect, useState } from 'react';
import { formatDate, formatDuration } from '../../application/format';
import type { ExportFormat } from '../../application/use-cases/export-meeting';
import { canResume, isProcessing, type MeetingDetail } from '../../domain/meeting';
import { errorMessage } from '../errors';
import { goTo } from '../routing';
import { useServices } from '../services';
import { DiagramSection } from './diagram-section';
import { Spinner } from './spinner';
import { StatusBadge } from './status-badge';
import { SummarySection } from './summary-section';
import { TranscriptSection } from './transcript-section';

const POLL_MS = 3000;

interface MeetingPageProps {
  meetingId: string;
  onMeetingsChanged: () => void;
}

export function MeetingPage({ meetingId, onMeetingsChanged }: MeetingPageProps) {
  const { getMeeting, deleteMeeting, resumeMeeting, exportMeeting } = useServices();
  const [meeting, setMeeting] = useState<MeetingDetail | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [resuming, setResuming] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const reload = useCallback(() => setReloadKey((key) => key + 1), []);

  // Carga la reunión y, mientras se está procesando, la vuelve a pedir cada pocos segundos
  useEffect(() => {
    let cancelled = false;
    let timer: number | undefined;
    let previousStatus: string | undefined;

    async function load() {
      try {
        const detail = await getMeeting.execute(meetingId);
        if (cancelled) return;
        setMeeting(detail);
        setLoadError(null);
        if (previousStatus && previousStatus !== detail.status) onMeetingsChanged();
        previousStatus = detail.status;
        if (isProcessing(detail.status)) timer = window.setTimeout(load, POLL_MS);
      } catch (error) {
        if (!cancelled) setLoadError(errorMessage(error));
      }
    }

    void load();
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [getMeeting, meetingId, onMeetingsChanged, reloadKey]);

  async function handleDelete() {
    if (!meeting) return;
    const confirmed = window.confirm(
      `¿Eliminar «${meeting.title}»? Se borrarán la transcripción, el resumen y el diagrama. No se puede deshacer.`,
    );
    if (!confirmed) return;
    try {
      await deleteMeeting.execute(meeting.id);
      onMeetingsChanged();
      goTo({ page: 'new' });
    } catch (error) {
      setActionError(errorMessage(error));
    }
  }

  // La reunión pasa a "resumiendo": al recargarla se ven los pasos y se sigue consultando hasta que acabe
  async function handleResume() {
    if (!meeting) return;
    setActionError(null);
    setResuming(true);
    try {
      await resumeMeeting.execute(meeting.id);
      onMeetingsChanged();
      reload();
    } catch (error) {
      setActionError(errorMessage(error));
    } finally {
      setResuming(false);
    }
  }

  async function handleExport(format: ExportFormat) {
    if (!meeting) return;
    setActionError(null);
    try {
      await exportMeeting.execute(meeting, format);
    } catch (error) {
      setActionError(errorMessage(error));
    }
  }

  if (loadError) {
    return <div className="mx-auto max-w-4xl p-8 text-rose-700">{loadError}</div>;
  }
  if (!meeting) {
    return (
      <div className="flex items-center gap-2 p-8 text-slate-500">
        <Spinner /> Cargando reunión…
      </div>
    );
  }

  const ready = meeting.status === 'listo';

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-8">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-semibold text-slate-900">{meeting.title}</h2>
            <StatusBadge status={meeting.status} />
          </div>
          <p className="mt-1 text-sm text-slate-500">
            {formatDate(meeting.createdAt)}
            {meeting.durationSeconds !== null && ` · ${formatDuration(meeting.durationSeconds)}`}
            {meeting.summary && ` · resumido con ${meeting.summary.model}`}
          </p>
        </div>
        <button
          type="button"
          onClick={() => void handleDelete()}
          className="rounded-lg border border-rose-200 px-3 py-1.5 text-sm font-medium text-rose-700 hover:bg-rose-50"
        >
          Eliminar reunión
        </button>
      </header>

      {isProcessing(meeting.status) && <ProcessingSteps status={meeting.status} />}

      {(meeting.errorMessage || canResume(meeting)) && (
        <ProblemNotice meeting={meeting} resuming={resuming} onResume={() => void handleResume()} />
      )}

      {ready && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-slate-500">Descargar:</span>
          <ExportButton label="Markdown" onClick={() => void handleExport('markdown')} />
          <ExportButton label="JSON" onClick={() => void handleExport('json')} />
          <ExportButton label="SVG" disabled={!meeting.diagram} onClick={() => void handleExport('svg')} />
          <ExportButton label="PNG" disabled={!meeting.diagram} onClick={() => void handleExport('png')} />
        </div>
      )}
      {actionError && <p className="rounded-lg bg-rose-50 p-3 text-sm text-rose-800">{actionError}</p>}

      {meeting.summary && <SummarySection summary={meeting.summary} />}
      {ready && meeting.diagram && (
        <DiagramSection meetingId={meeting.id} diagram={meeting.diagram} onDiagramChanged={reload} />
      )}
      {meeting.transcript && <TranscriptSection transcript={meeting.transcript} />}
    </div>
  );
}

function ProcessingSteps({ status }: { status: 'transcribiendo' | 'resumiendo' }) {
  const steps = [
    { key: 'transcribiendo', label: 'Transcribiendo el audio con Whisper' },
    { key: 'resumiendo', label: 'Resumiendo y creando el esquema con Claude' },
  ];
  const currentIndex = steps.findIndex((step) => step.key === status);

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5">
      <ol className="space-y-3">
        {steps.map((step, index) => (
          <li key={step.key} className="flex items-center gap-3 text-sm">
            {index < currentIndex && <span className="text-emerald-600">✓</span>}
            {index === currentIndex && <Spinner className="size-4 text-indigo-600" />}
            {index > currentIndex && <span className="size-4 rounded-full border-2 border-slate-200" />}
            <span className={index === currentIndex ? 'font-medium text-slate-900' : 'text-slate-500'}>
              {step.label}
            </span>
          </li>
        ))}
      </ol>
      <p className="mt-4 text-xs text-slate-500">
        Puede tardar varios minutos en reuniones largas. Puedes cerrar esta página: el procesado sigue en el servidor.
      </p>
    </div>
  );
}

// El error (o el aviso, si la reunión quedó lista sin diagrama) y qué se puede hacer a partir de ahí
function ProblemNotice({
  meeting,
  resuming,
  onResume,
}: {
  meeting: MeetingDetail;
  resuming: boolean;
  onResume: () => void;
}) {
  const failed = meeting.status === 'error';
  const resumable = canResume(meeting);

  return (
    <div
      className={`rounded-lg border p-4 text-sm ${
        failed ? 'border-rose-200 bg-rose-50 text-rose-900' : 'border-amber-200 bg-amber-50 text-amber-900'
      }`}
    >
      {meeting.errorMessage && <p>{meeting.errorMessage}</p>}

      {resumable && (
        <div
          className={`mt-3 flex flex-wrap items-center justify-between gap-3 border-t pt-3 ${
            failed ? 'border-rose-200' : 'border-amber-200'
          }`}
        >
          <p className="max-w-xl">
            {meeting.summary
              ? 'El resumen está guardado. Al continuar, Claude vuelve a intentar el esquema.'
              : 'La transcripción está guardada. Al continuar, Claude hace el resumen y el esquema sin volver a transcribir el audio.'}
          </p>
          <button
            type="button"
            disabled={resuming}
            onClick={onResume}
            className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            {resuming && <Spinner />}
            Continuar
          </button>
        </div>
      )}

      {failed && !meeting.transcript && (
        <p className="mt-2">
          Falló antes de tener la transcripción y el audio no se guarda, así que para intentarlo otra vez hay que
          volver a subirlo.
        </p>
      )}
    </div>
  );
}

function ExportButton({ label, onClick, disabled }: { label: string; onClick: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
    >
      {label}
    </button>
  );
}
