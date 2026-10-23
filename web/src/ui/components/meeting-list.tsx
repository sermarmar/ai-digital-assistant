import { useEffect, useState } from 'react';
import { formatDate, formatDuration } from '../../application/format';
import { isProcessing, type Meeting } from '../../domain/meeting';
import { errorMessage } from '../errors';
import { goTo } from '../routing';
import { useServices } from '../services';
import { StatusBadge } from './status-badge';

const POLL_MS = 4000;

interface MeetingListProps {
  selectedId: string | null;
  /** Cambia cada vez que se crea, se procesa o se borra una reunión, para recargar la lista. */
  refreshKey: number;
  disabled: boolean;
}

export function MeetingList({ selectedId, refreshKey, disabled }: MeetingListProps) {
  const { listMeetings } = useServices();
  const [meetings, setMeetings] = useState<Meeting[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    let timer: number | undefined;

    async function load() {
      try {
        const result = await listMeetings.execute();
        if (cancelled) return;
        setMeetings(result);
        setError(null);
        // Mientras alguna se esté procesando, se vuelve a consultar para ver su estado
        if (result.some((meeting) => isProcessing(meeting.status))) timer = window.setTimeout(load, POLL_MS);
      } catch (loadError) {
        if (!cancelled) setError(errorMessage(loadError));
      }
    }

    void load();
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [listMeetings, refreshKey]);

  if (error) return <p className="px-4 text-sm text-rose-700">{error}</p>;
  if (!meetings) return <p className="px-4 text-sm text-slate-500">Cargando…</p>;
  if (meetings.length === 0) return <p className="px-4 text-sm text-slate-500">Todavía no hay reuniones.</p>;

  return (
    <ul className="space-y-1 px-2">
      {meetings.map((meeting) => (
        <li key={meeting.id}>
          <button
            type="button"
            disabled={disabled}
            title={disabled ? 'Termina la grabación antes de cambiar de pantalla' : undefined}
            onClick={() => goTo({ page: 'meeting', meetingId: meeting.id })}
            className={`w-full rounded-lg px-3 py-2 text-left transition disabled:cursor-not-allowed disabled:opacity-50 ${
              meeting.id === selectedId ? 'bg-indigo-50 ring-1 ring-indigo-200' : 'hover:bg-slate-100'
            }`}
          >
            <div className="flex items-start justify-between gap-2">
              <span className="line-clamp-2 text-sm font-medium text-slate-800">{meeting.title}</span>
              <StatusBadge status={meeting.status} />
            </div>
            <div className="mt-1 text-xs text-slate-500">
              {formatDate(meeting.createdAt)}
              {meeting.durationSeconds !== null && ` · ${formatDuration(meeting.durationSeconds)}`}
            </div>
          </button>
        </li>
      ))}
    </ul>
  );
}
