import { useEffect, useRef, useState } from 'react';
import type { RecordingSession } from '../../application/ports/audio-capture';
import { formatClock, formatDate } from '../../application/format';
import type { Meeting } from '../../domain/meeting';
import { errorMessage } from '../errors';
import { useServices } from '../services';
import { Spinner } from './spinner';

type Phase =
  | { name: 'idle' }
  | { name: 'starting' }
  | { name: 'recording'; hasMicrophone: boolean }
  | { name: 'stopping' }
  | { name: 'recorded'; audio: Blob; url: string; durationSeconds: number }
  | { name: 'uploading'; audio: Blob; url: string; durationSeconds: number };

interface RecorderProps {
  enabled: boolean;
  onUploaded: (meeting: Meeting) => void;
  onRecordingChange: (recording: boolean) => void;
}

export function Recorder({ enabled, onUploaded, onRecordingChange }: RecorderProps) {
  const { startRecording, uploadMeeting } = useServices();
  const [phase, setPhase] = useState<Phase>({ name: 'idle' });
  const [includeMicrophone, setIncludeMicrophone] = useState(true);
  const [title, setTitle] = useState('');
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [error, setError] = useState<string | null>(null);
  // La sesión y la hora de inicio se guardan en refs porque las usa el aviso de
  // "dejar de compartir", que llega fuera del ciclo de render de React
  const sessionRef = useRef<RecordingSession | null>(null);
  const startedAtRef = useRef(0);

  const busy = phase.name === 'starting' || phase.name === 'recording' || phase.name === 'stopping';
  useEffect(() => onRecordingChange(busy), [busy, onRecordingChange]);

  useEffect(() => {
    if (phase.name !== 'recording') return;
    const timer = window.setInterval(
      () => setElapsedSeconds(Math.floor((Date.now() - startedAtRef.current) / 1000)),
      1000,
    );
    // Aviso del navegador si se intenta cerrar o recargar la página mientras se graba
    const warnBeforeUnload = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener('beforeunload', warnBeforeUnload);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener('beforeunload', warnBeforeUnload);
    };
  }, [phase.name]);

  const audioUrl = phase.name === 'recorded' || phase.name === 'uploading' ? phase.url : null;
  useEffect(() => () => {
    if (audioUrl) URL.revokeObjectURL(audioUrl);
  }, [audioUrl]);

  // Si el componente desaparece a mitad de grabación, se libera la captura
  useEffect(() => () => void sessionRef.current?.stop(), []);

  async function start() {
    setError(null);
    setPhase({ name: 'starting' });
    try {
      const session = await startRecording.execute(includeMicrophone);
      sessionRef.current = session;
      startedAtRef.current = Date.now();
      session.onInterrupted(() => void stop());
      setElapsedSeconds(0);
      setPhase({ name: 'recording', hasMicrophone: session.hasMicrophone });
    } catch (startError) {
      setPhase({ name: 'idle' });
      setError(errorMessage(startError));
    }
  }

  async function stop() {
    const session = sessionRef.current;
    if (!session) return;
    sessionRef.current = null;
    setPhase({ name: 'stopping' });
    const audio = await session.stop();
    setTitle(`Reunión del ${formatDate(new Date(startedAtRef.current))}`);
    setPhase({
      name: 'recorded',
      audio,
      url: URL.createObjectURL(audio),
      durationSeconds: Math.round((Date.now() - startedAtRef.current) / 1000),
    });
  }

  async function upload() {
    if (phase.name !== 'recorded') return;
    setError(null);
    setPhase({ ...phase, name: 'uploading' });
    try {
      onUploaded(await uploadMeeting.execute(title, phase.audio, 'grabacion.webm'));
    } catch (uploadError) {
      setPhase({ ...phase, name: 'recorded' });
      setError(errorMessage(uploadError));
    }
  }

  function discard() {
    if (window.confirm('¿Descartar la grabación? No se podrá recuperar.')) setPhase({ name: 'idle' });
  }

  return (
    <div className="mt-4 space-y-4">
      {(phase.name === 'idle' || phase.name === 'starting') && (
        <>
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={includeMicrophone}
              onChange={(event) => setIncludeMicrophone(event.target.checked)}
              className="size-4 accent-indigo-600"
            />
            Grabar también mi micrófono
          </label>
          <div className="flex items-center gap-3">
            <button
              type="button"
              disabled={!enabled || phase.name === 'starting'}
              onClick={() => void start()}
              className="inline-flex items-center gap-2 rounded-lg bg-rose-600 px-4 py-2 text-sm font-medium text-white hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {phase.name === 'starting' ? <Spinner /> : <span className="size-2.5 rounded-full bg-white" />}
              Empezar a grabar
            </button>
            {!enabled && <span className="text-sm text-slate-500">Marca antes la casilla de consentimiento.</span>}
          </div>
        </>
      )}

      {(phase.name === 'recording' || phase.name === 'stopping') && (
        <div className="flex flex-wrap items-center gap-4 rounded-lg bg-rose-50 p-4">
          <span className="flex items-center gap-2 font-medium text-rose-700">
            <span className="size-3 animate-pulse rounded-full bg-rose-600" />
            Grabando
          </span>
          <span className="font-mono text-lg text-slate-800 tabular-nums">{formatClock(elapsedSeconds)}</span>
          <button
            type="button"
            disabled={phase.name === 'stopping'}
            onClick={() => void stop()}
            className="ml-auto inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50"
          >
            {phase.name === 'stopping' && <Spinner />}
            Detener
          </button>
          {phase.name === 'recording' && includeMicrophone && !phase.hasMicrophone && (
            <p className="w-full text-sm text-amber-800">
              No se ha podido usar el micrófono: solo se graba el audio compartido.
            </p>
          )}
        </div>
      )}

      {(phase.name === 'recorded' || phase.name === 'uploading') && (
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            Grabación de {formatClock(phase.durationSeconds)}. Escúchala si quieres comprobar que se oye bien.
          </p>
          <audio controls src={phase.url} className="w-full" />
          <label className="block text-sm font-medium text-slate-700">
            Título
            <input
              type="text"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
            />
          </label>
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              disabled={phase.name === 'uploading'}
              onClick={() => void upload()}
              className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              {phase.name === 'uploading' && <Spinner />}
              Procesar reunión
            </button>
            <a
              href={phase.url}
              download="grabacion.webm"
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Descargar audio
            </a>
            <button
              type="button"
              disabled={phase.name === 'uploading'}
              onClick={discard}
              className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 disabled:opacity-50"
            >
              Descartar
            </button>
          </div>
        </div>
      )}

      {error && <p className="rounded-lg bg-rose-50 p-3 text-sm text-rose-800">{error}</p>}
    </div>
  );
}
